// ============================================
// DASHBOARD MODULE
// src/dashboard/dashboard.module.ts
// ============================================

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsersModule } from '../users/users.module';
import { ProceduresModule } from '../procedures/procedures.module';

@Module({
  imports: [UsersModule, ProceduresModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
