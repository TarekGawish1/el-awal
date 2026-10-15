import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import {
  AttendanceStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { WebPushService, PushPayload } from '../../../services/webpush.service';
import { WebPushDispatcherService } from './webpush-dispatcher.service';
import { WhatsAppDispatcherService } from '../../whatsapp/services/whatsapp-dispatcher.service';
import { NotificationSettingsService } from './notification-settings.service';
import { formatPaymentReceivedMessage } from '../../../utils/spintax';

// ─── DTOs ───────────────────────────────────────────────────────────────────

/** Legacy DTO preserved for backwards compatibility with existing event handlers */
export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  referenceEntityId?: string;
}

/**
 * Multi-channel notification dispatch DTO.
 * Use this for new notifications that need WhatsApp / Web Push delivery.
 */
export interface SendNotificationDto {
  /** User ID of the recipient */
  recipientId: string;
  /** Typed notification category (for structured routing) */
  notificationType: NotificationType;
  /** Legacy string type — kept for API backwards-compat */
  type: string;
  /** Short Arabic title */
  title: string;
  /** Full notification body text */
  body: string;
  /** Channels to deliver on. IN_APP is always included. */
  channels: NotificationChannel[];
  /**
   * Contextual data payload.
   * For WhatsApp: MUST include `phone` field.
   */
  data?: Record<string, unknown>;
  /** Optional reference entity (session, exam, student, etc.) */
  referenceEntityId?: string;
  /** Schedule delivery for a future time. Defaults to now. */
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

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
    private readonly webPushDispatcher: WebPushDispatcherService,
    private readonly whatsappDispatcher: WhatsAppDispatcherService,
    private readonly settingsService: NotificationSettingsService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  // ─── Core Multi-Channel Dispatcher ─────────────────────────────────────────

  /**
   * Unified notification dispatcher.
   *
   * - IN_APP: created in DB automatically (respects isInAppEnabled)
   * - WEB_PUSH: dispatched immediately via VAPID (respects isPushEnabled)
   * - WHATSAPP: renders and persists a dedicated WhatsAppMessageLog entry (respects isWhatsAppEnabled)
   */
  async sendNotification(dto: SendNotificationDto) {
    const rawChannels = Array.from(
      new Set([NotificationChannel.IN_APP, ...dto.channels]),
    );

    // Filter channels based on global system switches and category settings
    const activeChannels: NotificationChannel[] = [];
    for (const ch of rawChannels) {
      if (await this.settingsService.isChannelAllowed(ch, dto.notificationType || dto.type)) {
        activeChannels.push(ch);
      }
    }

    if (activeChannels.length === 0) {
      this.logger.debug(
        `All requested channels suppressed by system settings for notification [${dto.type}]`,
      );
      return null;
    }

    // Check if recipient's role is allowed in system settings
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { fullName: true, role: true },
    });

    if (recipient && !(await this.settingsService.isRecipientRoleAllowed(recipient.role))) {
      this.logger.debug(
        `Notification suppressed: notifications disabled for role [${recipient.role}]`,
      );
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Wake up Web Push database queue worker immediately (< 1ms, zero network blocking)
    if (hasWebPush) {
      this.webPushDispatcher.kick();
    }

    return notification;
  }

  /**
   * High-performance batch dispatcher for multi-recipient notifications.
   *
   * Optimizations & Hardening:
   * 1. Evaluates settings once in-memory without repetitive async loops.
   * 2. 1 batch query to fetch and validate active recipient users and roles.
   * 3. Deterministic entity deduplication: prevents duplicate notifications if event is resent.
   * 4. Pre-assigns deterministic UUIDs to each notification before inserting.
   * 5. Bulk insert (createMany) with skipDuplicates: true.
   * 6. Realtime Gateway single broadcast to all affected users.
   * 7. Bulk enqueue to WhatsAppMessageLog via enqueueNotificationsBatch (zero extra DB queries).
   * 8. Bounded concurrency (limit = 15) for Web Push.
   * 9. Exact notification ID targeting for pushStatus updates: updates ONLY this batch's IDs.
   */
  /**
   * Universal batch dispatcher implementing the Visited Array Pattern.
   * Gathers all notifications, pre-filters duplicates in-memory via visited set,
   * queries users & roles in 1 query, queries existing referenceEntity records in 1 query,
   * persists in 1 bulk insert, enqueues WhatsApp in 1 batch, and dispatches Web Push
   * with bounded concurrency pool.
   */
  async sendBatch(items: SendNotificationDto[]) {
    if (!items || items.length === 0) return [];

    // 1. In-memory visited deduplication (ensure no duplicate notifications in this batch)
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

    // 2. Load global settings and evaluate active channels per distinct (channel, type) pair
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

    // 3. Batch query for all recipient users in a single round-trip
    const uniqueUserIds = Array.from(new Set(deduplicatedItems.map((i) => i.recipientId)));
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, fullName: true, role: true },
    });
    const recipientMap = new Map(recipients.map((u) => [u.id, u]));

    // Evaluate allowed roles for distinct roles present in recipients (at most 3-4 checks)
    const distinctRoles = [...new Set(recipients.map((r) => r.role))];
    const roleAllowedMap = new Map<string, boolean>();
    for (const role of distinctRoles) {
      roleAllowedMap.set(role, await this.settingsService.isRecipientRoleAllowed(role));
    }

    // Filter items to valid recipients with active roles
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

    // 4. Deterministic entity deduplication against DB: check if any already exist
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

    // 5. Single bulk insert query for all notification records
    await this.prisma.notification.createMany({
      data: notificationsData,
      skipDuplicates: true,
    });

    // 6. Realtime Gateway single broadcast
    const targetUserIds = Array.from(new Set(targetItems.map((x) => x.item.recipientId)));
    this.realtimeGateway?.notifyNotificationsChanged(targetUserIds);

    // 7. Bulk enqueue to WhatsAppMessageLog
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

    // 8. Bulk Web Push Dispatch via Database Queue
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
   * Implemented cleanly as a special case of sendBatch.
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
   * Helper to fetch push subscriptions and dispatch Web Push notifications with bounded concurrency.
   * Uses exact notification IDs generated for this batch to ensure updates never bleed into older records.
   */
  private async dispatchBatchWebPushItems(
    items: Array<{
      item: SendNotificationDto;
      recipient: { id: string; fullName: string; role: UserRole };
      activeChannels: NotificationChannel[];
    }>,
    recipientToNotifIdMap: Map<string, string>,
  ): Promise<void> {
    const userIds = Array.from(new Set(items.map((x) => x.item.recipientId)));
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(
        `No push subscriptions found for batch of ${userIds.length} users`,
      );
      return;
    }

    // Check if all items share the exact same payload (common case e.g. dispatchToUsers)
    const firstItem = items[0].item;
    const allSamePayload = items.every(
      (x) => x.item.title === firstItem.title && x.item.body === firstItem.body,
    );

    let successfulUserIds: string[] = [];
    let failedUserIds: string[] = [];

    if (allSamePayload) {
      const pushPayload = {
        title: firstItem.title,
        body: firstItem.body,
        url: this.buildNotificationUrl(firstItem.notificationType, firstItem.data),
        data: firstItem.data,
      };

      const result = await this.webPush.sendBatchSubscriptions(
        subscriptions,
        pushPayload,
        { concurrencyLimit: 15 },
      );
      successfulUserIds = result.successfulUserIds;
      failedUserIds = result.failedUserIds;
    } else {
      // Group subscriptions by user for heterogeneous payloads
      const subsByUser = new Map<string, typeof subscriptions>();
      for (const sub of subscriptions) {
        if (!sub.userId) continue;
        const list = subsByUser.get(sub.userId) || [];
        list.push(sub);
        subsByUser.set(sub.userId, list);
      }

      const tasks: Array<{
        subs: typeof subscriptions;
        payload: PushPayload;
        userId: string;
      }> = [];

      for (const x of items) {
        const userSubs = subsByUser.get(x.item.recipientId);
        if (!userSubs || userSubs.length === 0) continue;
        tasks.push({
          subs: userSubs,
          payload: {
            title: x.item.title,
            body: x.item.body,
            url: this.buildNotificationUrl(x.item.notificationType, x.item.data),
            data: x.item.data,
          },
          userId: x.item.recipientId,
        });
      }

      // Bounded concurrency pool (concurrency limit = 15)
      const successfulSet = new Set<string>();
      const failedSet = new Set<string>();
      let taskIdx = 0;
      const concurrency = Math.min(15, tasks.length);

      const workers = Array.from({ length: concurrency }, async () => {
        while (taskIdx < tasks.length) {
          const task = tasks[taskIdx++];
          try {
            const res = await this.webPush.sendBatchSubscriptions(
              task.subs,
              task.payload,
              { concurrencyLimit: 5 },
            );
            for (const uid of res.successfulUserIds) successfulSet.add(uid);
            for (const uid of res.failedUserIds) failedSet.add(uid);
          } catch {
            failedSet.add(task.userId);
          }
        }
      });

      await Promise.all(workers);
      successfulUserIds = Array.from(successfulSet);
      failedUserIds = Array.from(failedSet).filter((uid) => !successfulSet.has(uid));
    }

    // Bulk update pushStatus using EXACT notification IDs generated for this batch
    const successfulNotifIds = successfulUserIds
      .map((uid) => recipientToNotifIdMap.get(uid))
      .filter(Boolean) as string[];

    if (successfulNotifIds.length > 0) {
      await this.prisma.notification
        .updateMany({
          where: {
            id: { in: successfulNotifIds },
          },
          data: { pushStatus: NotificationStatus.SENT },
        })
        .catch((err) =>
          this.logger.error('Failed to update pushStatus to SENT', err),
        );
    }

    // Bulk update pushStatus for users whose subscriptions ALL failed
    const failedNotifIds = failedUserIds
      .map((uid) => recipientToNotifIdMap.get(uid))
      .filter(Boolean) as string[];

    if (failedNotifIds.length > 0) {
      await this.prisma.notification
        .updateMany({
          where: {
            id: { in: failedNotifIds },
          },
          data: { pushStatus: NotificationStatus.FAILED },
        })
        .catch((err) =>
          this.logger.error('Failed to update pushStatus to FAILED', err),
        );
    }
  }

  /**
   * Internal legacy helper — creates a plain in-app notification.
   * Preserved for backwards compatibility with existing @OnEvent handlers.
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

  // ─── Read / Management ────────────────────────────────────────────────────

  /**
   * Keyset cursor-paginated notification feed with optional role filtering and staff-wide scope.
   */
  async getNotifications(
    user: { id: string; role: UserRole },
    query: CursorPaginationDto & { role?: string; scope?: string },
  ) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor
      ? CursorPaginationHelper.decodeCursor(query.cursor)
      : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
      decodedCursor,
      'DESC',
    );

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

  /**
   * Returns fast index-scanned unread notification counter for UI badge displays.
   */
  async getUnreadCount(recipientId: string): Promise<{ unreadCount: number }> {
    const count = await this.prisma.notification.count({
      where: { recipientId, isRead: false },
    });
    return { unreadCount: count };
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(notificationId: string, recipientId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId },
      data: { isRead: true, readAt: new Date() },
    });
    this.realtimeGateway?.notifyNotificationsChanged([recipientId]);
    return res;
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(recipientId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    this.realtimeGateway?.notifyNotificationsChanged([recipientId]);
    return { markedCount: result.count };
  }

  // ─── Domain Event Handlers ────────────────────────────────────────────────

  /**
   * Handles student absence alerts and notifies all linked parent guardian accounts
   * via both in-app and WhatsApp (if phone is available in parent user record).
   */
  @OnEvent('student.absence.recorded', { async: true })
  @OnEvent('attendance.recorded', { async: true })
  async handleAbsenceEvent(payload: {
    studentId: string;
    groupName?: string;
    date?: Date;
    status?: AttendanceStatus;
  }) {
    if (payload.status && payload.status !== AttendanceStatus.ABSENT) {
      return; // Only notify on absence
    }

    this.logger.log(
      `Processing absence notification event for student [${payload.studentId}]`,
    );

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: payload.studentId },
      include: {
        user: { select: { fullName: true } },
        parentLinks: {
          include: {
            parent: {
              include: { user: { select: { id: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!student || student.parentLinks.length === 0) return;

    const studentName = student.user.fullName;
    const dateStr = (payload.date || new Date()).toISOString().split('T')[0];
    const groupText = payload.groupName ? `في مجموعة (${payload.groupName})` : '';
    const body = `نود إحاطتكم بغياب الطالب/ة (${studentName}) ${groupText} عن حصة الرياضيات مع أستاذ أحمد غريب بتاريخ ${dateStr}. يرجى المتابعة مع المدرس.\n\nمنصة الأول للرياضيات - أستاذ أحمد غريب 📐`;

    const visitedParents = new Set<string>();
    const notificationsToDispatch: SendNotificationDto[] = [];

    for (const link of student.parentLinks) {
      const parentUserId = link.parent.user.id;
      if (visitedParents.has(parentUserId)) continue;
      visitedParents.add(parentUserId);

      const parentPhone = link.parent.user.phone;
      const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
      if (parentPhone) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      notificationsToDispatch.push({
        recipientId: parentUserId,
        notificationType: NotificationType.ABSENCE_ALERT_PARENT,
        type: 'ABSENCE_ALERT_PARENT',
        title: '⚠️ تنبيه غياب الطالب',
        body,
        channels,
        data: {
          studentId: payload.studentId,
          studentName,
          phone: parentPhone,
          groupName: payload.groupName,
          date: dateStr,
          sessionId: (payload as any).sessionId,
        },
        referenceEntityId: payload.studentId,
      });
    }

    if (notificationsToDispatch.length > 0) {
      await this.sendBatch(notificationsToDispatch);
    }
  }

  /**
   * Handles student absence correction/apology alerts when a student was previously
   * marked absent and is now updated to present or attended.
   */
  @OnEvent('student.absence.corrected', { async: true })
  async handleAbsenceCorrectedEvent(payload: {
    studentId: string;
    groupName?: string;
    date?: Date;
    sessionId?: string;
  }) {
    this.logger.log(
      `Processing absence correction event for student [${payload.studentId}]`,
    );

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: payload.studentId },
      include: {
        user: { select: { fullName: true } },
        parentLinks: {
          include: {
            parent: {
              include: { user: { select: { id: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!student || student.parentLinks.length === 0) return;

    const parentUserIds = student.parentLinks.map((l) => l.parent.user.id);

    // Pre-fetch all recent absence-related notifications in a single batch query
    const recentAbsenceAlerts = await this.prisma.notification.findMany({
      where: {
        recipientId: { in: parentUserIds },
        type: { in: ['ABSENCE_ALERT_PARENT', 'ABSENCE_CORRECTION_PARENT'] },
        referenceEntityId: payload.studentId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Within last 7 days
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const latestByParent = new Map<string, string>();
    for (const alert of recentAbsenceAlerts) {
      if (!latestByParent.has(alert.recipientId)) {
        latestByParent.set(alert.recipientId, alert.type);
      }
    }

    const studentName = student.user.fullName;
    const dateStr = (payload.date || new Date()).toISOString().split('T')[0];
    const groupName = payload.groupName || 'الحصة';
    const body = `نعتذر لحضرتكم عن إشعار الغياب السابق؛ نود إحاطتكم بأن الطالب/ة: (${studentName}) قد حضر بالفعل حصة الرياضيات مع أستاذ أحمد غريب في مجموعة (${groupName}) وتم رصد حضوره بنجاح.\n\nمنصة الأول للرياضيات - أستاذ أحمد غريب 📐`;

    const visitedParents = new Set<string>();
    const notificationsToDispatch: SendNotificationDto[] = [];

    for (const link of student.parentLinks) {
      const parentUserId = link.parent.user.id;
      if (visitedParents.has(parentUserId)) continue;
      visitedParents.add(parentUserId);

      if (latestByParent.get(parentUserId) !== 'ABSENCE_ALERT_PARENT') {
        this.logger.debug(
          `Skipping absence apology: no uncorrected absence alert found for student [${payload.studentId}] to parent [${parentUserId}]`,
        );
        continue;
      }

      const parentPhone = link.parent.user.phone;
      const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
      if (parentPhone) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      notificationsToDispatch.push({
        recipientId: parentUserId,
        notificationType: NotificationType.ABSENCE_ALERT_PARENT,
        type: 'ABSENCE_CORRECTION_PARENT',
        title: '🌸 تصحيح واعتذار - تأكيد حضور الطالب',
        body,
        channels,
        data: {
          studentId: payload.studentId,
          studentName,
          phone: parentPhone,
          groupName,
          date: dateStr,
          sessionId: payload.sessionId,
        },
        referenceEntityId: payload.studentId,
      });
    }

    if (notificationsToDispatch.length > 0) {
      await this.sendBatch(notificationsToDispatch);
    }
  }

  /**
   * Handles student missing homework and notifies linked parent guardian accounts.
   */
  @OnEvent('student.homework.missing', { async: true })
  async handleHomeworkMissingEvent(payload: {
    studentId: string;
    assessmentTitle: string;
    groupName?: string;
    date?: Date;
  }) {
    this.logger.log(`Processing missing homework notification for student [${payload.studentId}]`);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: payload.studentId },
      include: {
        user: { select: { fullName: true } },
        parentLinks: {
          include: {
            parent: {
              include: { user: { select: { id: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!student || student.parentLinks.length === 0) return;

    const studentName = student.user.fullName;
    const dateStr = (payload.date || new Date()).toISOString().split('T')[0];
    const groupText = payload.groupName ? `في مجموعة (${payload.groupName})` : '';
    const body = `نود إحاطتكم بأن الطالب (${studentName}) لم يقم بتسليم الواجب (${payload.assessmentTitle}) ${groupText} بتاريخ ${dateStr}. يرجى المتابعة والحرص على أداء الواجبات.`;

    const visitedParents = new Set<string>();
    const notificationsToDispatch: SendNotificationDto[] = [];

    for (const link of student.parentLinks) {
      const parentUserId = link.parent.user.id;
      if (visitedParents.has(parentUserId)) continue;
      visitedParents.add(parentUserId);

      const parentPhone = link.parent.user.phone;
      const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
      if (parentPhone) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      notificationsToDispatch.push({
        recipientId: parentUserId,
        notificationType: NotificationType.HOMEWORK_MISSING_PARENT,
        type: 'HOMEWORK_MISSING_PARENT',
        title: '⚠️ تنبيه عدم حل الواجب',
        body,
        channels,
        data: {
          studentId: payload.studentId,
          phone: parentPhone,
        },
        referenceEntityId: payload.studentId,
      });
    }

    if (notificationsToDispatch.length > 0) {
      await this.sendBatch(notificationsToDispatch);
    }
  }

  /**
   * Handles repeated lateness and notifies linked parent guardian accounts.
   */
  @OnEvent('student.repeated.lateness', { async: true })
  async handleRepeatedLatenessEvent(payload: {
    studentId: string;
    groupName: string;
  }) {
    this.logger.log(`Processing repeated lateness notification for student [${payload.studentId}]`);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: payload.studentId },
      include: {
        user: { select: { fullName: true } },
        parentLinks: {
          include: {
            parent: {
              include: { user: { select: { id: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!student || student.parentLinks.length === 0) return;

    const studentName = student.user.fullName;
    const body = `نود إحاطتكم بأن الطالب (${studentName}) يتأخر بشكل متكرر عن موعد حصص مجموعة (${payload.groupName}) (3 مرات متتالية). يرجى التأكيد على الحضور في الموعد المحدد لضمان تحقيق أقصى استفادة.`;

    const visitedParents = new Set<string>();
    const notificationsToDispatch: SendNotificationDto[] = [];

    for (const link of student.parentLinks) {
      const parentUserId = link.parent.user.id;
      if (visitedParents.has(parentUserId)) continue;
      visitedParents.add(parentUserId);

      const parentPhone = link.parent.user.phone;
      const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
      if (parentPhone) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      notificationsToDispatch.push({
        recipientId: parentUserId,
        notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
        type: 'REPEATED_LATENESS_PARENT',
        title: '⏰ تنبيه تأخير متكرر',
        body,
        channels,
        data: {
          studentId: payload.studentId,
          phone: parentPhone,
        },
        referenceEntityId: payload.studentId,
      });
    }

    if (notificationsToDispatch.length > 0) {
      await this.sendBatch(notificationsToDispatch);
    }
  }

  /**
   * Handles assessment graded notifications — notifies student and guardians.
   */
  @OnEvent('assessment.graded', { async: true })
  async handleAssessmentGradedEvent(payload: {
    submissionId: string;
    assessmentId: string;
    studentId: string;
    scoreObtained: number | null;
  }) {
    this.logger.log(
      `Processing assessment graded notification for submission [${payload.submissionId}]`,
    );

    const [assessment, student] = await Promise.all([
      this.prisma.assessment.findUnique({
        where: { id: payload.assessmentId },
        select: { title: true, totalScore: true, passingScore: true },
      }),
      this.prisma.studentProfile.findUnique({
        where: { id: payload.studentId },
        include: {
          user: { select: { fullName: true } },
          parentLinks: {
            include: {
              parent: {
                include: { user: { select: { id: true, phone: true } } },
              },
            },
          },
        },
      }),
    ]);

    if (!assessment || !student) return;

    const scoreDisplay =
      payload.scoreObtained !== null
        ? `${payload.scoreObtained}/${Number(assessment.totalScore)}`
        : 'تم التصحيح';

    const isFailed =
      assessment.passingScore !== null &&
      payload.scoreObtained !== null &&
      payload.scoreObtained < Number(assessment.passingScore);

    const body = `تم رصد درجات (${assessment.title}) للطالب ${student.user.fullName}. النتيجة: ${scoreDisplay}`;

    // Collect student and parent notifications via Visited pattern
    const notificationsToDispatch: SendNotificationDto[] = [
      {
        recipientId: student.id,
        type: 'ASSESSMENT_GRADED',
        notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
        title: '📝 تم رصد درجات الاختبار',
        body,
        referenceEntityId: payload.assessmentId,
        channels: [NotificationChannel.IN_APP],
      },
    ];

    const visitedParents = new Set<string>();
    for (const link of student.parentLinks) {
      const parentUserId = link.parent.user.id;
      if (visitedParents.has(parentUserId)) continue;
      visitedParents.add(parentUserId);

      const parentPhone = link.parent.user.phone;
      const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
      if (parentPhone) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      notificationsToDispatch.push({
        recipientId: parentUserId,
        notificationType: isFailed
          ? NotificationType.EXAM_FAILED_ALERT_PARENT
          : NotificationType.GENERAL_ANNOUNCEMENT,
        type: isFailed ? 'EXAM_FAILED_ALERT_PARENT' : 'EXAM_PASSED_ALERT_PARENT',
        title: isFailed ? '❌ تنبيه: درجات الاختبار' : '📊 نتيجة الاختبار',
        body,
        channels,
        data: {
          studentId: payload.studentId,
          assessmentId: payload.assessmentId,
          phone: parentPhone,
          score: payload.scoreObtained,
        },
        referenceEntityId: payload.assessmentId,
      });
    }

    await this.sendBatch(notificationsToDispatch);
  }

  /**
   * Handles payment received confirmation — dispatches receipt to guardians via WhatsApp, Web Push, and In-App.
   */
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
    this.logger.log(
      `Processing payment recorded notification for student [${payload.studentId}] (Amount: ${payload.amountPaid} ${payload.currency || 'EGP'})`,
    );

    const links = await this.prisma.parentStudentLink.findMany({
      where: { studentId: payload.studentId },
      include: {
        parent: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      },
    });

    const paymentTypeText =
      payload.paymentType === 'BOOKLET'
        ? `شراء مذكرة (${payload.bookletTitle || 'المذكرة الدراسية'})`
        : `اشتراك شهر (${payload.periodMonth || new Date().getMonth() + 1}/${payload.periodYear || new Date().getFullYear()})${payload.groupName ? ` - ${payload.groupName}` : ''}`;

    const visitedParents = new Set<string>();
    const notificationsToDispatch: SendNotificationDto[] = [];

    for (const link of links) {
      const parentUser = link.parent?.user;
      if (!parentUser) continue;
      if (visitedParents.has(parentUser.id)) continue;
      visitedParents.add(parentUser.id);

      const parentName = parentUser.fullName || 'ولي الأمر المحترم';
      const parentPhone = parentUser.phone;

      const messageBody = formatPaymentReceivedMessage({
        parentName,
        studentName: payload.studentName,
        amount: payload.amountPaid,
        currency: payload.currency || 'جنيه',
        paymentType: paymentTypeText,
        invoiceNumber: payload.receiptNumber,
        paymentMethod: payload.paymentMethod || 'نقدي / السنتر',
        remainingBalance: payload.remainingBalance ?? 0,
      });

      notificationsToDispatch.push({
        recipientId: parentUser.id,
        type: 'PAYMENT_RECEIVED_PARENT',
        notificationType: NotificationType.PAYMENT_RECEIVED_PARENT,
        title: `🧾 إيصال دفع: تم سداد ${payload.amountPaid} ${payload.currency || 'جنيه'} بنجاح`,
        body: messageBody,
        channels: parentPhone
          ? [NotificationChannel.WHATSAPP, NotificationChannel.WEB_PUSH, NotificationChannel.IN_APP]
          : [NotificationChannel.WEB_PUSH, NotificationChannel.IN_APP],
        data: {
          studentId: payload.studentId,
          studentName: payload.studentName,
          amount: String(payload.amountPaid),
          phone: parentPhone || undefined,
          paymentType: payload.paymentType,
          receiptNumber: payload.receiptNumber,
          url: `/parent-access`,
        },
      });
    }

    if (notificationsToDispatch.length > 0) {
      await this.sendBatch(notificationsToDispatch);
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private buildNotificationUrl(
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
        // Allow domain events to provide an explicit target URL (e.g. teacher join requests)
        return data?.url ? String(data.url) : base;
    }
  }
}
