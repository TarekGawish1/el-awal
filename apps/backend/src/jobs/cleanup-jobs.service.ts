import { Injectable, Logger, Optional } from '@nestjs/common';
import { NotificationStatus, WhatsAppStatus } from '@prisma/client';
import { StorageCleanupService } from '../integrations/storage/storage-cleanup.service';
import { PrismaService } from '../core/database/prisma.service';
import {
  redactCredentialMessageBody,
  hasUnredactedCredentials,
  redactNotificationData,
} from '../modules/whatsapp/services/whatsapp-credential-redactor.util';

@Injectable()
export class CleanupJobsService {
  private readonly logger = new Logger(CleanupJobsService.name);

  constructor(
    @Optional() private readonly storageCleanup?: StorageCleanupService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  /**
   * Self-ping the app's health endpoint to prevent Heroku Eco dyno sleep.
   */
  runKeepAlivePing(): void {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '';
    if (!appUrl) {
      return;
    }

    try {
      const targetUrl = `${appUrl.replace(/\/$/, '')}/api/health`;
      const lib = targetUrl.startsWith('https') ? require('https') : require('http');
      const req = lib.get(targetUrl, (res: any) => {
        this.logger.debug(`[KeepAlive] Ping ${targetUrl} → HTTP ${res.statusCode}`);
        res.resume();
      });
      req.on('error', (err: Error) => {
        this.logger.warn(`[KeepAlive] Ping failed: ${err.message}`);
      });
      req.setTimeout(10_000, () => {
        req.destroy();
        this.logger.warn('[KeepAlive] Ping timed out after 10s');
      });
    } catch (err) {
      this.logger.warn(`[KeepAlive] Unexpected ping error: ${err}`);
    }
  }

  /**
   * Daily Cloudflare R2 orphan storage reconciliation.
   */
  async runStorageOrphanCleanup(): Promise<void> {
    if (!this.storageCleanup) {
      this.logger.warn('StorageCleanupService is not available; skipping orphan cleanup.');
      return;
    }
    this.logger.log('🧹 [StorageCleanup] Running scheduled daily Cloudflare R2 orphan scan...');
    try {
      const report = await this.storageCleanup.scanAndCleanOrphans({
        dryRun: false,
        gracePeriodHours: 24,
      });
      const freedMb = (report.freedSizeBytes / (1024 * 1024)).toFixed(2);
      this.logger.log(
        `🧹 [StorageCleanup] Daily cleanup completed: ${report.deletedCount} orphans purged, ${freedMb} MB freed (total R2 objects: ${report.totalR2Objects}, protected recent: ${report.recentProtectedCount}) in ${report.durationMs}ms`,
      );
    } catch (err: any) {
      this.logger.error(`❌ [StorageCleanup] Daily cleanup failed: ${err.message}`, err.stack);
    }
  }

  /**
   * Safe, idempotent cleanup for expired plaintext student temporary access PINs (tempAccessPin).
   * Operates only on records where pinExpiresAt <= cutoffDate.
   * Modifies ONLY student_profiles (never touches users.password_hash).
   * Strictly observable: logs count and duration only, never logs PII or credentials.
   */
  async cleanupExpiredTemporaryPins(cutoffDate: Date = new Date()): Promise<{ purgedCount: number; durationMs: number }> {
    if (!this.prisma) {
      this.logger.warn('PrismaService is not available; skipping PIN cleanup.');
      return { purgedCount: 0, durationMs: 0 };
    }

    const startTime = Date.now();
    try {
      const result = await this.prisma.studentProfile.updateMany({
        where: {
          tempAccessPin: { not: null },
          OR: [
            { pinExpiresAt: { lte: cutoffDate } },
            { pinExpiresAt: null },
          ],
        },
        data: {
          tempAccessPin: null,
          pinExpiresAt: null,
        },
      });

      const durationMs = Date.now() - startTime;
      if (result.count > 0) {
        this.logger.log(
          `🔒 [PinCleanup] Purged ${result.count} expired student temporary access PIN(s) in ${durationMs}ms`,
        );
      } else {
        this.logger.debug(
          `🔒 [PinCleanup] No expired student temporary access PINs found to purge (${durationMs}ms)`,
        );
      }
      return { purgedCount: result.count, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `❌ [PinCleanup] Failed to purge expired temporary access PINs (${durationMs}ms): ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  /**
   * Safe, idempotent redaction of stored plaintext credentials in delivered,
   * terminal sent (>48h), and expired failed (>7d) WhatsApp messages and notifications.
   *
   * Retention Policy:
   * 1. Queued & Sending: Payload strictly preserved for worker dispatch and active retries.
   * 2. Delivered: Redacted upon confirmed delivery or hourly scan.
   * 3. Terminal Sent (>48h): Redacted if delivery receipts are never returned by the provider.
   * 4. Failed / Permanent Fail (>7d): Redacted after 7-day operational investigation/retry window.
   * 5. Notifications: In-app record, title, unread state, timestamps preserved; secrets in message
   *    and data sanitized.
   */
  async cleanupDeliveredCredentialMessages(referenceDate: Date = new Date()): Promise<{
    redactedWhatsAppLogsCount: number;
    redactedNotificationsCount: number;
    durationMs: number;
  }> {
    if (!this.prisma) {
      this.logger.warn('PrismaService is not available; skipping credential redaction.');
      return { redactedWhatsAppLogsCount: 0, redactedNotificationsCount: 0, durationMs: 0 };
    }

    const startTime = Date.now();
    let redactedWhatsAppLogsCount = 0;
    let redactedNotificationsCount = 0;

    const sentCutoffDate = new Date(referenceDate.getTime() - 48 * 60 * 60 * 1000);
    const failedCutoffDate = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const notificationCutoffDate = new Date(referenceDate.getTime() - 48 * 60 * 60 * 1000);

    try {
      // 1. Redact WhatsApp message logs in terminal/delivered states
      const logs = await this.prisma.whatsAppMessageLog.findMany({
        where: {
          OR: [
            { status: WhatsAppStatus.DELIVERED },
            {
              status: WhatsAppStatus.SENT,
              sentAt: { lte: sentCutoffDate },
            },
            {
              status: { in: [WhatsAppStatus.FAILED, WhatsAppStatus.PERMANENT_FAIL] },
              updatedAt: { lte: failedCutoffDate },
            },
          ],
        },
        select: {
          id: true,
          messageBody: true,
          status: true,
          failureReason: true,
        },
      });

      for (const log of logs) {
        if (hasUnredactedCredentials(log.messageBody)) {
          const redactedBody = redactCredentialMessageBody(log.messageBody);
          let failureReason = log.failureReason;
          if (
            (log.status === WhatsAppStatus.FAILED || log.status === WhatsAppStatus.PERMANENT_FAIL) &&
            !failureReason?.includes('فترة الاحتفاظ')
          ) {
            failureReason = failureReason
              ? `${failureReason} (تم مسح البيانات السرية لانتهاء فترة الاحتفاظ 7 أيام)`
              : 'تم مسح البيانات السرية لانتهاء فترة الاحتفاظ 7 أيام';
          }

          await this.prisma.whatsAppMessageLog.update({
            where: { id: log.id },
            data: {
              messageBody: redactedBody,
              failureReason,
            },
          });
          redactedWhatsAppLogsCount++;
        }
      }

      // 2. Redact Notification records
      const notifications = await this.prisma.notification.findMany({
        where: {
          OR: [
            { whatsappStatus: { in: [NotificationStatus.SENT, NotificationStatus.READ] } },
            { createdAt: { lte: notificationCutoffDate } },
          ],
        },
        select: {
          id: true,
          message: true,
          data: true,
        },
      });

      for (const notif of notifications) {
        const notifData = notif.data as Record<string, unknown> | null;
        const hasDataSecret = Boolean(
          notifData &&
            (notifData.studentPassword ||
              notifData.parentPassword ||
              (typeof notifData.directLoginUrl === 'string' && notifData.directLoginUrl.includes('pass='))),
        );
        const hasMessageSecret = hasUnredactedCredentials(notif.message);

        if (hasDataSecret || hasMessageSecret) {
          const redactedMessage = hasMessageSecret
            ? redactCredentialMessageBody(notif.message)
            : notif.message;
          const redactedData = hasDataSecret
            ? redactNotificationData(notifData)
            : notifData;

          await this.prisma.notification.update({
            where: { id: notif.id },
            data: {
              message: redactedMessage,
              data: (redactedData ?? undefined) as any,
            },
          });
          redactedNotificationsCount++;
        }
      }

      const durationMs = Date.now() - startTime;
      if (redactedWhatsAppLogsCount > 0 || redactedNotificationsCount > 0) {
        this.logger.log(
          `🔒 [CredentialRedaction] Redacted ${redactedWhatsAppLogsCount} WhatsApp message log(s) and ${redactedNotificationsCount} notification(s) in ${durationMs}ms`,
        );
      } else {
        this.logger.debug(
          `🔒 [CredentialRedaction] No delivered or expired messages required redaction (${durationMs}ms)`,
        );
      }

      return { redactedWhatsAppLogsCount, redactedNotificationsCount, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `❌ [CredentialRedaction] Failed during credential redaction (${durationMs}ms): ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
