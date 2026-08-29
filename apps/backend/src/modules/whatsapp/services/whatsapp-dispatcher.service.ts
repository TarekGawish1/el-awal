import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationType,
  UserRole,
  WhatsAppStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { WhatsAppService } from '../../../services/whatsapp/whatsapp.service';
import {
  formatAbsenceMessage,
  formatExamFailedMessage,
  formatGenericMessage,
  formatGroupReservationPendingMessage,
  formatPaymentMessage,
  formatSessionReminderMessage,
  formatStudentApprovalMessage,
  formatStudentRegistrationMessage,
  formatTeacherAgendaMessage,
} from '../../../utils/spintax';

import { NotificationSettingsService } from '../../notifications/services/notification-settings.service';

const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 5 * 60_000];
const POST_SEND_COOLDOWN_MIN_MS = 4_000;
const POST_SEND_COOLDOWN_MAX_MS = 7_000;

interface QueueNotification {
  type: string;
  notificationType: NotificationType | null;
  title: string;
  message: string;
  data: unknown;
  scheduledFor: Date;
  recipient: { fullName: string; role: UserRole };
}

/**
 * PostgreSQL-backed, single-consumer WhatsApp dispatcher.
 *
 * This is intentionally an in-process sequential loop: it claims one database
 * record, sends it through the protected Baileys flow, and waits 4–7 seconds
 * before considering another record. Do not introduce parallel consumers here.
 */
@Injectable()
export class WhatsAppDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppDispatcherService.name);
  private readonly hourlyLimit: number;
  private readonly dailyLimit: number;
  private isRunning = false;
  private isProcessing = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly settingsService: NotificationSettingsService,
    config: ConfigService,
  ) {
    this.hourlyLimit = this.parsePositiveLimit(
      config.get<string>('WHATSAPP_HOURLY_LIMIT', '25'),
      25,
    );
    this.dailyLimit = this.parsePositiveLimit(
      config.get<string>('WHATSAPP_DAILY_LIMIT', '80'),
      80,
    );
  }

  async onModuleInit(): Promise<void> {
    this.isRunning = true;
    await this.recoverStaleSendingMessages();
    this.pollTimeout = setTimeout(() => this.poll(), 10_000);
    this.logger.log(
      `WhatsApp dispatcher started (concurrency=1, hourly≤${this.hourlyLimit}, daily≤${this.dailyLimit})`,
    );
  }

  onModuleDestroy(): void {
    this.isRunning = false;
    if (this.pollTimeout) clearTimeout(this.pollTimeout);
  }

  /** Converts local Egyptian and E.164-like input to WhatsApp's digit-only international format. */
  formatToWhatsAppInternational(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) digits = `2${digits}`;
    else if (digits.startsWith('1') && digits.length === 10) digits = `20${digits}`;

    if (!/^20(?:10|11|12|15)\d{8}$/.test(digits)) {
      throw new Error('Invalid Egyptian international phone number');
    }
    return digits;
  }

  /** Persists a fully rendered, varied message before the dispatcher can send it. */
  async enqueueNotification(notification: QueueNotification) {
    // Disable WhatsApp messages if globally disabled or if type is disabled
    const isAllowed = await this.settingsService.isChannelAllowed(
      NotificationChannel.WHATSAPP,
      notification.notificationType ?? notification.type,
    );

    if (!isAllowed) {
      this.logger.debug(`Skipping WhatsApp enqueue for [${notification.type}]: suppressed by notification settings`);
      return null;
    }

    // Disable WhatsApp messages for session time reminders
    if (
      notification.notificationType === NotificationType.SESSION_REMINDER_STUDENT ||
      notification.notificationType === NotificationType.TEACHER_SESSION_REMINDER ||
      notification.type === 'SESSION_REMINDER_STUDENT' ||
      notification.type === 'TEACHER_SESSION_REMINDER'
    ) {
      this.logger.debug(`Skipping WhatsApp dispatch for session reminder [${notification.type}]`);
      return null;
    }

    const data = notification.data as Record<string, unknown> | null;
    const rawPhone = data?.phone;
    if (typeof rawPhone !== 'string' || !rawPhone.trim()) {
      this.logger.warn(`Recording permanent WhatsApp failure for ${notification.type}: recipient phone is missing`);
      return this.prisma.whatsAppMessageLog.create({
        data: {
          recipientPhone: '',
          recipientName: notification.recipient.fullName,
          recipientRole: notification.recipient.role,
          templateType: notification.notificationType ?? notification.type,
          messageBody: this.buildMessageBody(notification),
          status: WhatsAppStatus.PERMANENT_FAIL,
          failureReason: 'Recipient phone is missing',
          scheduledFor: notification.scheduledFor,
        },
      });
    }

    let recipientPhone: string;
    try {
      recipientPhone = this.formatToWhatsAppInternational(rawPhone);
    } catch (error) {
      return this.prisma.whatsAppMessageLog.create({
        data: {
          recipientPhone: rawPhone.replace(/\D/g, ''),
          recipientName: notification.recipient.fullName,
          recipientRole: notification.recipient.role,
          templateType: notification.notificationType ?? notification.type,
          messageBody: this.buildMessageBody(notification),
          status: WhatsAppStatus.PERMANENT_FAIL,
          failureReason: this.errorMessage(error),
          scheduledFor: notification.scheduledFor,
        },
      });
    }

    return this.prisma.whatsAppMessageLog.create({
      data: {
        recipientPhone,
        recipientName: notification.recipient.fullName,
        recipientRole: notification.recipient.role,
        templateType: notification.notificationType ?? notification.type,
        messageBody: this.buildMessageBody(notification),
        status: WhatsAppStatus.QUEUED,
        scheduledFor: notification.scheduledFor,
      },
    });
  }

  /** Receipts can call this method when a provider delivery acknowledgement arrives. */
  async markDelivered(providerMessageId: string): Promise<void> {
    await this.prisma.whatsAppMessageLog.updateMany({
      where: { providerMessageId, status: WhatsAppStatus.SENT },
      data: { status: WhatsAppStatus.DELIVERED, deliveredAt: new Date() },
    });
  }

  /** Processes exactly one due record. Public for focused worker tests. */
  async processNextQueuedMessage(): Promise<boolean> {
    if (this.isProcessing) return false;
    this.isProcessing = true;

    try {
      const candidate = await this.prisma.whatsAppMessageLog.findFirst({
        where: {
          status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.FAILED] },
          retryCount: { lt: 3 },
          scheduledFor: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!candidate) return false;

      // A conditional update is the database claim. It also prevents duplicate
      // delivery if two application processes race while deploying.
      const claim = await this.prisma.whatsAppMessageLog.updateMany({
        where: {
          id: candidate.id,
          status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.FAILED] },
          retryCount: { lt: candidate.maxRetries },
        },
        data: { status: WhatsAppStatus.SENDING },
      });
      if (claim.count !== 1) return false;

      try {
        const result = await this.whatsapp.sendTrackedProtectedMessage(
          candidate.recipientPhone,
          candidate.messageBody,
        );

        if (result.outcome === 'sent') {
          await this.prisma.whatsAppMessageLog.update({
            where: { id: candidate.id },
            data: {
              status: WhatsAppStatus.SENT,
              providerMessageId: result.providerMessageId ?? null,
              sentAt: new Date(),
              failureReason: null,
            },
          });
        } else if (result.outcome === 'not_registered') {
          await this.markPermanentFailure(candidate.id, 'Phone is not registered on WhatsApp');
        } else {
          await this.markTransientFailure(candidate, result.failureReason ?? result.outcome);
        }
      } catch (error) {
        await this.markTransientFailure(candidate, this.errorMessage(error));
      } finally {
        // This cooldown is mandatory after every attempted delivery, including failures.
        await this.sleep(this.randomBetween(POST_SEND_COOLDOWN_MIN_MS, POST_SEND_COOLDOWN_MAX_MS));
      }

      return true;
    } finally {
      this.isProcessing = false;
    }
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    let nextDelay = 10_000;
    try {
      const isWaAllowed = await this.settingsService.isChannelAllowed(NotificationChannel.WHATSAPP);
      if (!isWaAllowed) {
        nextDelay = 30_000;
      } else if (!this.isWithinActiveHours()) {
        nextDelay = 5 * 60_000;
      } else if (await this.isQuotaExhausted()) {
        if (await this.isDailyQuotaExhausted()) await this.deferQueuedMessagesToTomorrow();
        nextDelay = 3 * 60_000;
      } else if (await this.processNextQueuedMessage()) {
        // processNextQueuedMessage already applied the 4–7 second cooldown.
        nextDelay = 0;
      } else {
        nextDelay = 12_000;
      }
    } catch (error) {
      this.logger.error('Unexpected WhatsApp dispatcher error', error);
      nextDelay = 15_000;
    } finally {
      if (this.isRunning) this.pollTimeout = setTimeout(() => this.poll(), nextDelay);
    }
  }

  private async markPermanentFailure(id: string, reason: string): Promise<void> {
    await this.prisma.whatsAppMessageLog.update({
      where: { id },
      data: { status: WhatsAppStatus.PERMANENT_FAIL, failureReason: reason },
    });
  }

  private async markTransientFailure(
    message: { id: string; retryCount: number; maxRetries: number },
    reason: string,
  ): Promise<void> {
    const nextRetryCount = message.retryCount + 1;
    const retryDelay = RETRY_DELAYS_MS[Math.min(message.retryCount, RETRY_DELAYS_MS.length - 1)];
    await this.prisma.whatsAppMessageLog.update({
      where: { id: message.id },
      data: {
        status: WhatsAppStatus.FAILED,
        failureReason: reason,
        retryCount: { increment: 1 },
        // A final failed attempt remains FAILED for audit but is no longer eligible to send.
        scheduledFor: new Date(Date.now() + retryDelay),
      },
    });
    this.logger.warn(
      `WhatsApp message ${message.id} failed (attempt ${nextRetryCount}/${message.maxRetries}): ${reason}`,
    );
  }

  private async isQuotaExhausted(): Promise<boolean> {
    const [hourly, daily] = await Promise.all([
      this.prisma.whatsAppMessageLog.count({
        where: {
          status: { in: [WhatsAppStatus.SENT, WhatsAppStatus.DELIVERED] },
          sentAt: { gte: new Date(Date.now() - 60 * 60_000) },
        },
      }),
      this.countSentToday(),
    ]);
    return hourly >= this.hourlyLimit || daily >= this.dailyLimit;
  }

  private async isDailyQuotaExhausted(): Promise<boolean> {
    return (await this.countSentToday()) >= this.dailyLimit;
  }

  private countSentToday(): Promise<number> {
    return this.prisma.whatsAppMessageLog.count({
      where: {
        status: { in: [WhatsAppStatus.SENT, WhatsAppStatus.DELIVERED] },
        sentAt: { gte: this.getCairoMidnight() },
      },
    });
  }

  private async deferQueuedMessagesToTomorrow(): Promise<void> {
    await this.prisma.whatsAppMessageLog.updateMany({
      where: { status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.FAILED] } },
      data: { scheduledFor: this.getTomorrowActiveStart() },
    });
  }

  private async recoverStaleSendingMessages(): Promise<void> {
    const staleBefore = new Date(Date.now() - 30 * 60_000);
    await this.prisma.whatsAppMessageLog.updateMany({
      where: {
        status: WhatsAppStatus.SENDING,
        updatedAt: { lte: staleBefore },
        retryCount: { lt: 3 },
      },
      data: {
        status: WhatsAppStatus.FAILED,
        failureReason: 'Recovered after interrupted dispatcher attempt',
        retryCount: { increment: 1 },
        scheduledFor: new Date(Date.now() + RETRY_DELAYS_MS[0]),
      },
    });
  }

  private buildMessageBody(notification: QueueNotification): string {
    const data = notification.data as Record<string, unknown> | null;
    let message: string;

    if (notification.type === 'STUDENT_REGISTRATION_CREDENTIALS') {
      message = formatStudentRegistrationMessage({
        parentName: (data?.parentName as string) || 'ولي الأمر المحترم',
        studentName: (data?.studentName as string) || 'الطالب',
        studentPhoneOrCode: (data?.studentPhoneOrCode as string) || (data?.studentPhone as string) || (data?.studentCode as string) || '',
        studentPassword: data?.studentPassword as string | undefined,
        parentPhoneOrCode: (data?.parentPhoneOrCode as string) || (data?.parentPhone as string) || undefined,
        parentPassword: data?.parentPassword as string | undefined,
        platformUrl: (data?.platformUrl as string) || process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online/login',
        centerName: (data?.centerName as string) || 'منصة الأوّل التعليمية',
        groupName: data?.groupName as string | undefined,
      });
    } else if (notification.type === 'STUDENT_GROUP_LINK_ENROLLMENT') {
      message = formatGroupReservationPendingMessage({
        parentName: (data?.parentName as string) || 'ولي الأمر المحترم',
        studentName: (data?.studentName as string) || 'الطالب',
        groupName: data?.groupName as string | undefined,
        centerName: (data?.centerName as string) || 'منصة الأوّل التعليمية',
      });
    } else {
      switch (notification.notificationType) {
        case NotificationType.STUDENT_APPROVAL_CREDENTIALS:
          message = formatStudentApprovalMessage({
            parentName: (data?.parentName as string) || 'ولي الأمر المحترم',
            studentName: (data?.studentName as string) || 'الطالب',
            studentPhoneOrCode: (data?.studentPhoneOrCode as string) || (data?.studentPhone as string) || (data?.studentCode as string) || '',
            studentPassword: data?.studentPassword as string | undefined,
            parentPhoneOrCode: (data?.parentPhoneOrCode as string) || (data?.parentPhone as string) || undefined,
            parentPassword: data?.parentPassword as string | undefined,
            platformUrl: (data?.platformUrl as string) || process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online/login',
            centerName: (data?.centerName as string) || 'منصة الأوّل التعليمية',
            groupName: data?.groupName as string | undefined,
          });
          break;
        case NotificationType.ABSENCE_ALERT_PARENT:
          message = formatAbsenceMessage((data?.studentName as string) || 'الطالب', (data?.groupName as string) || 'الحصة', data?.date as string | undefined);
          break;
        case NotificationType.SESSION_REMINDER_STUDENT:
          message = formatSessionReminderMessage((data?.studentName as string) || 'الطالب', (data?.groupName as string) || 'الحصة', (data?.startTime as string) || '');
          break;
        case NotificationType.EXAM_FAILED_ALERT_PARENT:
          message = formatExamFailedMessage((data?.studentName as string) || 'الطالب', (data?.examTitle as string) || 'الاختبار', Number(data?.score ?? 0), Number(data?.total ?? 100), Number(data?.passing ?? 50));
          break;
        case NotificationType.TEACHER_DAILY_SCHEDULE:
          message = formatTeacherAgendaMessage(
            (data?.teacherName as string) || notification.recipient?.fullName || 'الأستاذ',
            (data?.date as string) || new Date().toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }),
            (data?.sessions as string[]) || (notification.message ? [notification.message] : []),
          );
          break;
        default:
          message = notification.type === 'PAYMENT_RECEIVED' && data?.amount
            ? formatPaymentMessage((data.studentName as string) || 'الطالب', Number(data.amount), Number(data.month ?? new Date().getMonth() + 1), Number(data.year ?? new Date().getFullYear()))
            : formatGenericMessage(notification.title, notification.message);
      }
    }

    const reference = randomUUID().slice(0, 8).toUpperCase();
    const emoji = ['🌟', '📚', '✨'][Math.floor(Math.random() * 3)];
    const timestamp = new Date().toLocaleTimeString('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${message}\n\n${emoji} مرجع الرسالة: ${reference} • ${timestamp}`;
  }

  private isWithinActiveHours(): boolean {
    const hour = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', hour: '2-digit', hourCycle: 'h23',
    }).format(new Date()));
    return hour >= 7 && hour < 22;
  }

  private getCairoMidnight(): Date {
    const { year, month, day } = this.getCairoDateParts();
    return new Date(`${year}-${month}-${day}T00:00:00+02:00`);
  }

  private getTomorrowActiveStart(): Date {
    const { year, month, day } = this.getCairoDateParts();
    const tomorrow = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));
    const date = [
      tomorrow.getUTCFullYear(),
      String(tomorrow.getUTCMonth() + 1).padStart(2, '0'),
      String(tomorrow.getUTCDate()).padStart(2, '0'),
    ].join('-');
    return new Date(`${date}T08:00:00+02:00`);
  }

  private getCairoDateParts(): { year: string; month: string; day: string } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return { year: value('year'), month: value('month'), day: value('day') };
  }

  private parsePositiveLimit(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown WhatsApp gateway error';
  }
}
