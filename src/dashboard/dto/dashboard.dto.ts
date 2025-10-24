// ============================================
// DASHBOARD DTOs
// src/dashboard/dto/dashboard.dto.ts
// ============================================

import { ApiProperty } from '@nestjs/swagger';
import { Procedure } from '../../common/entities/procedure.entity';

export class DashboardStatsDto {
  @ApiProperty({ example: 3 })
  pendingInvitations: number;

  @ApiProperty({ example: 5 })
  upcomingProcedures: number;

  @ApiProperty({ example: 12 })
  completedProcedures: number;

  @ApiProperty({ example: 8 })
  thisYearParticipations: number;
}

export class AdminDashboardStatsDto {
  @ApiProperty({ example: 45 })
  totalUsers: number;

  @ApiProperty({ example: 120 })
  totalProcedures: number;

  @ApiProperty({ example: 15 })
  activeProcedures: number;

  @ApiProperty({ example: 5 })
  pendingConfirmations: number;

  @ApiProperty({ example: 8 })
  upcomingProcedures: number;

  @ApiProperty({ example: 4 })
  completedThisMonth: number;
}

export class UpcomingProceduresDto {
  @ApiProperty({ type: [Procedure] })
  procedures: Procedure[];
}

export class ActivityItem {
  @ApiProperty({ example: 'invitation' })
  type: string;

  @ApiProperty({ example: 'proc_123' })
  procedureId: string;

  @ApiProperty({ example: 'doctor - Dr. Ivan Petrov' })
  procedureName: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  timestamp: Date;

  @ApiProperty({ example: 'pending' })
  status: string;
}

export class RecentActivityDto {
  @ApiProperty({ type: [ActivityItem] })
  activities: ActivityItem[];
}
