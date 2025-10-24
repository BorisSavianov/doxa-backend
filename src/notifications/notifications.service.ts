// ============================================
// NOTIFICATIONS SERVICE
// src/notifications/notifications.service.ts
// ============================================

import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { Procedure } from '../common/entities/procedure.entity';

@Injectable()
export class NotificationsService {
  constructor(private notificationsGateway: NotificationsGateway) {}

  async notifyJuryInvitation(procedure: Procedure): Promise<void> {
    const notification = {
      procedureId: procedure.id,
      procedureType: procedure.type,
      candidateName: procedure.candidateName,
      date: procedure.date,
    };

    procedure.juryMembers.forEach((member) => {
      if (!member.isReserve) {
        this.notificationsGateway.sendProcedureInvitation(
          member.userId,
          notification,
        );
      }
    });
  }

  async notifyProcedureUpdate(
    procedure: Procedure,
    updateType: string,
  ): Promise<void> {
    const notification = {
      procedureId: procedure.id,
      updateType,
      date: procedure.date,
    };

    procedure.juryMembers.forEach((member) => {
      this.notificationsGateway.sendProcedureUpdate(
        member.userId,
        notification,
      );
    });
  }

  async notifyJuryResponse(
    procedure: Procedure,
    respondingUserId: string,
    accepted: boolean,
  ): Promise<void> {
    const notification = {
      procedureId: procedure.id,
      respondingUserId,
      accepted,
      timestamp: new Date(),
    };

    // Notify all other jury members
    const otherMembers = procedure.juryMembers
      .filter((m) => m.userId !== respondingUserId)
      .map((m) => m.userId);

    this.notificationsGateway.broadcastToMultipleUsers(
      otherMembers,
      notification,
    );
  }

  async sendTestNotification(userId: string, message: string): Promise<void> {
    const notification = {
      type: 'test_message',
      data: { message },
      timestamp: new Date(),
    };
    this.notificationsGateway.sendNotificationToUser(userId, notification);
  }
}
