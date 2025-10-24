// ============================================
// NOTIFICATIONS GATEWAY (WebSocket)
// src/notifications/notifications.gateway.ts
// ============================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FirebaseService } from '../firebase/firebase.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map();

  constructor(private firebaseService: FirebaseService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const decodedToken = await this.firebaseService.verifyIdToken(token);
      this.userSockets.set(decodedToken.uid, client.id);
      client.data.userId = decodedToken.uid;

      console.log(`User ${decodedToken.uid} connected`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.userSockets.delete(client.data.userId);
      console.log(`User ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, userId: string) {
    client.join(`user:${userId}`);
  }

  sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
    }
  }

  sendProcedureInvitation(userId: string, procedureData: any) {
    this.sendNotificationToUser(userId, {
      type: 'procedure_invitation',
      data: procedureData,
      timestamp: new Date(),
    });
  }

  sendProcedureUpdate(userId: string, procedureData: any) {
    this.sendNotificationToUser(userId, {
      type: 'procedure_update',
      data: procedureData,
      timestamp: new Date(),
    });
  }

  broadcastToMultipleUsers(userIds: string[], notification: any) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }
}
