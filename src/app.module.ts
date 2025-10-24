// ============================================
// MAIN APPLICATION MODULE
// src/app.module.ts
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProceduresModule } from './procedures/procedures.module';
import { JuryModule } from './jury/jury.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UnavailabilityModule } from './unavailability/unavailability.module';
import { FirebaseModule } from './firebase/firebase.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    AuthModule,
    UsersModule,
    ProceduresModule,
    JuryModule,
    NotificationsModule,
    UnavailabilityModule,
    DashboardModule,
  ],
})
export class AppModule {}
