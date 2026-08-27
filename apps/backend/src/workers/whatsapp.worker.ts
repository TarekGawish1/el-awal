import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/database/prisma.service';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service';
import { NotificationStatus, NotificationType } from '@prisma/client';
import {
  formatAbsenceMessage,
  formatSessionReminderMessage,
  formatExamFailedMessage,
  formatPaymentMessage,
  formatTeacherAgendaMessage,
  formatGenericMessage,
} from '../utils/spintax';

/**
 * WhatsAppWorker — Anti-ban hardened PostgreSQL-backed message queue processor.
 *
 * Anti-ban protections implemented:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  1. Active hours gate          08:00 – 21:00 Cairo only                │
 * │  2. Hourly rate limit          ≤ 25 messages / hour                    │
 * │  3. Daily volume ceiling       ≤ MAX_DAILY_MESSAGES (default 80)       │
 * │  4. Randomized inter-message cooldown  5,000 – 9,000 ms               │
 * │  5. Human typing simulation    via sendProtectedMessage()              │
 * │  6. Contact existence check    via sock.onWhatsApp()                   │
 * │  7. Template spintax           via src/utils/spintax.ts               │
 * │  8. Deferred scheduling        quota-exceeded → reschedule +1 day 08h  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Job lifecycle: PENDING → PROCESSING → SENT | FAILED | PENDING (deferred)
 *
 * Atomicity: The claim from PENDING → PROCESSING is done inside a
 * Prisma $transaction to prevent duplicate processing.
 */
@Injectable()
export class WhatsAppWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppWorker.name);
  private isRunning = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Max messages allowed per rolling 60-minute window */
  private readonly HOURLY_LIMIT: number;
  /** Max messages allowed per calendar day */
  private readonly DAILY_LIMIT: number;
  /** Active window start hour (Cairo local, 24h) */
  private readonly ACTIVE_HOUR_START = 8;
  /** Active window end hour (Cairo local, 24h) */
  private readonly ACTIVE_HOUR_END = 21;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {
    this.HOURLY_LIMIT = parseInt(
      this.config.get<string>('WHATSAPP_HOURLY_LIMIT', '25'),
      10,
    );
    this.DAILY_LIMIT = parseInt(
      this.config.get<string>('WHATSAPP_DAILY_LIMIT', '80'),
      10,
    );
  }

  onModuleInit() {
    this.logger.log(
      `🚀 WhatsApp Queue Worker starting (hourly≤${this.HOURLY_LIMIT}, daily≤${this.DAILY_LIMIT})...`,
    );
    this.isRunning = true;
    // Start with a delay to allow the WA socket to fully initialize
    this.pollTimeout = setTimeout(() => this.poll(), 10_000);
  }

  onModuleDestroy() {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    this.logger.log('🛑 WhatsApp Queue Worker stopped');
  }

  // ─── Core Polling Loop ──────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    let nextPollDelay = this.randomBetween(5_000, 9_000); // default inter-message cooldown

    try {
      // ── Gate 1: Active hours check ──────────────────────────────────────────
      if (!this.isWithinActiveHours()) {
        this.logger.debug(
          `[Worker] Outside active hours (${this.ACTIVE_HOUR_START}:00–${this.ACTIVE_HOUR_END}:00 Cairo). Sleeping 5 min.`,
        );
        nextPollDelay = 5 * 60 * 1000; // check again in 5 minutes
      } else {
        // ── Gate 2: Rate limit checks ──────────────────────────────────────────
        const [hourlySent, dailySent] = await Promise.all([
          this.countSentInLastHour(),
          this.countSentToday(),
        ]);

        if (dailySent >= this.DAILY_LIMIT) {
          this.logger.warn(
            `[Worker] Daily limit reached (${dailySent}/${this.DAILY_LIMIT}). Deferring all PENDING to tomorrow.`,
          );
          await this.deferAllPendingToTomorrow();
          nextPollDelay = 10 * 60 * 1000; // recheck in 10 minutes
        } else if (hourlySent >= this.HOURLY_LIMIT) {
          this.logger.warn(
            `[Worker] Hourly limit reached (${hourlySent}/${this.HOURLY_LIMIT}). Cooling down for 3 minutes.`,
          );
          nextPollDelay = 3 * 60 * 1000;
        } else {
          // ── Process next job ────────────────────────────────────────────────
          const processed = await this.processNextJob();
          if (!processed) {
            // Queue empty — slow poll interval
            nextPollDelay = this.randomBetween(12_000, 18_000);
          }
          // else: processed a job → use randomized inter-message cooldown
        }
      }
    } catch (error) {
      this.logger.error('[Worker] Unexpected error in poll cycle', error);
      nextPollDelay = 15_000;
    } finally {
      if (this.isRunning) {
        this.pollTimeout = setTimeout(() => this.poll(), nextPollDelay);
      }
    }
  }

  // ─── Job Processing ─────────────────────────────────────────────────────────

  /**
   * Claims and processes the next PENDING notification.
   * @returns true if a job was processed, false if queue was empty
   */
  private async processNextJob(): Promise<boolean> {
    // Atomically claim one PENDING notification
    const notification = await this.prisma.$transaction(async (tx) => {
      const pending = await tx.notification.findFirst({
        where: {
          whatsappStatus: NotificationStatus.PENDING,
          scheduledFor: { lte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!pending) return null;

      // Mark as PROCESSING to prevent duplicate sends
      return tx.notification.update({
        where: { id: pending.id },
        data: { whatsappStatus: NotificationStatus.PROCESSING },
      });
    });

    if (!notification) {
      return false; // queue empty
    }

    this.logger.log(
      `📤 Processing WhatsApp job [id=${notification.id}] type=${notification.type}`,
    );

    // Extract phone from the notification data payload
    const data = notification.data as Record<string, unknown> | null;
    const phone = data?.phone as string | undefined;

    if (!phone) {
      await this.markFailed(notification.id, 'Missing phone number in notification.data');
      return true;
    }

    // ── Build varied message text via spintax ───────────────────────────────
    const messageText = this.buildSpintaxMessage(notification, data);

    // ── Dispatch via protected send (typing simulation + contact check) ─────
    const result = await this.whatsapp.sendProtectedMessage(phone, messageText);

    switch (result) {
      case 'sent':
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { whatsappStatus: NotificationStatus.SENT },
        });
        this.logger.log(`✅ WhatsApp job completed [id=${notification.id}]`);
        break;

      case 'not_registered':
        await this.markFailed(
          notification.id,
          `Phone ${phone} is not registered on WhatsApp`,
        );
        break;

      case 'not_connected':
        // Put back to PENDING — socket might reconnect soon
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { whatsappStatus: NotificationStatus.PENDING },
        });
        this.logger.warn(
          `[Worker] Socket not connected — re-queued job [id=${notification.id}]`,
        );
        break;

      case 'error':
      default:
        await this.markFailed(notification.id, 'sendProtectedMessage returned error');
        break;
    }

    return true;
  }

  // ─── Spintax Message Builder ────────────────────────────────────────────────

  /**
   * Routes the notification to the appropriate spintax template based on type.
   * Falls back to a generic varied format for unconfigured types.
   */
  private buildSpintaxMessage(
    notification: { type: string; notificationType?: string | null; title: string; message: string },
    data: Record<string, unknown> | null,
  ): string {
    const notifType = (notification.notificationType as NotificationType | null) ?? null;

    switch (notifType) {
      case NotificationType.ABSENCE_ALERT_PARENT:
        return formatAbsenceMessage(
          (data?.studentName as string) || 'الطالب',
          (data?.groupName as string) || 'الحصة',
          data?.date as string | undefined,
        );

      case NotificationType.SESSION_REMINDER_STUDENT:
        return formatSessionReminderMessage(
          (data?.studentName as string) || 'الطالب',
          (data?.groupName as string) || 'الحصة',
          (data?.startTime as string) || '',
        );

      case NotificationType.EXAM_FAILED_ALERT_PARENT:
        return formatExamFailedMessage(
          (data?.studentName as string) || 'الطالب',
          (data?.examTitle as string) || 'الاختبار',
          Number(data?.score ?? 0),
          Number(data?.total ?? 100),
          Number(data?.passing ?? 50),
        );

      case NotificationType.TEACHER_DAILY_SCHEDULE:
        return formatTeacherAgendaMessage(
          (data?.teacherName as string) || 'الأستاذ',
          (data?.date as string) || new Date().toLocaleDateString('ar-EG'),
          (data?.sessions as string[]) || [notification.message],
        );

      default: {
        // Generic spintax with title + body variation
        const phone = data?.phone as string | undefined;
        const paymentAmount = data?.amount as number | undefined;

        if (notification.type === 'PAYMENT_RECEIVED' && paymentAmount) {
          return formatPaymentMessage(
            (data?.studentName as string) || 'الطالب',
            paymentAmount,
            Number(data?.month ?? new Date().getMonth() + 1),
            Number(data?.year ?? new Date().getFullYear()),
          );
        }

        return formatGenericMessage(notification.title, notification.message);
      }
    }
  }

  // ─── Rate Limit Helpers ─────────────────────────────────────────────────────

  /** Count messages sent in the last rolling 60-minute window. */
  private async countSentInLastHour(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.prisma.notification.count({
      where: {
        whatsappStatus: NotificationStatus.SENT,
        updatedAt: { gte: oneHourAgo },
      },
    });
  }

  /** Count messages sent since Cairo midnight today. */
  private async countSentToday(): Promise<number> {
    const cairoMidnight = this.getCairoMidnight();
    return this.prisma.notification.count({
      where: {
        whatsappStatus: NotificationStatus.SENT,
        updatedAt: { gte: cairoMidnight },
      },
    });
  }

  /**
   * Defers all currently PENDING notifications to tomorrow at 08:00 Cairo.
   * Called when the daily limit is exhausted.
   */
  private async deferAllPendingToTomorrow(): Promise<void> {
    const tomorrow8am = this.getTomorrowActiveStart();
    const result = await this.prisma.notification.updateMany({
      where: { whatsappStatus: NotificationStatus.PENDING },
      data: { scheduledFor: tomorrow8am },
    });
    this.logger.log(
      `📅 Deferred ${result.count} PENDING WhatsApp notifications to ${tomorrow8am.toISOString()}`,
    );
  }

  // ─── Time Helpers ────────────────────────────────────────────────────────────

  /**
   * Checks if the current Cairo time is within the allowed active window.
   * Cairo is UTC+2 (standard) / UTC+3 (summer). We use a UTC offset approximation.
   */
  private isWithinActiveHours(): boolean {
    const cairoHour = this.getCairoHour();
    return cairoHour >= this.ACTIVE_HOUR_START && cairoHour < this.ACTIVE_HOUR_END;
  }

  /** Returns the current hour in Cairo time (0–23). */
  private getCairoHour(): number {
    const now = new Date();
    // Cairo is UTC+2 in winter, UTC+3 in summer — use Intl for accuracy
    const cairoTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      hour12: false,
    });
    return parseInt(cairoTimeStr, 10);
  }

  /** Returns a Date object representing midnight (00:00) Cairo time today. */
  private getCairoMidnight(): Date {
    const now = new Date();
    const cairoDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }); // YYYY-MM-DD
    // Midnight Cairo = cairoDateStr T00:00:00 in Cairo tz
    return new Date(`${cairoDateStr}T00:00:00+02:00`);
  }

  /** Returns a Date representing tomorrow at 08:00 Cairo. */
  private getTomorrowActiveStart(): Date {
    const now = new Date();
    const cairoDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const [y, m, d] = cairoDateStr.split('-').map(Number);
    const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
    const dateStr = tomorrow.toISOString().split('T')[0];
    return new Date(`${dateStr}T08:00:00+02:00`);
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async markFailed(notificationId: string, error: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        whatsappStatus: NotificationStatus.FAILED,
        whatsappError: error,
      },
    });
    this.logger.warn(
      `❌ WhatsApp job failed [id=${notificationId}]: ${error}`,
    );
  }
}
