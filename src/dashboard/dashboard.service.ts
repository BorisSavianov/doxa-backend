// ============================================
// DASHBOARD SERVICE
// src/dashboard/dashboard.service.ts
// ============================================

import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { ProceduresService } from '../procedures/procedures.service';
import { ProcedureStatus } from '../common/entities/procedure.entity';
import {
  DashboardStatsDto,
  AdminDashboardStatsDto,
  UpcomingProceduresDto,
  RecentActivityDto,
  ActivityItem,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private firebaseService: FirebaseService,
    private usersService: UsersService,
    private proceduresService: ProceduresService,
  ) {}

  async getUserDashboardStats(userId: string): Promise<DashboardStatsDto> {
    const db = this.firebaseService.getFirestore();
    const now = new Date();

    // Get all procedures for user
    const userProcedures = await this.proceduresService.findByUserId(userId);

    // Count pending invitations
    const pendingInvitations = userProcedures.filter((proc) =>
      proc.juryMembers.some(
        (m) => m.userId === userId && m.status === 'pending' && !m.isReserve,
      ),
    ).length;

    // Count upcoming procedures (accepted and in future)
    const upcomingProcedures = userProcedures.filter((proc) => {
      const hasAccepted = proc.juryMembers.some(
        (m) => m.userId === userId && m.status === 'accepted' && !m.isReserve,
      );
      return hasAccepted && new Date(proc.date) > now;
    }).length;

    // Count completed procedures
    const completedProcedures = userProcedures.filter(
      (proc) => proc.status === ProcedureStatus.COMPLETED,
    ).length;

    // Count this year's participations
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const thisYearParticipations = userProcedures.filter((proc) => {
      const procDate = new Date(proc.date);
      const hasParticipated = proc.juryMembers.some(
        (m) => m.userId === userId && m.status === 'accepted' && !m.isReserve,
      );
      return hasParticipated && procDate >= yearStart && procDate <= now;
    }).length;

    return {
      pendingInvitations,
      upcomingProcedures,
      completedProcedures,
      thisYearParticipations,
    };
  }

  async getAdminDashboardStats(): Promise<AdminDashboardStatsDto> {
    const db = this.firebaseService.getFirestore();
    const now = new Date();

    // Get all procedures
    const allProcedures = await this.proceduresService.findAll();

    // Total users
    const allUsers = await this.usersService.findAll();
    const totalUsers = allUsers.length;

    // Total procedures
    const totalProcedures = allProcedures.length;

    // Active procedures (not completed or cancelled)
    const activeProcedures = allProcedures.filter(
      (proc) =>
        proc.status !== ProcedureStatus.COMPLETED &&
        proc.status !== ProcedureStatus.CANCELLED,
    ).length;

    // Pending confirmations
    const pendingConfirmations = allProcedures.filter(
      (proc) => proc.status === ProcedureStatus.AWAITING_CONFIRMATIONS,
    ).length;

    // Upcoming procedures (next 30 days)
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingProcedures = allProcedures.filter((proc) => {
      const procDate = new Date(proc.date);
      return procDate > now && procDate <= thirtyDaysFromNow;
    }).length;

    // Completed this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = allProcedures.filter((proc) => {
      const procDate = new Date(proc.date);
      return (
        proc.status === ProcedureStatus.COMPLETED &&
        procDate >= monthStart &&
        procDate <= now
      );
    }).length;

    return {
      totalUsers,
      totalProcedures,
      activeProcedures,
      pendingConfirmations,
      upcomingProcedures,
      completedThisMonth,
    };
  }

  async getUpcomingProcedures(
    userId: string,
    limit: number,
  ): Promise<UpcomingProceduresDto> {
    const now = new Date();
    const userProcedures = await this.proceduresService.findByUserId(userId);

    const upcoming = userProcedures
      .filter((proc) => {
        const hasAccepted = proc.juryMembers.some(
          (m) => m.userId === userId && m.status === 'accepted' && !m.isReserve,
        );
        return hasAccepted && new Date(proc.date) > now;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit);

    return { procedures: upcoming };
  }

  async getRecentActivity(
    userId: string,
    limit: number,
  ): Promise<RecentActivityDto> {
    const userProcedures = await this.proceduresService.findByUserId(userId);
    const activities: ActivityItem[] = [];

    for (const proc of userProcedures) {
      const userMembership = proc.juryMembers.find((m) => m.userId === userId);
      if (!userMembership) continue;

      // Invitation activity
      activities.push({
        type: 'invitation',
        procedureId: proc.id,
        procedureName: `${proc.type} - ${proc.candidateName}`,
        timestamp: userMembership.invitedAt,
        status: userMembership.status,
      });

      // Response activity
      if (userMembership.respondedAt) {
        activities.push({
          type: userMembership.status === 'accepted' ? 'accepted' : 'rejected',
          procedureId: proc.id,
          procedureName: `${proc.type} - ${proc.candidateName}`,
          timestamp: userMembership.respondedAt,
          status: userMembership.status,
        });
      }

      // Completion activity
      if (
        proc.status === ProcedureStatus.COMPLETED &&
        userMembership.status === 'accepted'
      ) {
        activities.push({
          type: 'completed',
          procedureId: proc.id,
          procedureName: `${proc.type} - ${proc.candidateName}`,
          timestamp: proc.updatedAt,
          status: 'completed',
        });
      }
    }

    // Sort by timestamp descending and limit
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return { activities: activities.slice(0, limit) };
  }

  async getPendingProcedures() {
    const allProcedures = await this.proceduresService.findAll();
    return allProcedures.filter(
      (proc) =>
        proc.status === ProcedureStatus.DRAFT ||
        proc.status === ProcedureStatus.PENDING_JURY,
    );
  }

  async getProceduresByStatus() {
    const allProcedures = await this.proceduresService.findAll();
    const statusCounts: Record<string, number> = {};

    for (const status of Object.values(ProcedureStatus)) {
      statusCounts[status] = allProcedures.filter(
        (proc) => proc.status === status,
      ).length;
    }

    return statusCounts;
  }

  async getJuryParticipationStats() {
    const allUsers = await this.usersService.findAll();
    const allProcedures = await this.proceduresService.findAll();

    const participationMap = new Map<string, number>();

    for (const user of allUsers) {
      participationMap.set(user.id, 0);
    }

    for (const proc of allProcedures) {
      if (proc.status === ProcedureStatus.COMPLETED) {
        for (const member of proc.juryMembers) {
          if (member.status === 'accepted' && !member.isReserve) {
            const count = participationMap.get(member.userId) || 0;
            participationMap.set(member.userId, count + 1);
          }
        }
      }
    }

    const stats = Array.from(participationMap.entries())
      .map(([userId, count]) => {
        const user = allUsers.find((u) => u.id === userId);
        return {
          userId,
          userName: user?.fullName || 'Unknown',
          participationCount: count,
        };
      })
      .sort((a, b) => b.participationCount - a.participationCount);

    return {
      topParticipants: stats.slice(0, 10),
      totalParticipations: stats.reduce(
        (sum, s) => sum + s.participationCount,
        0,
      ),
      averageParticipations:
        stats.reduce((sum, s) => sum + s.participationCount, 0) / stats.length,
    };
  }
}
