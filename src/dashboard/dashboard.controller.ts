// ============================================
// DASHBOARD CONTROLLER
// src/dashboard/dashboard.controller.ts
// ============================================

import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  DashboardStatsDto,
  AdminDashboardStatsDto,
  UpcomingProceduresDto,
  RecentActivityDto,
} from './dto/dashboard.dto';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user dashboard statistics' })
  @ApiOkResponse({ type: DashboardStatsDto })
  async getUserStats(@Request() req): Promise<DashboardStatsDto> {
    return this.dashboardService.getUserDashboardStats(req.user.uid);
  }

  @Get('admin/stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiOkResponse({ type: AdminDashboardStatsDto })
  async getAdminStats(): Promise<AdminDashboardStatsDto> {
    return this.dashboardService.getAdminDashboardStats();
  }

  @Get('upcoming-procedures')
  @ApiOperation({ summary: 'Get upcoming procedures for user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: UpcomingProceduresDto })
  async getUpcomingProcedures(
    @Request() req,
    @Query('limit') limit?: number,
  ): Promise<UpcomingProceduresDto> {
    return this.dashboardService.getUpcomingProcedures(
      req.user.uid,
      limit || 5,
    );
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity for user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: RecentActivityDto })
  async getRecentActivity(
    @Request() req,
    @Query('limit') limit?: number,
  ): Promise<RecentActivityDto> {
    return this.dashboardService.getRecentActivity(req.user.uid, limit || 10);
  }

  @Get('admin/pending-procedures')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get procedures pending jury selection' })
  @ApiOkResponse({ type: [Object] })
  async getPendingProcedures() {
    return this.dashboardService.getPendingProcedures();
  }

  @Get('admin/procedures-by-status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get procedure counts by status' })
  @ApiOkResponse({ type: Object })
  async getProceduresByStatus() {
    return this.dashboardService.getProceduresByStatus();
  }

  @Get('admin/jury-participation')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get jury participation statistics' })
  @ApiOkResponse({ type: Object })
  async getJuryParticipationStats() {
    return this.dashboardService.getJuryParticipationStats();
  }
}
