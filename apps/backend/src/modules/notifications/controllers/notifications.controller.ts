import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from '../services/notifications.service';
import { WebPushService, PushSubscriptionDto } from '../../../services/webpush.service';
import { WhatsAppService } from '../../../services/whatsapp/whatsapp.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { Public } from '../../../core/security/decorators/public.decorator';
import { UserRole } from '@prisma/client';

import { NotificationSettingsService, NotificationSystemSettings } from '../services/notification-settings.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly webPushService: WebPushService,
    private readonly whatsappService: WhatsAppService,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  // ─── In-App Notification Feed ─────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get cursor-paginated notification feed with optional role filtering' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CursorPaginationDto & { role?: string; scope?: string },
  ) {
    return this.notificationsService.getNotifications(user, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total count of unread notifications for badge display' })
  @ApiResponse({ status: 200, description: 'Unread counter object' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the authenticated user' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ─── Web Push Subscription Management ────────────────────────────────────

  @Public()
  @Get('push-vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for client-side push subscription' })
  getVapidPublicKey() {
    return { publicKey: this.webPushService.getPublicKey() };
  }

  @Post('push-subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or update a Web Push subscription for the authenticated user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string' },
        keys: {
          type: 'object',
          properties: {
            p256dh: { type: 'string' },
            auth: { type: 'string' },
          },
        },
      },
      required: ['endpoint', 'keys'],
    },
  })
  async subscribeToPush(
    @CurrentUser() user: AuthenticatedUser,
    @Body() subscription: PushSubscriptionDto,
    @Req() req: Request,
  ) {
    await this.webPushService.subscribe(
      user.id,
      subscription,
      req.headers['user-agent'],
    );
    return { success: true, message: 'Push subscription saved' };
  }

  @Delete('push-unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a Web Push subscription' })
  async unsubscribeFromPush(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { endpoint: string },
  ) {
    await this.webPushService.unsubscribe(user.id, body.endpoint);
    return { success: true, message: 'Push subscription removed' };
  }

  @Get('whatsapp-status')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Get WhatsApp connection status and QR code for pairing (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns connected status, connected phone number, and QR code data URL',
  })
  getWhatsAppStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('whatsapp-relink')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Disconnect existing WhatsApp session, clear auth keys, and generate a new QR code for pairing another number',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns success confirmation and triggers fresh QR code generation',
  })
  async relinkWhatsApp() {
    return this.whatsappService.resetSession();
  }

  // ─── Global System Notification Controls ──────────────────────────────────

  @Get('settings')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get global notification system switches (WhatsApp, Web Push, In-App)' })
  @ApiResponse({ status: 200, description: 'Returns system-wide notification settings' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('settings')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update global notification system switches (WhatsApp Master, Push Master, Categories)' })
  @ApiResponse({ status: 200, description: 'Returns updated system-wide notification settings' })
  async updateSettings(
    @Body() dto: Partial<NotificationSystemSettings>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.updateSettings(dto, user.email || user.phone || user.id || 'Admin');
  }
}
