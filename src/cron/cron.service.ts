// ============================================
// CRON SERVICE
// src/cron/cron.service.ts
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private notificationsService: NotificationsService) {}

  // Run every day at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleNotificationCleanup() {
    this.logger.log('Starting notification cleanup...');
    
    try {
      const deletedCount = await this.notificationsService.cleanupOldNotifications();
      this.logger.log(`Cleaned up ${deletedCount} old notifications`);
    } catch (error) {
      this.logger.error('Error during notification cleanup:', error);
    }
  }

  // Alternative: Run every 6 hours
  // @Cron(CronExpression.EVERY_6_HOURS)
  // async handleFrequentCleanup() {
  //   this.logger.log('Running frequent notification cleanup...');
  //   const deletedCount = await this.notificationsService.cleanupOldNotifications();
  //   this.logger.log(`Cleaned up ${deletedCount} notifications`);
  // }
}