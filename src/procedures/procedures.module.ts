// ============================================
// PROCEDURES MODULE
// src/procedures/procedures.module.ts
// ============================================

import { Module } from '@nestjs/common';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';
import { JuryModule } from '../jury/jury.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [JuryModule, UsersModule],
  controllers: [ProceduresController],
  providers: [ProceduresService],
  exports: [ProceduresService],
})
export class ProceduresModule {}
