// ============================================
// JURY SELECTION SERVICE
// src/jury/jury-selection.service.ts
// ============================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ProcedureType } from '../common/entities/procedure.entity';
import { User, AcademicRank } from '../common/entities/user.entity';
import { UnavailabilityService } from 'src/unavailability/unavailability.service';

interface JuryRequirements {
  totalMembers: number;
  externalMembers: number;
  professors: number;
}

interface SelectedJury {
  internal: User[];
  external: User[];
  reserves: { internal: User; external: User };
}

@Injectable()
export class JurySelectionService {
  private readonly HOME_UNIVERSITY = 'Великотърновски университет';

  constructor(
    private usersService: UsersService,
    private unavailabilityService: UnavailabilityService,
  ) {}

  private getJuryRequirements(type: ProcedureType): JuryRequirements {
    switch (type) {
      case ProcedureType.DOCTOR:
        return { totalMembers: 5, externalMembers: 3, professors: 1 };
      case ProcedureType.DOCTOR_OF_SCIENCES:
        return { totalMembers: 7, externalMembers: 4, professors: 3 };
      case ProcedureType.ASSOCIATE_PROFESSOR:
        return { totalMembers: 7, externalMembers: 3, professors: 3 };
      case ProcedureType.PROFESSOR:
        return { totalMembers: 7, externalMembers: 3, professors: 4 };
      default:
        throw new BadRequestException('Invalid procedure type');
    }
  }

  async selectJury(
    procedureType: ProcedureType,
    scientificField: string,
    procedureDate: Date,
    sameDayProcedures: string[] = [],
  ): Promise<SelectedJury> {
    const requirements = this.getJuryRequirements(procedureType);

    // Get all eligible candidates
    let candidates =
      await this.usersService.findByScientificField(scientificField);

    // Filter out unavailable users
    candidates = await this.filterAvailableCandidates(
      candidates,
      procedureDate,
    );

    // Filter by consecutive jury participation
    candidates = await this.filterConsecutiveParticipation(
      candidates,
      sameDayProcedures,
    );

    // Separate internal and external candidates
    const internalCandidates = candidates.filter(
      (u) => u.university === this.HOME_UNIVERSITY,
    );
    const externalCandidates = candidates
      .filter((u) => u.university !== this.HOME_UNIVERSITY)
      .sort((a, b) => a.distanceToCity - b.distanceToCity);

    // Separate professors and associate professors
    const internalProfessors = internalCandidates.filter(
      (u) => u.academicRank === AcademicRank.PROFESSOR,
    );
    const externalProfessors = externalCandidates.filter(
      (u) => u.academicRank === AcademicRank.PROFESSOR,
    );
    const internalAssociate = internalCandidates.filter(
      (u) => u.academicRank === AcademicRank.ASSOCIATE_PROFESSOR,
    );
    const externalAssociate = externalCandidates.filter(
      (u) => u.academicRank === AcademicRank.ASSOCIATE_PROFESSOR,
    );

    // Calculate internal and external members needed
    const internalNeeded =
      requirements.totalMembers - requirements.externalMembers;
    const externalNeeded = requirements.externalMembers;

    // Select jury members
    const selectedInternal: User[] = [];
    const selectedExternal: User[] = [];

    // First, ensure professor requirements
    const professorsNeeded = requirements.professors;
    let internalProfsSelected = 0;
    let externalProfsSelected = 0;

    // Try to distribute professors between internal and external
    // Priority: external professors (closer distance)
    for (const prof of externalProfessors) {
      if (
        selectedExternal.length < externalNeeded &&
        externalProfsSelected < professorsNeeded
      ) {
        selectedExternal.push(prof);
        externalProfsSelected++;
      }
    }

    // Fill remaining professors from internal
    const remainingProfs = professorsNeeded - externalProfsSelected;
    for (const prof of internalProfessors) {
      if (
        selectedInternal.length < internalNeeded &&
        internalProfsSelected < remainingProfs
      ) {
        selectedInternal.push(prof);
        internalProfsSelected++;
      }
    }

    // If still need professors, add more externals
    if (externalProfsSelected + internalProfsSelected < professorsNeeded) {
      for (const prof of externalProfessors) {
        if (
          !selectedExternal.includes(prof) &&
          selectedExternal.length < externalNeeded
        ) {
          selectedExternal.push(prof);
          externalProfsSelected++;
          if (
            externalProfsSelected + internalProfsSelected >=
            professorsNeeded
          ) {
            break;
          }
        }
      }
    }

    // Fill remaining external positions with associate professors
    for (const assoc of externalAssociate) {
      if (selectedExternal.length < externalNeeded) {
        selectedExternal.push(assoc);
      }
    }

    // Fill remaining internal positions
    for (const assoc of internalAssociate) {
      if (selectedInternal.length < internalNeeded) {
        selectedInternal.push(assoc);
      }
    }

    // Validate selection
    if (
      selectedInternal.length + selectedExternal.length <
      requirements.totalMembers
    ) {
      throw new BadRequestException('Not enough qualified candidates for jury');
    }

    // Select reserves (1 internal, 1 external)
    const reserveInternal = internalCandidates.find(
      (u) => !selectedInternal.includes(u),
    );
    const reserveExternal = externalCandidates.find(
      (u) => !selectedExternal.includes(u),
    );

    if (!reserveInternal || !reserveExternal) {
      throw new BadRequestException('Not enough candidates for reserves');
    }

    return {
      internal: selectedInternal,
      external: selectedExternal,
      reserves: {
        internal: reserveInternal,
        external: reserveExternal,
      },
    };
  }

  private async filterAvailableCandidates(
    candidates: User[],
    procedureDate: Date,
  ): Promise<User[]> {
    const available: User[] = [];

    for (const candidate of candidates) {
      const isAvailable = await this.unavailabilityService.isUserAvailable(
        candidate.id,
        procedureDate,
      );
      if (isAvailable) {
        available.push(candidate);
      }
    }

    return available;
  }

  private async filterConsecutiveParticipation(
    candidates: User[],
    sameDayProcedures: string[],
  ): Promise<User[]> {
    // Filter users who have participated in 2 consecutive juries
    // Same day procedures count as one participation
    return candidates.filter((user) => {
      if (!user.penultimateJuryDate || !user.lastJuryDate) {
        return true;
      }

      // Check if dates are consecutive (different days)
      const penultimate = new Date(user.penultimateJuryDate);
      const last = new Date(user.lastJuryDate);

      if (
        penultimate.toDateString() === last.toDateString() ||
        sameDayProcedures.length > 0
      ) {
        return true; // Same day counts as one participation
      }

      // If both dates exist and are different days, user has 2 consecutive
      return false;
    });
  }
}
