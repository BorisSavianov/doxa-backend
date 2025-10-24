// ============================================
// JURY MODULE
// src/jury/jury.module.ts
// ============================================

import { Module } from '@nestjs/common';
import { JurySelectionService } from './jury-selection.service';
import { UsersModule } from '../users/users.module';
import { UnavailabilityModule } from 'src/unavailability/unavailability.module';

@Module({
  imports: [UsersModule, UnavailabilityModule],
  providers: [JurySelectionService],
  exports: [JurySelectionService],
})
export class JuryModule {}
