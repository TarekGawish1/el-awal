import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { AttendanceStatus } from '@prisma/client';

export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  referenceEntityId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Internal helper to create a persistent in-app notification record.
   */
  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        referenceEntityId: dto.referenceEntityId,
      },
    });
  }

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

  // ==========================================
  // ASYNCHRONOUS DECOUPLED DOMAIN EVENT HANDLERS
  // ==========================================

  /**
   * Handles student absence alerts and notifies all linked parent guardian accounts.
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

    this.logger.log(`Processing absence notification event for student [${payload.studentId}]`);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: payload.studentId },
      include: {
        user: { select: { fullName: true } },
        parentLinks: { select: { parentId: true } },
      },
    });

    if (!student || student.parentLinks.length === 0) return;

    const studentName = student.user.fullName;
    const dateStr = (payload.date || new Date()).toISOString().split('T')[0];
    const groupText = payload.groupName ? `في ${payload.groupName}` : '';

    for (const link of student.parentLinks) {
      await this.createNotification({
        recipientId: link.parentId,
        type: 'STUDENT_ABSENCE',
        title: 'تنبيه غياب الطالب',
        message: `نود إحاطتكم بغياب الطالب (${studentName}) ${groupText} بتاريخ ${dateStr}. يرجى المتابعة مع الإدارة.`,
        referenceEntityId: payload.studentId,
      });
    }
  }

  /**
   * Handles assessment graded notifications and sends score updates to student and guardians.
   */
  @OnEvent('assessment.graded', { async: true })
  async handleAssessmentGradedEvent(payload: {
    submissionId: string;
    assessmentId: string;
    studentId: string;
    scoreObtained: number | null;
  }) {
    this.logger.log(`Processing assessment graded notification event for submission [${payload.submissionId}]`);

    const [assessment, student] = await Promise.all([
      this.prisma.assessment.findUnique({
        where: { id: payload.assessmentId },
        select: { title: true, totalScore: true },
      }),
      this.prisma.studentProfile.findUnique({
        where: { id: payload.studentId },
        include: {
          user: { select: { fullName: true } },
          parentLinks: { select: { parentId: true } },
        },
      }),
    ]);

    if (!assessment || !student) return;

    const scoreDisplay =
      payload.scoreObtained !== null
        ? `${payload.scoreObtained}/${Number(assessment.totalScore)}`
        : 'تم التصحيح';

    const message = `تم رصد درجات (${assessment.title}) للطالب ${student.user.fullName}. النتيجة: ${scoreDisplay}`;

    // 1. Notify Student
    await this.createNotification({
      recipientId: student.id,
      type: 'ASSESSMENT_GRADED',
      title: 'تم رصد درجات الاختبار',
      message,
      referenceEntityId: payload.assessmentId,
    });

    // 2. Notify Guardians
    for (const link of student.parentLinks) {
      await this.createNotification({
        recipientId: link.parentId,
        type: 'ASSESSMENT_GRADED',
        title: 'تم رصد درجات الاختبار للطالب',
        message,
        referenceEntityId: payload.assessmentId,
      });
    }
  }

  /**
   * Handles payment received confirmation and dispatches receipt notification to guardians.
   */
  @OnEvent('payment.recorded', { async: true })
  async handlePaymentRecordedEvent(payload: {
    studentId: string;
    studentName: string;
    groupId?: string;
    groupName?: string;
    amountPaid: number;
    periodYear: number;
    periodMonth: number;
  }) {
    this.logger.log(`Processing payment recorded notification event for student [${payload.studentId}]`);

    const links = await this.prisma.parentStudentLink.findMany({
      where: { studentId: payload.studentId },
      select: { parentId: true },
    });

    const message = `تم تأكيد استلام مصروفات شهر (${payload.periodMonth}/${payload.periodYear}) للطالب ${payload.studentName} بمبلغ ${payload.amountPaid} ج.م.`;

    for (const link of links) {
      await this.createNotification({
        recipientId: link.parentId,
        type: 'PAYMENT_RECEIVED',
        title: 'إشعار سداد المصروفات الدراسية',
        message,
        referenceEntityId: payload.studentId,
      });
    }
  }
}
