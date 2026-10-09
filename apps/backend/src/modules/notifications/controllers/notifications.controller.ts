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
import { SchedulersService } from '../../../jobs/schedulers';
import { WhatsAppDispatcherService } from '../../whatsapp/services/whatsapp-dispatcher.service';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly webPushService: WebPushService,
    private readonly whatsappService: WhatsAppService,
    private readonly whatsappDispatcher: WhatsAppDispatcherService,
    private readonly settingsService: NotificationSettingsService,
    private readonly schedulersService: SchedulersService,
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

  @Post('whatsapp-simulate-ban-alert')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate or test WhatsApp ban notification dispatch to verify alerts' })
  async simulateBanAlert() {
    await this.whatsappService.handleBanDetected('محاكاة تجريبية: تنبيه لاختبار وصول إشعار حظر رقم الواتساب للمنصة');
    return { success: true, message: 'تم إرسال إشعار تنبيه حظر الواتساب بنجاح إلى المعلم والمشرفين.' };
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

  @Post('trigger-daily-schedule')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger teacher daily schedule agenda dispatch immediately (testing / manual dispatch)' })
  @ApiResponse({ status: 200, description: 'Returns dispatch confirmation' })
  async triggerDailySchedule() {
    return this.schedulersService.runTeacherDailySchedule(true);
  }

  // ─── WhatsApp Queue & Delivery Observability ─────────────────────────────

  @Get('whatsapp-stats')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get WhatsApp delivery summary statistics (sent today, queued, failed)' })
  async getWhatsAppStats() {
    return this.whatsappDispatcher.getStats();
  }

  @Get('whatsapp-queue')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get paginated list of pending/queued WhatsApp messages' })
  async getWhatsAppQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.whatsappDispatcher.getQueue(pageNum, limitNum);
  }

  @Get('whatsapp-failed')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get paginated list of failed WhatsApp messages with reasons and retry counts' })
  async getWhatsAppFailed(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.whatsappDispatcher.getFailed(pageNum, limitNum);
  }

  @Post('whatsapp-retry/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Retry a specific failed WhatsApp message' })
  async retryWhatsAppMessage(@Param('id') id: string) {
    const updated = await this.whatsappDispatcher.retryMessage(id);
    return {
      success: true,
      message: 'تمت إعادة جدولة الرسالة بنجاح عبر طابور الواتساب',
      data: updated,
    };
  }

  @Post('whatsapp-retry-all')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Retry all failed WhatsApp messages' })
  async retryAllFailedWhatsApp() {
    const result = await this.whatsappDispatcher.retryAllFailed();
    return {
      success: true,
      message: `تمت جدولة إعادة إرسال ${result.count} رسالة فاشلة بنجاح عبر طابور الإرسال الآمن`,
      count: result.count,
    };
  }

  @Delete('whatsapp-message/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete / remove an individual message from WhatsApp queue or failed log' })
  async deleteWhatsAppMessage(@Param('id') id: string) {
    const result = await this.whatsappDispatcher.deleteMessage(id);
    return {
      success: true,
      message: 'تم حذف الرسالة بنجاح',
      data: result,
    };
  }

  @Post('whatsapp-failed/clear')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Clear all failed WhatsApp messages' })
  async clearAllFailedWhatsApp() {
    const result = await this.whatsappDispatcher.clearAllFailed();
    return {
      success: true,
      message: `تم مسح ${result.count} رسالة فاشلة بنجاح`,
      count: result.count,
    };
  }

  @Post('whatsapp-queue/clear')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Clear all queued WhatsApp messages' })
  async clearWhatsAppQueue() {
    const result = await this.whatsappDispatcher.clearQueue();
    return {
      success: true,
      message: `تم إفراغ طابور الانتظار وحذف ${result.count} رسالة بنجاح`,
      count: result.count,
    };
  }

  @Post('whatsapp-dispatch-now')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Trigger immediate dispatch of queued WhatsApp messages (bypasses quiet hours)' })
  async dispatchWhatsAppQueueNow() {
    const result = await this.whatsappDispatcher.forceDispatchNow();
    return {
      success: true,
      message: 'تم تفعيل الإرسال الفوري لطابور الواتساب بنجاح 🚀',
      data: result,
    };
  }
}
