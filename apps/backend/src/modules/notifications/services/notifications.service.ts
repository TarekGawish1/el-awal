import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import {
  AttendanceStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';
import { WebPushService } from '../../../services/webpush.service';
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

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
  ) {}

  // ─── Core Multi-Channel Dispatcher ─────────────────────────────────────────

  /**
   * Unified notification dispatcher.
   *
   * - IN_APP: created in DB automatically (always active)
   * - WEB_PUSH: dispatched immediately via VAPID
   * - WHATSAPP: sets whatsappStatus=PENDING, picked up by WhatsAppWorker
   */
  async sendNotification(dto: SendNotificationDto) {
    const channels = Array.from(
      new Set([NotificationChannel.IN_APP, ...dto.channels]),
    );

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
        channels,
        scheduledFor: dto.scheduledFor || new Date(),
        // Set WhatsApp status to PENDING if channel requested
        whatsappStatus: channels.includes(NotificationChannel.WHATSAPP)
          ? NotificationStatus.PENDING
          : undefined,
      },
    });

    // Dispatch Web Push immediately (async, non-blocking)
    if (channels.includes(NotificationChannel.WEB_PUSH)) {
      this.webPush
        .sendToUser(dto.recipientId, {
          title: dto.title,
          body: dto.body,
          url: this.buildNotificationUrl(dto.notificationType, dto.data),
          data: dto.data,
        })
        .then((count) => {
          if (count > 0) {
            this.prisma.notification
              .update({
                where: { id: notification.id },
                data: { pushStatus: NotificationStatus.SENT },
              })
              .catch(() => undefined);
          }
        })
        .catch((err) => {
          this.logger.warn(`Web Push failed for notification [${notification.id}]`, err);
          this.prisma.notification
            .update({
              where: { id: notification.id },
              data: { pushStatus: NotificationStatus.FAILED },
            })
            .catch(() => undefined);
        });
    }

    return notification;
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
   * Keyset cursor-paginated notification feed for a user.
   */
  async getNotifications(recipientId: string, query: CursorPaginationDto) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor
      ? CursorPaginationHelper.decodeCursor(query.cursor)
      : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
      decodedCursor,
      'DESC',
    );

    const notifications = await this.prisma.notification.findMany({
      where: {
        recipientId,
        ...(cursorFilter || {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    return CursorPaginationHelper.formatResponse(notifications, limit);
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
    return this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(recipientId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

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
    const body = `نود إحاطتكم بغياب الطالب (${studentName}) ${groupText} بتاريخ ${dateStr}. يرجى المتابعة مع المدرس.`;

    for (const link of student.parentLinks) {
      const parentUserId = link.parent.user.id;
      const parentPhone = link.parent.user.phone;

      const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
      if (parentPhone) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      await this.sendNotification({
        recipientId: parentUserId,
        notificationType: NotificationType.ABSENCE_ALERT_PARENT,
        type: 'ABSENCE_ALERT_PARENT',
        title: '⚠️ تنبيه غياب الطالب',
        body,
        channels,
        data: {
          studentId: payload.studentId,
          phone: parentPhone,
          groupName: payload.groupName,
          date: dateStr,
        },
        referenceEntityId: payload.studentId,
      });
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

    // Notify student (in-app only)
    await this.createNotification({
      recipientId: student.id,
      type: 'ASSESSMENT_GRADED',
      title: '📝 تم رصد درجات الاختبار',
      message: body,
      referenceEntityId: payload.assessmentId,
    });

    // Notify guardians
    for (const link of student.parentLinks) {
      const parentUserId = link.parent.user.id;
      const parentPhone = link.parent.user.phone;

      const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
      // WhatsApp alert for failed exams (score < 50%)
      if (isFailed && parentPhone) {
        channels.push(NotificationChannel.WHATSAPP);
      }

      await this.sendNotification({
        recipientId: parentUserId,
        notificationType: isFailed
          ? NotificationType.EXAM_FAILED_ALERT_PARENT
          : NotificationType.GENERAL_ANNOUNCEMENT,
        type: 'ASSESSMENT_GRADED',
        title: isFailed ? '❌ تنبيه: رسوب في الاختبار' : '📊 تم رصد درجات الاختبار',
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

    for (const link of links) {
      const parentUser = link.parent?.user;
      if (!parentUser) continue;

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

      await this.sendNotification({
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
      case NotificationType.ABSENCE_ALERT_PARENT:
        return data?.studentId ? `${base}/students/${data.studentId}` : base;
      default:
        return base;
    }
  }
}
