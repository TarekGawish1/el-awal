import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { WebPushService, PushPayload } from '../../../services/webpush.service';
import { WebPushDispatcherService } from './webpush-dispatcher.service';
import { WhatsAppDispatcherService } from '../../whatsapp/services/whatsapp-dispatcher.service';
import { NotificationSettingsService } from './notification-settings.service';

export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  referenceEntityId?: string;
}

export interface SendNotificationDto {
  recipientId: string;
  notificationType: NotificationType;
  type: string;
  title: string;
  body: string;
  channels: NotificationChannel[];
  data?: Record<string, unknown>;
  referenceEntityId?: string;
  scheduledFor?: Date;
}

export interface DispatchNotificationPayload {
  notificationType: NotificationType;
  type?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  referenceEntityId?: string;
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
    private readonly webPushDispatcher: WebPushDispatcherService,
    private readonly whatsappDispatcher: WhatsAppDispatcherService,
    private readonly settingsService: NotificationSettingsService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  /**
   * Unified notification dispatcher.
   */
  async sendNotification(dto: SendNotificationDto) {
    const rawChannels = Array.from(new Set([NotificationChannel.IN_APP, ...dto.channels]));

    const activeChannels: NotificationChannel[] = [];
    for (const ch of rawChannels) {
      if (await this.settingsService.isChannelAllowed(ch, dto.notificationType || dto.type)) {
        activeChannels.push(ch);
      }
    }

    if (activeChannels.length === 0) {
      this.logger.debug(`All requested channels suppressed by system settings for notification [${dto.type}]`);
      return null;
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { fullName: true, role: true },
    });

    if (recipient && !(await this.settingsService.isRecipientRoleAllowed(recipient.role))) {
      this.logger.debug(`Notification suppressed: notifications disabled for role [${recipient.role}]`);
      return null;
    }

    const hasWebPush = activeChannels.includes(NotificationChannel.WEB_PUSH);

    const notification = await this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        type: dto.type,
        notificationType: dto.notificationType,
        title: dto.title,
        message: dto.body,
        referenceEntityId: dto.referenceEntityId,
        data: dto.data as any,
        channels: activeChannels,
        pushStatus: hasWebPush ? NotificationStatus.PENDING : null,
        scheduledFor: dto.scheduledFor || new Date(),
      },
      include: { recipient: { select: { fullName: true, role: true } } },
    });

    this.realtimeGateway?.notifyNotificationsChanged([dto.recipientId]);

    if (activeChannels.includes(NotificationChannel.WHATSAPP)) {
      await this.whatsappDispatcher.enqueueNotification(notification);
    }

    if (hasWebPush) {
      this.webPushDispatcher.kick();
    }

    return notification;
  }

  /**
   * Universal batch dispatcher implementing the Visited Array Pattern.
   */
  async sendBatch(items: SendNotificationDto[]) {
    if (!items || items.length === 0) return [];

    const visitedSet = new Set<string>();
    const deduplicatedItems: SendNotificationDto[] = [];
    for (const item of items) {
      if (!item.recipientId) continue;
      const key = `${item.recipientId}:${item.referenceEntityId || ''}:${item.notificationType || item.type}`;
      if (visitedSet.has(key)) continue;
      visitedSet.add(key);
      deduplicatedItems.push(item);
    }

    if (deduplicatedItems.length === 0) return [];

    const distinctChannelTypes = new Map<string, boolean>();
    for (const item of deduplicatedItems) {
      const rawChannels = Array.from(new Set([NotificationChannel.IN_APP, ...(item.channels || [])]));
      for (const ch of rawChannels) {
        const pairKey = `${ch}:${item.notificationType || item.type || ''}`;
        if (!distinctChannelTypes.has(pairKey)) {
          const allowed = await this.settingsService.isChannelAllowed(ch, item.notificationType || item.type);
          distinctChannelTypes.set(pairKey, allowed);
        }
      }
    }

    const uniqueUserIds = Array.from(new Set(deduplicatedItems.map((i) => i.recipientId)));
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, fullName: true, role: true },
    });
    const recipientMap = new Map(recipients.map((u) => [u.id, u]));

    const distinctRoles = [...new Set(recipients.map((r) => r.role))];
    const roleAllowedMap = new Map<string, boolean>();
    for (const role of distinctRoles) {
      roleAllowedMap.set(role, await this.settingsService.isRecipientRoleAllowed(role));
    }

    const validItems: Array<{
      item: SendNotificationDto;
      recipient: typeof recipients[0];
      activeChannels: NotificationChannel[];
    }> = [];

    for (const item of deduplicatedItems) {
      const recipient = recipientMap.get(item.recipientId);
      if (!recipient) continue;
      if (roleAllowedMap.get(recipient.role) === false) continue;

      const rawChannels = Array.from(new Set([NotificationChannel.IN_APP, ...(item.channels || [])]));
      const activeChannels = rawChannels.filter(
        (ch) => distinctChannelTypes.get(`${ch}:${item.notificationType || item.type || ''}`) !== false,
      );
      if (activeChannels.length === 0) continue;

      validItems.push({ item, recipient, activeChannels });
    }

    if (validItems.length === 0) return [];

    const itemsWithRef = validItems.filter((x) => x.item.referenceEntityId);
    let targetItems = validItems;

    if (itemsWithRef.length > 0) {
      const refUserIds = Array.from(new Set(itemsWithRef.map((x) => x.item.recipientId)));
      const refEntityIds = Array.from(new Set(itemsWithRef.map((x) => x.item.referenceEntityId!)));
      const refTypes = Array.from(new Set(itemsWithRef.map((x) => x.item.notificationType)));

      const existing = await this.prisma.notification.findMany({
        where: {
          recipientId: { in: refUserIds },
          referenceEntityId: { in: refEntityIds },
          notificationType: { in: refTypes },
        },
        select: { recipientId: true, referenceEntityId: true, notificationType: true },
      });

      const alreadySentSet = new Set<string>();
      for (const e of existing) {
        if (e.referenceEntityId && e.notificationType) {
          alreadySentSet.add(`${e.recipientId}:${e.referenceEntityId}:${e.notificationType}`);
        }
        if (e.referenceEntityId) {
          alreadySentSet.add(`${e.recipientId}:${e.referenceEntityId}`);
        }
        if (refEntityIds.length <= 1) {
          alreadySentSet.add(`${e.recipientId}`);
        }
      }

      targetItems = validItems.filter((x) => {
        if (!x.item.referenceEntityId) return true;
        const key = `${x.item.recipientId}:${x.item.referenceEntityId}:${x.item.notificationType || x.item.type}`;
        const refKey = `${x.item.recipientId}:${x.item.referenceEntityId}`;
        const userKey = `${x.item.recipientId}`;
        if (alreadySentSet.has(key) || alreadySentSet.has(refKey)) return false;
        if (refEntityIds.length <= 1 && alreadySentSet.has(userKey)) return false;
        return true;
      });
    }

    if (targetItems.length === 0) return [];

    const now = new Date();
    const recipientToNotifIdMap = new Map<string, string>();
    const notificationsData = targetItems.map((x) => {
      const notifId = randomUUID();
      recipientToNotifIdMap.set(x.item.recipientId, notifId);
      const hasWebPush = x.activeChannels.includes(NotificationChannel.WEB_PUSH);
      return {
        id: notifId,
        recipientId: x.item.recipientId,
        type: x.item.type || x.item.notificationType,
        notificationType: x.item.notificationType,
        title: x.item.title,
        message: x.item.body,
        referenceEntityId: x.item.referenceEntityId,
        data: x.item.data as any,
        channels: x.activeChannels,
        pushStatus: hasWebPush ? NotificationStatus.PENDING : null,
        scheduledFor: x.item.scheduledFor || now,
        createdAt: now,
        updatedAt: now,
      };
    });

    await this.prisma.notification.createMany({
      data: notificationsData,
      skipDuplicates: true,
    });

    const targetUserIds = Array.from(new Set(targetItems.map((x) => x.item.recipientId)));
    this.realtimeGateway?.notifyNotificationsChanged(targetUserIds);

    const whatsAppItems = targetItems.filter((x) => x.activeChannels.includes(NotificationChannel.WHATSAPP));
    if (whatsAppItems.length > 0) {
      const queueNotifs = whatsAppItems.map((x) => {
        const itemData = (x.item.data || {}) as Record<string, unknown>;
        return {
          type: x.item.type || x.item.notificationType,
          notificationType: x.item.notificationType,
          title: x.item.title,
          message: x.item.body,
          data: itemData,
          scheduledFor: x.item.scheduledFor || now,
          recipient: { fullName: x.recipient.fullName, role: x.recipient.role },
        };
      });
      await this.whatsappDispatcher
        .enqueueNotificationsBatch(queueNotifs)
        .catch((err) => this.logger.error('Failed to batch enqueue WhatsApp messages', err));
    }

    const webPushItems = targetItems.filter((x) => x.activeChannels.includes(NotificationChannel.WEB_PUSH));
    if (webPushItems.length > 0) {
      this.webPushDispatcher.kick();
    }

    return targetItems.map((x) => ({
      id: recipientToNotifIdMap.get(x.item.recipientId),
      recipientId: x.item.recipientId,
      notificationType: x.item.notificationType,
      type: x.item.type || x.item.notificationType,
      title: x.item.title,
      message: x.item.body,
      channels: x.activeChannels,
    }));
  }

  /**
   * High-performance batch dispatcher for multi-recipient notifications sharing a common payload.
   */
  async dispatchToUsers(
    userIds: string[],
    payload: DispatchNotificationPayload,
    channels: NotificationChannel[],
  ) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) return [];

    const items: SendNotificationDto[] = uniqueUserIds.map((recipientId) => ({
      recipientId,
      notificationType: payload.notificationType,
      type: payload.type || payload.notificationType,
      title: payload.title,
      body: payload.body,
      channels,
      data: payload.data,
      referenceEntityId: payload.referenceEntityId,
    }));

    return this.sendBatch(items);
  }

  /**
   * Internal legacy helper — creates a plain in-app notification.
   */
  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        referenceEntityId: dto.referenceEntityId,
        channels: [NotificationChannel.IN_APP],
      },
    });
  }

  /**
   * Keyset cursor-paginated notification feed with optional role filtering and staff-wide scope.
   */
  async getNotifications(
    user: { id: string; role: UserRole },
    query: CursorPaginationDto & { role?: string; scope?: string },
  ) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor ? CursorPaginationHelper.decodeCursor(query.cursor) : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');

    const isStaff = user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT;
    const targetRole = query.role && query.role !== 'ALL' ? (query.role as UserRole) : undefined;

    const baseWhereClause: any = {};
    if (isStaff && query.scope === 'all') {
      if (targetRole) {
        baseWhereClause.recipient = { role: targetRole };
      }
    } else {
      baseWhereClause.recipientId = user.id;
      if (targetRole) {
        baseWhereClause.recipient = { role: targetRole };
      }
    }

    const whereClause: any = {
      ...baseWhereClause,
      ...(cursorFilter || {}),
    };

    const [notifications, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        include: {
          recipient: {
            select: { id: true, fullName: true, role: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      this.prisma.notification.count({
        where: baseWhereClause,
      }),
    ]);

    return CursorPaginationHelper.formatResponse(notifications, limit, totalCount);
  }

  async getUnreadCount(recipientId: string): Promise<{ unreadCount: number }> {
    const count = await this.prisma.notification.count({
      where: { recipientId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(notificationId: string, recipientId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId },
      data: { isRead: true, readAt: new Date() },
    });
    this.realtimeGateway?.notifyNotificationsChanged([recipientId]);
    return res;
  }

  async markAllAsRead(recipientId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    this.realtimeGateway?.notifyNotificationsChanged([recipientId]);
    return { markedCount: result.count };
  }

  buildNotificationUrl(
    type: NotificationType,
    data?: Record<string, unknown>,
  ): string {
    const base = '/dashboard';
    switch (type) {
      case NotificationType.SESSION_REMINDER_STUDENT:
      case NotificationType.TEACHER_SESSION_REMINDER:
        return data?.sessionId ? `${base}/sessions/${data.sessionId}` : base;
      case NotificationType.ONLINE_EXAM_REMINDER:
        return data?.examId ? `${base}/exams/${data.examId}` : base;
      case NotificationType.NEW_EXAM_PUBLISHED:
      case NotificationType.EXAM_DEADLINE_REMINDER:
        return data?.assessmentId
          ? `/student/assessments?id=${data.assessmentId}`
          : '/student/assessments';
      case NotificationType.NEW_HOMEWORK_ASSIGNED:
      case NotificationType.HOMEWORK_DEADLINE_REMINDER:
        return '/student/dashboard';
      case NotificationType.ABSENCE_ALERT_PARENT:
        return data?.studentId ? `${base}/students/${data.studentId}` : base;
      default:
        return data?.url ? String(data.url) : base;
    }
  }
}
