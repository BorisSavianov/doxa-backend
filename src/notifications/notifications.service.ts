// ============================================
// NOTIFICATIONS SERVICE
// src/notifications/notifications.service.ts
// ============================================

import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { Procedure } from '../common/entities/procedure.entity';
import { FirebaseService } from '../firebase/firebase.service';

export interface NotificationRecord {
  id: string;
  userId: string;
  procedureId: string;
  type: 'invitation' | 'update' | 'response' | 'completion';
  message: string;
  read: boolean;
  createdAt: Date;
  procedureDate: Date;
}

@Injectable()
export class NotificationsService {
  private readonly collection = 'notifications';

  constructor(
    private notificationsGateway: NotificationsGateway,
    private firebaseService: FirebaseService,
  ) {}

  async notifyJuryInvitation(
    procedure: Procedure,
    userIds?: string[],
  ): Promise<void> {
    const notification = {
      procedureId: procedure.id,
      procedureType: procedure.type,
      candidateName: procedure.candidateName,
      date: procedure.date,
    };

    // If specific userIds provided, only notify them, otherwise notify all non-reserve members
    const targetUserIds = userIds || 
      procedure.juryMembers
        .filter((m) => !m.isReserve)
        .map((m) => m.userId);

    targetUserIds.forEach((userId) => {
      this.notificationsGateway.sendProcedureInvitation(userId, notification);
      
      // Store notification in database
      this.storeNotification({
        userId,
        procedureId: procedure.id,
        type: 'invitation',
        message: `You have been invited to jury for ${procedure.type} - ${procedure.candidateName}`,
        read: false,
        createdAt: new Date(),
        procedureDate: procedure.date,
      });
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

      // Store notification in database
      this.storeNotification({
        userId: member.userId,
        procedureId: procedure.id,
        type: 'update',
        message: `Procedure ${procedure.id} has been updated: ${updateType}`,
        read: false,
        createdAt: new Date(),
        procedureDate: procedure.date,
      });
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

    // Store notifications
    otherMembers.forEach((userId) => {
      this.storeNotification({
        userId,
        procedureId: procedure.id,
        type: 'response',
        message: `A jury member has ${accepted ? 'accepted' : 'rejected'} the invitation for procedure ${procedure.id}`,
        read: false,
        createdAt: new Date(),
        procedureDate: procedure.date,
      });
    });
  }

  async sendTestNotification(userId: string, message: string): Promise<void> {
    const notification = {
      type: 'test_message',
      data: { message },
      timestamp: new Date(),
    };
    this.notificationsGateway.sendNotificationToUser(userId, notification);
  }

  private async storeNotification(
    notification: Omit<NotificationRecord, 'id'>,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).add(notification);
  }

  async markAsRead(notificationId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).doc(notificationId).update({
      read: true,
    });
  }

  async getUserNotifications(userId: string): Promise<NotificationRecord[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as NotificationRecord,
    );
  }

  async cleanupOldNotifications(): Promise<number> {
    const db = this.firebaseService.getFirestore();
    const now = new Date();
    
    // Find notifications where procedure date has passed
    const snapshot = await db
      .collection(this.collection)
      .where('procedureDate', '<', now)
      .get();

    let deletedCount = 0;
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    if (deletedCount > 0) {
      await batch.commit();
    }

    return deletedCount;
  }
}