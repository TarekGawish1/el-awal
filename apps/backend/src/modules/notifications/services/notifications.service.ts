import { Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AttendanceStatus,
  NotificationChannel,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { WebPushService } from '../../../services/webpush.service';
import { WebPushDispatcherService } from './webpush-dispatcher.service';
import { WhatsAppDispatcherService } from '../../whatsapp/services/whatsapp-dispatcher.service';
import { NotificationSettingsService } from './notification-settings.service';
import {
  NotificationDispatchService,
  type CreateNotificationDto,
  type SendNotificationDto,
  type DispatchNotificationPayload,
} from './notification-dispatch.service';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationEventsService } from './notification-events.service';

export type {
  CreateNotificationDto,
  SendNotificationDto,
  DispatchNotificationPayload,
};

@Injectable()
export class NotificationsService {
  private readonly dispatchService: NotificationDispatchService;
  private readonly templatesService: NotificationTemplatesService;
  private readonly eventsService: NotificationEventsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
    private readonly webPushDispatcher: WebPushDispatcherService,
    private readonly whatsappDispatcher: WhatsAppDispatcherService,
    private readonly settingsService: NotificationSettingsService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
    @Optional() dispatchService?: NotificationDispatchService,
    @Optional() templatesService?: NotificationTemplatesService,
    @Optional() eventsService?: NotificationEventsService,
  ) {
    this.dispatchService =
      dispatchService ??
      new NotificationDispatchService(
        this.prisma,
        this.webPush,
        this.webPushDispatcher,
        this.whatsappDispatcher,
        this.settingsService,
        this.realtimeGateway,
      );
    this.templatesService = templatesService ?? new NotificationTemplatesService();
    this.eventsService =
      eventsService ??
      new NotificationEventsService(this.prisma, this.dispatchService, this.templatesService);
  }

  // ─── Dispatch Methods ──────────────────────────────────────────────────────

  async sendNotification(dto: SendNotificationDto) {
    return this.dispatchService.sendNotification(dto);
  }

  async sendBatch(items: SendNotificationDto[]) {
    return this.dispatchService.sendBatch(items);
  }

  async dispatchToUsers(
    userIds: string[],
    payload: DispatchNotificationPayload,
    channels: NotificationChannel[],
  ) {
    return this.dispatchService.dispatchToUsers(userIds, payload, channels);
  }

  async createNotification(dto: CreateNotificationDto) {
    return this.dispatchService.createNotification(dto);
  }

  // ─── Query & State Management ──────────────────────────────────────────────

  async getNotifications(
    user: { id: string; role: UserRole },
    query: CursorPaginationDto & { role?: string; scope?: string },
  ) {
    return this.dispatchService.getNotifications(user, query);
  }

  async getUnreadCount(recipientId: string): Promise<{ unreadCount: number }> {
    return this.dispatchService.getUnreadCount(recipientId);
  }

  async markAsRead(notificationId: string, recipientId: string) {
    return this.dispatchService.markAsRead(notificationId, recipientId);
  }

  async markAllAsRead(recipientId: string) {
    return this.dispatchService.markAllAsRead(recipientId);
  }

  // ─── Domain Event Listeners ────────────────────────────────────────────────

  @OnEvent('student.absence.recorded', { async: true })
  @OnEvent('attendance.recorded', { async: true })
  async handleAbsenceEvent(payload: {
    studentId: string;
    groupName?: string;
    date?: Date;
    status?: AttendanceStatus;
  }) {
    return this.eventsService.handleAbsenceEvent(payload);
  }

  @OnEvent('student.absence.corrected', { async: true })
  async handleAbsenceCorrectedEvent(payload: {
    studentId: string;
    groupName?: string;
    date?: Date;
    sessionId?: string;
  }) {
    return this.eventsService.handleAbsenceCorrectedEvent(payload);
  }

  @OnEvent('student.homework.missing', { async: true })
  async handleHomeworkMissingEvent(payload: {
    studentId: string;
    assessmentTitle: string;
    groupName?: string;
    date?: Date;
  }) {
    return this.eventsService.handleHomeworkMissingEvent(payload);
  }

  @OnEvent('student.repeated.lateness', { async: true })
  async handleRepeatedLatenessEvent(payload: {
    studentId: string;
    groupName: string;
  }) {
    return this.eventsService.handleRepeatedLatenessEvent(payload);
  }

  @OnEvent('assessment.graded', { async: true })
  async handleAssessmentGradedEvent(payload: {
    submissionId: string;
    assessmentId: string;
    studentId: string;
    scoreObtained: number | null;
  }) {
    return this.eventsService.handleAssessmentGradedEvent(payload);
  }

  @OnEvent('payment.recorded', { async: true })
  async handlePaymentRecordedEvent(payload: {
    studentId: string;
    studentName: string;
    groupId?: string;
    groupName?: string;
    paymentType?: string;
    bookletId?: string;
    bookletTitle?: string;
    amountPaid: number;
    amountExpected?: number;
    currency?: string;
    receiptNumber?: string;
    paymentMethod?: string;
    periodYear?: number;
    periodMonth?: number;
    remainingBalance?: number;
  }) {
    return this.eventsService.handlePaymentRecordedEvent(payload);
  }
}
