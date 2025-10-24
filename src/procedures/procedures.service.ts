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
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProceduresService {
  private readonly collection = 'procedures';

  constructor(
    private firebaseService: FirebaseService,
    private jurySelectionService: JurySelectionService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
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
    const allProcedures = await this.findAll();
    
    return allProcedures.filter(proc => 
      proc.juryMembers.some(member => member.userId === userId)
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

    if (
      procedure.status !== ProcedureStatus.DRAFT &&
      procedure.status !== ProcedureStatus.AWAITING_CONFIRMATIONS
    ) {
      throw new BadRequestException(
        'Jury can only be selected for draft or awaiting confirmation procedures',
      );
    }

    // Find procedures on the same day
    const sameDayProcedures = await this.findProceduresByDate(procedure.date);
    const sameDayIds = sameDayProcedures
      .filter((p) => p.id !== procedureId)
      .map((p) => p.id);

    // Get list of users who have already rejected
    const rejectedUserIds = procedure.juryMembers
      .filter((m) => m.status === 'rejected')
      .map((m) => m.userId);

    // Get list of users who are currently in the jury (accepted or pending)
    const currentJuryUserIds = procedure.juryMembers
      .filter((m) => m.status === 'accepted' || m.status === 'pending')
      .map((m) => m.userId);

    const selectedJury = await this.jurySelectionService.selectJury(
      procedure.type,
      procedure.scientificField,
      procedure.date,
      sameDayIds,
      [...rejectedUserIds, ...currentJuryUserIds],
    );

    // Keep existing accepted and pending members
    const existingMembers = procedure.juryMembers.filter(
      (m) => m.status === 'accepted' || m.status === 'pending',
    );

    // Only add new members if we need to fill positions
    const newMembers: JuryMember[] = [];
    const allNewCandidates = [
      ...selectedJury.internal,
      ...selectedJury.external,
    ];

    for (const candidate of allNewCandidates) {
      if (!existingMembers.some((m) => m.userId === candidate.id)) {
        newMembers.push({
          userId: candidate.id,
          isExternal: candidate.university !== 'Великотърновски университет',
          isReserve: false,
          status: 'pending' as const,
          invitedAt: new Date(),
        });
      }
    }

    // Update or add reserves
    const updatedJuryMembers: JuryMember[] = [
      ...existingMembers,
      ...newMembers,
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

    const updatedProcedure = await this.update(procedureId, {
      juryMembers: updatedJuryMembers,
      status: ProcedureStatus.AWAITING_CONFIRMATIONS,
    });

    // Send notifications only to new members
    if (newMembers.length > 0) {
      await this.notificationsService.notifyJuryInvitation(
        updatedProcedure,
        newMembers.map((m) => m.userId),
      );
    }

    return updatedProcedure;
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

    // If rejected, activate reserve and trigger auto-select for new reserves
    if (!accept && !procedure.juryMembers[memberIndex].isReserve) {
      const rejectedMember = procedure.juryMembers[memberIndex];
      const reserve = procedure.juryMembers.find(
        (m) => m.isReserve && m.isExternal === rejectedMember.isExternal,
      );

      if (reserve) {
        // Activate the reserve
        reserve.isReserve = false;
        reserve.invitedAt = new Date();
        reserve.status = 'pending';

        // Update procedure with activated reserve
        await this.update(procedureId, {
          juryMembers: procedure.juryMembers,
        });

        // Send notification to the newly activated reserve
        await this.notificationsService.notifyJuryInvitation(
          procedure,
          [reserve.userId],
        );

        // Trigger auto-select to get new reserves
        await this.autoSelectJury(procedureId);
        
        // Notify about the rejection
        await this.notificationsService.notifyJuryResponse(
          procedure,
          userId,
          false,
        );

        return this.findById(procedureId);
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

    const updatedProcedure = await this.update(procedureId, {
      juryMembers: procedure.juryMembers,
      status: procedure.status,
    });

    // Notify about the response
    await this.notificationsService.notifyJuryResponse(
      updatedProcedure,
      userId,
      accept,
    );

    return updatedProcedure;
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

    const allProcedures = await this.findAll();
    
    return allProcedures.filter(proc => {
      const procDate = new Date(proc.date);
      return procDate >= startOfDay && procDate <= endOfDay;
    });
  }
}