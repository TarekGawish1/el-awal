import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationType,
  UserRole,
  WhatsAppStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationSettingsService } from '../../notifications/services/notification-settings.service';
import { WhatsAppService } from '../../../services/whatsapp/whatsapp.service';
import type {
  QueueNotification,
} from './whatsapp-formatter.util';
import {
  formatToWhatsAppInternational,
  buildMessageBody,
} from './whatsapp-formatter.util';
import { WhatsAppQueueManagerService } from './whatsapp-queue-manager.service';

export type { QueueNotification };

export interface ActiveHoursConfig {
  startHour: number;
  endHour: number;
  timezone: string;
}

const DEFAULT_ACTIVE_HOURS: ActiveHoursConfig = {
  startHour: 7,
  endHour: 22,
  timezone: 'Africa/Cairo',
};

const ANTI_BAN_HOURLY_LIMIT = 25;
const ANTI_BAN_DAILY_LIMIT = 150;
const POST_SEND_COOLDOWN_MIN_MS = 4_000;
const POST_SEND_COOLDOWN_MAX_MS = 7_000;

const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
];

@Injectable()
export class WhatsAppDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppDispatcherService.name);

  private readonly hourlyLimit: number;
  private readonly dailyLimit: number;
  private readonly activeHours: ActiveHoursConfig;

  private isRunning = false;
  private isProcessing = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  private forceImmediateActive = false;

  private readonly queueManager: WhatsAppQueueManagerService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly settingsService: NotificationSettingsService,
    private readonly config: ConfigService,
    @Optional() queueManager?: WhatsAppQueueManagerService,
  ) {
    this.queueManager = queueManager ?? new WhatsAppQueueManagerService(prisma, settingsService);

    this.hourlyLimit =
      this.config.get<number>('WHATSAPP_ANTI_BAN_HOURLY_LIMIT') ??
      ANTI_BAN_HOURLY_LIMIT;
    this.dailyLimit =
      this.config.get<number>('WHATSAPP_ANTI_BAN_DAILY_LIMIT') ??
      ANTI_BAN_DAILY_LIMIT;

    this.activeHours = {
      startHour:
        this.config.get<number>('WHATSAPP_ACTIVE_HOURS_START') ??
        DEFAULT_ACTIVE_HOURS.startHour,
      endHour:
        this.config.get<number>('WHATSAPP_ACTIVE_HOURS_END') ??
        DEFAULT_ACTIVE_HOURS.endHour,
      timezone:
        this.config.get<string>('WHATSAPP_ACTIVE_HOURS_TIMEZONE') ??
        DEFAULT_ACTIVE_HOURS.timezone,
    };
  }

  onModuleInit() {
    const isWorkerDisabled =
      this.config.get<string>('WHATSAPP_DISPATCHER_ENABLED') === 'false';
    const isDev = this.config.get<string>('NODE_ENV') === 'development';
    const enableLocal = this.config.get<string>('ENABLE_LOCAL_WHATSAPP') === 'true';

    if (isWorkerDisabled || (isDev && !enableLocal)) {
      this.logger.warn(
        'WhatsApp dispatcher background polling loop disabled in local development. (Set ENABLE_LOCAL_WHATSAPP=true to enable locally)',
      );
      return;
    }

    this.isRunning = true;
    this.logger.log(
      `WhatsApp dispatcher active: ${this.hourlyLimit}/hr, ${this.dailyLimit}/day, hours ${this.activeHours.startHour}:00–${this.activeHours.endHour}:00 (${this.activeHours.timezone})`,
    );

    this.pollTimeout = setTimeout(() => this.poll(), 3_000);
  }

  onModuleDestroy() {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  formatToWhatsAppInternational(phone: string): string {
    return formatToWhatsAppInternational(phone);
  }

  buildMessageBody(notification: QueueNotification): string {
    return buildMessageBody(notification);
  }

  async enqueueNotification(notification: QueueNotification): Promise<unknown> {
    return this.queueManager.enqueueNotification(notification);
  }

  async enqueueNotificationsBatch(notifications: QueueNotification[]): Promise<number> {
    return this.queueManager.enqueueNotificationsBatch(notifications);
  }

  // --- Queue Observability and Management Delegations ---
  async markDelivered(providerMessageId: string): Promise<void> {
    return this.queueManager.markDelivered(providerMessageId);
  }

  async getQueue(page = 1, limit = 20) {
    return this.queueManager.getQueue(page, limit);
  }

  async getFailed(page = 1, limit = 20) {
    return this.queueManager.getFailed(page, limit);
  }

  async getStats() {
    return this.queueManager.getStats();
  }

  async retryMessage(id: string) {
    return this.queueManager.retryMessage(id, () => this.triggerDispatch());
  }

  async retryAllFailed() {
    return this.queueManager.retryAllFailed(() => this.triggerDispatch());
  }

  async deleteMessage(id: string) {
    return this.queueManager.deleteMessage(id);
  }

  async clearAllFailed() {
    return this.queueManager.clearAllFailed();
  }

  async clearQueue() {
    return this.queueManager.clearQueue();
  }

  async forceDispatchNow() {
    this.forceImmediateActive = true;
    await this.prisma.whatsAppMessageLog.updateMany({
      where: { status: WhatsAppStatus.QUEUED },
      data: { scheduledFor: new Date() },
    });
    this.triggerDispatch();
    return { success: true };
  }

  triggerDispatch(): void {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = setTimeout(() => this.poll(), 500);
    }
  }

  // --- Dispatch Worker Loop ---
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
        const outboundBody = candidate.messageBody;
        const result = await this.whatsapp.sendTrackedProtectedMessage(
          candidate.recipientPhone,
          outboundBody,
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
      } else if (!this.isWithinActiveHours() && !this.forceImmediateActive) {
        nextDelay = 5 * 60_000;
      } else if (await this.isQuotaExhausted()) {
        if (await this.isDailyQuotaExhausted()) await this.deferQueuedMessagesToTomorrow();
        nextDelay = 3 * 60_000;
      } else if (await this.processNextQueuedMessage()) {
        nextDelay = 0;
      } else {
        this.forceImmediateActive = false;
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
        sentAt: { gte: this.queueManager.getCairoMidnight() },
      },
    });
  }

  private async deferQueuedMessagesToTomorrow(): Promise<void> {
    await this.prisma.whatsAppMessageLog.updateMany({
      where: { status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.FAILED] } },
      data: { scheduledFor: new Date(Date.now() + 8 * 60 * 60 * 1000) },
    });
  }

  private isWithinActiveHours(): boolean {
    const now = new Date();
    const cairoHourStr = now.toLocaleTimeString('en-US', {
      timeZone: this.activeHours.timezone,
      hour12: false,
      hour: 'numeric',
    });
    const cairoHour = parseInt(cairoHourStr, 10);
    return (
      cairoHour >= this.activeHours.startHour &&
      cairoHour < this.activeHours.endHour
    );
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
