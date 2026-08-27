import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service';
import { NotificationStatus } from '@prisma/client';

/**
 * WhatsAppWorker — PostgreSQL-backed message queue processor.
 *
 * This worker polls the `notifications` table every 3 seconds for
 * messages with `whatsappStatus = 'PENDING'` and sends them one-by-one
 * via WhatsAppService. The 3-second delay acts as a built-in rate limiter
 * to prevent WhatsApp spam bans without requiring Redis or BullMQ.
 *
 * Job lifecycle: PENDING → PROCESSING → SENT | FAILED
 *
 * Atomicity: The claim from PENDING → PROCESSING is done inside a
 * Prisma $transaction to prevent duplicate processing if multiple dynos
 * were ever running (currently single-dyno Heroku Eco).
 */
@Injectable()
export class WhatsAppWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppWorker.name);
  private isRunning = false;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  onModuleInit() {
    this.logger.log('🚀 WhatsApp Queue Worker starting...');
    this.isRunning = true;
    // Start with a small delay to allow the WA socket to initialize
    this.pollTimeout = setTimeout(() => this.poll(), 8_000);
  }

  onModuleDestroy() {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    this.logger.log('🛑 WhatsApp Queue Worker stopped');
  }

  /**
   * Core polling loop:
   * 1. Atomically claim the next PENDING job → PROCESSING
   * 2. Extract phone from notification.data
   * 3. Send via WhatsApp
   * 4. Mark SENT or FAILED
   * 5. Wait 3000ms and repeat
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.processNextJob();
    } catch (error) {
      this.logger.error('Unexpected error in WhatsApp worker poll cycle', error);
    } finally {
      // Always schedule next poll regardless of success/failure
      if (this.isRunning) {
        this.pollTimeout = setTimeout(() => this.poll(), 3_000);
      }
    }
  }

  private async processNextJob(): Promise<void> {
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
      // Queue is empty — nothing to do this cycle
      return;
    }

    this.logger.log(
      `📤 Processing WhatsApp job [notification=${notification.id}] type=${notification.type}`,
    );

    // Extract phone from the notification data payload
    const data = notification.data as Record<string, unknown> | null;
    const phone = data?.phone as string | undefined;

    if (!phone) {
      await this.markFailed(
        notification.id,
        'Missing phone number in notification.data',
      );
      return;
    }

    // Build message text from title + message
    const messageText = `${notification.title}\n\n${notification.message}`;

    const success = await this.whatsapp.sendMessage(phone, messageText);

    if (success) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { whatsappStatus: NotificationStatus.SENT },
      });
      this.logger.log(`✅ WhatsApp job completed [notification=${notification.id}]`);
    } else {
      await this.markFailed(notification.id, 'WhatsApp socket returned false');
    }
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
      `❌ WhatsApp job failed [notification=${notificationId}]: ${error}`,
    );
  }
}
