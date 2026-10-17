import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  NotificationChannel,
  NotificationType,
  UserRole,
  WhatsAppStatus,
} from '@prisma/client';
import { NotificationSettingsService } from '../../notifications/services/notification-settings.service';
import {
  QueueNotification,
  formatToWhatsAppInternational,
  buildMessageBody,
} from './whatsapp-formatter.util';

@Injectable()
export class WhatsAppQueueManagerService {
  private readonly logger = new Logger(WhatsAppQueueManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly settingsService?: NotificationSettingsService,
  ) {}

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  getCairoMidnight(): Date {
    const cairoDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    const [y, m, d] = cairoDateStr.split('-').map(Number);
    const refDate = new Date(`${cairoDateStr}T12:00:00Z`);
    const cairoHourStr = refDate.toLocaleTimeString('en-US', {
      timeZone: 'Africa/Cairo',
      hour12: false,
      hour: 'numeric',
    });
    const diffHours = parseInt(cairoHourStr, 10) - 12;
    return new Date(Date.UTC(y, m - 1, d, 0 - diffHours, 0, 0, 0));
  }

  async enqueueNotification(notification: QueueNotification): Promise<unknown> {
    const notifType = notification.notificationType ?? notification.type;
    if (this.settingsService) {
      const isAllowed = await this.settingsService.isChannelAllowed(
        NotificationChannel.WHATSAPP,
        notifType,
      );

      if (!isAllowed) {
        this.logger.debug(
          `Skipping WhatsApp enqueue for ${notifType}: channel suppressed by notification settings`,
        );
        return null;
      }
    }

    if (
      notification.notificationType === NotificationType.SESSION_REMINDER_STUDENT ||
      notification.notificationType === NotificationType.TEACHER_SESSION_REMINDER ||
      notification.type === 'SESSION_REMINDER_STUDENT' ||
      notification.type === 'TEACHER_SESSION_REMINDER'
    ) {
      this.logger.debug(`Skipping WhatsApp message for session reminder ${notifType}`);
      return null;
    }

    const data = notification.data as Record<string, unknown> | null;
    const rawBody = buildMessageBody(notification);

    const rawPhone = data?.phone;
    if (typeof rawPhone !== 'string' || !rawPhone.trim()) {
      this.logger.warn(`Recording permanent WhatsApp failure for ${notification.type}: recipient phone is missing`);
      return this.prisma.whatsAppMessageLog.create({
        data: {
          recipientPhone: '',
          recipientName: notification.recipient.fullName,
          recipientRole: notification.recipient.role,
          templateType: notification.notificationType ?? notification.type,
          messageBody: rawBody,
          status: WhatsAppStatus.PERMANENT_FAIL,
          failureReason: 'Recipient phone is missing',
          scheduledFor: notification.scheduledFor,
        },
      });
    }

    let recipientPhone: string;
    try {
      recipientPhone = formatToWhatsAppInternational(rawPhone);
    } catch (error) {
      return this.prisma.whatsAppMessageLog.create({
        data: {
          recipientPhone: rawPhone.replace(/\D/g, ''),
          recipientName: notification.recipient.fullName,
          recipientRole: notification.recipient.role,
          templateType: notification.notificationType ?? notification.type,
          messageBody: rawBody,
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
        messageBody: rawBody,
        status: WhatsAppStatus.QUEUED,
        scheduledFor: notification.scheduledFor,
      },
    });
  }

  async enqueueNotificationsBatch(notifications: QueueNotification[]): Promise<number> {
    if (!notifications || notifications.length === 0) return 0;

    const firstType = notifications[0].notificationType ?? notifications[0].type;
    if (this.settingsService) {
      const isAllowed = await this.settingsService.isChannelAllowed(
        NotificationChannel.WHATSAPP,
        firstType,
      );

      if (!isAllowed) {
        this.logger.debug('Skipping batch WhatsApp enqueue: suppressed by notification settings');
        return 0;
      }
    }

    const logsData: Array<{
      recipientPhone: string;
      recipientName: string;
      recipientRole: UserRole;
      templateType: string;
      messageBody: string;
      status: WhatsAppStatus;
      failureReason?: string | null;
      scheduledFor: Date;
    }> = [];

    for (const notification of notifications) {
      if (
        notification.notificationType === NotificationType.SESSION_REMINDER_STUDENT ||
        notification.notificationType === NotificationType.TEACHER_SESSION_REMINDER ||
        notification.type === 'SESSION_REMINDER_STUDENT' ||
        notification.type === 'TEACHER_SESSION_REMINDER'
      ) {
        continue;
      }

      const data = notification.data as Record<string, unknown> | null;
      const rawBody = buildMessageBody(notification);
      const rawPhone = data?.phone;

      if (typeof rawPhone !== 'string' || !rawPhone.trim()) {
        logsData.push({
          recipientPhone: '',
          recipientName: notification.recipient.fullName,
          recipientRole: notification.recipient.role,
          templateType: notification.notificationType ?? notification.type,
          messageBody: rawBody,
          status: WhatsAppStatus.PERMANENT_FAIL,
          failureReason: 'Recipient phone is missing',
          scheduledFor: notification.scheduledFor,
        });
        continue;
      }

      try {
        const recipientPhone = formatToWhatsAppInternational(rawPhone);
        logsData.push({
          recipientPhone,
          recipientName: notification.recipient.fullName,
          recipientRole: notification.recipient.role,
          templateType: notification.notificationType ?? notification.type,
          messageBody: rawBody,
          status: WhatsAppStatus.QUEUED,
          scheduledFor: notification.scheduledFor,
        });
      } catch (error) {
        logsData.push({
          recipientPhone: rawPhone.replace(/\D/g, ''),
          recipientName: notification.recipient.fullName,
          recipientRole: notification.recipient.role,
          templateType: notification.notificationType ?? notification.type,
          messageBody: rawBody,
          status: WhatsAppStatus.PERMANENT_FAIL,
          failureReason: this.errorMessage(error),
          scheduledFor: notification.scheduledFor,
        });
      }
    }

    if (logsData.length === 0) return 0;

    await this.prisma.whatsAppMessageLog.createMany({ data: logsData });
    return logsData.length;
  }

  async markDelivered(providerMessageId: string): Promise<void> {
    await this.prisma.whatsAppMessageLog.updateMany({
      where: { providerMessageId, status: WhatsAppStatus.SENT },
      data: { status: WhatsAppStatus.DELIVERED, deliveredAt: new Date() },
    });
  }

  async getQueue(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.whatsAppMessageLog.findMany({
        where: { status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.SENDING] } },
        orderBy: { scheduledFor: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppMessageLog.count({
        where: { status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.SENDING] } },
      }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFailed(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.whatsAppMessageLog.findMany({
        where: { status: { in: [WhatsAppStatus.FAILED, WhatsAppStatus.PERMANENT_FAIL] } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppMessageLog.count({
        where: { status: { in: [WhatsAppStatus.FAILED, WhatsAppStatus.PERMANENT_FAIL] } },
      }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats() {
    const cairoMidnight = this.getCairoMidnight();

    const sentTodayPromise = this.prisma.whatsAppMessageLog.count({
      where: {
        status: { in: [WhatsAppStatus.SENT, WhatsAppStatus.DELIVERED] },
        sentAt: { gte: cairoMidnight },
      },
    });

    const statusCountsPromise = (async () => {
      try {
        if (typeof this.prisma.whatsAppMessageLog.groupBy === 'function') {
          const grouped = await this.prisma.whatsAppMessageLog.groupBy({
            by: ['status'],
            _count: { _all: true },
          });
          const countMap = new Map<WhatsAppStatus, number>();
          for (const item of grouped) {
            countMap.set(item.status, item._count._all);
          }
          const getCount = (...statuses: WhatsAppStatus[]) =>
            statuses.reduce((sum, s) => sum + (countMap.get(s) || 0), 0);

          return {
            queuedCount: getCount(WhatsAppStatus.QUEUED, WhatsAppStatus.SENDING),
            failedCount: getCount(WhatsAppStatus.FAILED, WhatsAppStatus.PERMANENT_FAIL),
            totalSent: getCount(WhatsAppStatus.SENT, WhatsAppStatus.DELIVERED),
            totalDelivered: getCount(WhatsAppStatus.DELIVERED),
          };
        }
      } catch {
        // Fallback for mock environments
      }

      const [queuedCount, failedCount, totalSent, totalDelivered] = await Promise.all([
        this.prisma.whatsAppMessageLog.count({
          where: { status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.SENDING] } },
        }),
        this.prisma.whatsAppMessageLog.count({
          where: { status: { in: [WhatsAppStatus.FAILED, WhatsAppStatus.PERMANENT_FAIL] } },
        }),
        this.prisma.whatsAppMessageLog.count({
          where: { status: { in: [WhatsAppStatus.SENT, WhatsAppStatus.DELIVERED] } },
        }),
        this.prisma.whatsAppMessageLog.count({
          where: { status: WhatsAppStatus.DELIVERED },
        }),
      ]);
      return { queuedCount, failedCount, totalSent, totalDelivered };
    })();

    const [sentToday, statusCounts] = await Promise.all([sentTodayPromise, statusCountsPromise]);

    return {
      sentToday,
      queuedCount: statusCounts.queuedCount,
      failedCount: statusCounts.failedCount,
      totalSent: statusCounts.totalSent,
      totalDelivered: statusCounts.totalDelivered,
    };
  }

  async retryMessage(id: string, onTrigger?: () => void) {
    const record = await this.prisma.whatsAppMessageLog.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`WhatsApp message log [${id}] not found`);
    }

    const updated = await this.prisma.whatsAppMessageLog.update({
      where: { id },
      data: {
        status: WhatsAppStatus.QUEUED,
        retryCount: 0,
        failureReason: null,
        scheduledFor: new Date(),
      },
    });

    onTrigger?.();
    return updated;
  }

  async retryAllFailed(onTrigger?: () => void) {
    const result = await this.prisma.whatsAppMessageLog.updateMany({
      where: { status: { in: [WhatsAppStatus.FAILED, WhatsAppStatus.PERMANENT_FAIL] } },
      data: {
        status: WhatsAppStatus.QUEUED,
        retryCount: 0,
        failureReason: null,
        scheduledFor: new Date(),
      },
    });

    onTrigger?.();
    return { count: result.count };
  }

  async deleteMessage(id: string) {
    const record = await this.prisma.whatsAppMessageLog.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`WhatsApp message [${id}] not found`);
    }

    await this.prisma.whatsAppMessageLog.delete({ where: { id } });
    return { success: true, id };
  }

  async clearAllFailed() {
    const result = await this.prisma.whatsAppMessageLog.deleteMany({
      where: { status: { in: [WhatsAppStatus.FAILED, WhatsAppStatus.PERMANENT_FAIL] } },
    });
    return { count: result.count };
  }

  async clearQueue() {
    const result = await this.prisma.whatsAppMessageLog.deleteMany({
      where: { status: { in: [WhatsAppStatus.QUEUED, WhatsAppStatus.SENDING] } },
    });
    return { count: result.count };
  }
}
