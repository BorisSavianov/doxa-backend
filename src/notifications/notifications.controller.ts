// ============================================
// NOTIFICATIONS CONTROLLER 
// src/notifications/notifications.controller.ts
// ============================================

import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { ApiOperation, ApiOkResponse, ApiTags, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@Controller('notifications')
@ApiTags('notifications')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiOkResponse({ description: 'List of notifications' })
  async getMyNotifications(@Request() req) {
    return this.notificationsService.getUserNotifications(req.user.uid);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiOkResponse({ description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'some-firebase-uid' },
        message: { type: 'string', example: 'Hello from Swagger!' },
      },
      required: ['userId', 'message'],
    },
  })
  @ApiOkResponse({ description: 'Sent notification' })
  async sendTest(@Body() body: { userId: string; message: string }) {
    await this.notificationsService.sendTestNotification(
      body.userId,
      body.message,
    );
    return { status: 'sent' };
  }
}