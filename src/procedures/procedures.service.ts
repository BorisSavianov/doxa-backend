// ============================================
// PROCEDURES SERVICE
// src/procedures/procedures.service.ts
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  Procedure,
  ProcedureStatus,
  JuryMember,
} from '../common/entities/procedure.entity';
import { JurySelectionService } from '../jury/jury-selection.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProceduresService {
  private readonly collection = 'procedures';

  constructor(
    private firebaseService: FirebaseService,
    private jurySelectionService: JurySelectionService,
    private usersService: UsersService,
  ) {}

  async findAll(): Promise<Procedure[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Procedure,
    );
  }

  async findById(id: string): Promise<Procedure> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException('Procedure not found');
    }

    return { id: doc.id, ...doc.data() } as Procedure;
  }

  async findByUserId(userId: string): Promise<Procedure[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('juryMembers', 'array-contains', { userId })
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Procedure,
    );
  }

  async create(
    procedureData: Partial<Procedure>,
    createdBy: string,
  ): Promise<Procedure> {
    const db = this.firebaseService.getFirestore();

    const procedure: Partial<Procedure> = {
      ...procedureData,
      status: ProcedureStatus.DRAFT,
      juryMembers: [],
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(this.collection).add(procedure);

    return { id: docRef.id, ...procedure } as Procedure;
  }

  async autoSelectJury(procedureId: string): Promise<Procedure> {
    const procedure = await this.findById(procedureId);

    if (procedure.status !== ProcedureStatus.DRAFT) {
      throw new BadRequestException(
        'Jury can only be selected for draft procedures',
      );
    }

    // Find procedures on the same day
    const sameDayProcedures = await this.findProceduresByDate(procedure.date);
    const sameDayIds = sameDayProcedures
      .filter((p) => p.id !== procedureId)
      .map((p) => p.id);

    const selectedJury = await this.jurySelectionService.selectJury(
      procedure.type,
      procedure.scientificField,
      procedure.date,
      sameDayIds,
    );

    const juryMembers: JuryMember[] = [
      ...selectedJury.internal.map((u) => ({
        userId: u.id,
        isExternal: false,
        isReserve: false,
        status: 'pending' as const,
        invitedAt: new Date(),
      })),
      ...selectedJury.external.map((u) => ({
        userId: u.id,
        isExternal: true,
        isReserve: false,
        status: 'pending' as const,
        invitedAt: new Date(),
      })),
      {
        userId: selectedJury.reserves.internal.id,
        isExternal: false,
        isReserve: true,
        status: 'pending' as const,
        invitedAt: new Date(),
      },
      {
        userId: selectedJury.reserves.external.id,
        isExternal: true,
        isReserve: true,
        status: 'pending' as const,
        invitedAt: new Date(),
      },
    ];

    return this.update(procedureId, {
      juryMembers,
      status: ProcedureStatus.AWAITING_CONFIRMATIONS,
    });
  }

  async respondToInvitation(
    procedureId: string,
    userId: string,
    accept: boolean,
  ): Promise<Procedure> {
    const procedure = await this.findById(procedureId);

    const memberIndex = procedure.juryMembers.findIndex(
      (m) => m.userId === userId,
    );

    if (memberIndex === -1) {
      throw new BadRequestException('User not found in jury');
    }

    procedure.juryMembers[memberIndex].status = accept
      ? 'accepted'
      : 'rejected';
    procedure.juryMembers[memberIndex].respondedAt = new Date();

    // If rejected, find a replacement
    if (!accept && !procedure.juryMembers[memberIndex].isReserve) {
      const rejectedMember = procedure.juryMembers[memberIndex];
      const reserve = procedure.juryMembers.find(
        (m) => m.isReserve && m.isExternal === rejectedMember.isExternal,
      );

      if (reserve) {
        reserve.isReserve = false;
      }
    }

    // Check if all non-reserve members have responded
    const allResponded = procedure.juryMembers
      .filter((m) => !m.isReserve)
      .every((m) => m.status !== 'pending');

    const allAccepted = procedure.juryMembers
      .filter((m) => !m.isReserve)
      .every((m) => m.status === 'accepted');

    if (allResponded && allAccepted) {
      procedure.status = ProcedureStatus.CONFIRMED;
    }

    return this.update(procedureId, {
      juryMembers: procedure.juryMembers,
      status: procedure.status,
    });
  }

  async update(
    id: string,
    procedureData: Partial<Procedure>,
  ): Promise<Procedure> {
    const db = this.firebaseService.getFirestore();

    const updateData = {
      ...procedureData,
      updatedAt: new Date(),
    };

    await db.collection(this.collection).doc(id).update(updateData);

    return this.findById(id);
  }

  async completeProcedure(procedureId: string): Promise<Procedure> {
    const procedure = await this.findById(procedureId);

    // Update jury dates for all accepted members
    const acceptedMembers = procedure.juryMembers.filter(
      (m) => m.status === 'accepted' && !m.isReserve,
    );

    for (const member of acceptedMembers) {
      await this.usersService.updateJuryDates(member.userId, procedure.date);
    }

    return this.update(procedureId, {
      status: ProcedureStatus.COMPLETED,
    });
  }

  private async findProceduresByDate(date: Date): Promise<Procedure[]> {
    const db = this.firebaseService.getFirestore();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await db
      .collection(this.collection)
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Procedure,
    );
  }
}
