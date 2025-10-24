// ============================================
// src/notifications/notifications.controller.ts
// ============================================

import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiOperation, ApiOkResponse, ApiTags, ApiBody } from '@nestjs/swagger';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
