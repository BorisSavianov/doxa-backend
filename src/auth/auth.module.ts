// ============================================
// UPDATED AUTH MODULE
// src/auth/auth.module.ts
// ============================================

import { Module } from '@nestjs/common';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [FirebaseAuthGuard, AdminGuard, AuthService],
  exports: [FirebaseAuthGuard, AdminGuard, AuthService],
})
export class AuthModule {}
