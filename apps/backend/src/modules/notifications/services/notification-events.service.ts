import { Injectable, Logger } from '@nestjs/common';
import {
  AttendanceStatus,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationDispatchService, SendNotificationDto } from './notification-dispatch.service';
import { NotificationTemplatesService } from './notification-templates.service';
import { collectParentNotifications } from '../helpers/parent-notification.helper';

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchService: NotificationDispatchService,
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  /**
   * Handles student absence alerts and notifies all linked parent guardian accounts
   * via both in-app and WhatsApp.
   */
  async handleAbsenceEvent(payload: {
    studentId: string;
    groupName?: string;
    date?: Date;
    status?: AttendanceStatus;
  }) {
    if (payload.status && payload.status !== AttendanceStatus.ABSENT) {
      return;
    }

    this.logger.log(`Processing absence notification event for student [${payload.studentId}]`);

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
    const body = this.templatesService.formatAbsenceMessage(studentName, payload.groupName, payload.date);

    const notifications = collectParentNotifications(student.parentLinks, (parentUser) => ({
      notificationType: NotificationType.ABSENCE_ALERT_PARENT,
      type: 'ABSENCE_ALERT_PARENT',
      title: '⚠️ تنبيه غياب الطالب',
      body,
      data: {
        studentId: payload.studentId,
        studentName,
        phone: parentUser.phone,
        groupName: payload.groupName,
        date: dateStr,
        sessionId: (payload as any).sessionId,
      },
      referenceEntityId: payload.studentId,
    }));

    if (notifications.length > 0) {
      await this.dispatchService.sendBatch(notifications);
    }
  }

  /**
   * Handles student absence correction/apology alerts when a student was previously
   * marked absent and is now updated to present or attended.
   */
  async handleAbsenceCorrectedEvent(payload: {
    studentId: string;
    groupName?: string;
    date?: Date;
    sessionId?: string;
  }) {
    this.logger.log(`Processing absence correction event for student [${payload.studentId}]`);

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
    const recentAbsenceAlerts = await this.prisma.notification.findMany({
      where: {
        recipientId: { in: parentUserIds },
        type: { in: ['ABSENCE_ALERT_PARENT', 'ABSENCE_CORRECTION_PARENT'] },
        referenceEntityId: payload.studentId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
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
    const body = this.templatesService.formatAbsenceApologyMessage(studentName, groupName, payload.date);

    const eligibleLinks = student.parentLinks.filter((link) => {
      const parentUserId = link.parent.user.id;
      if (latestByParent.get(parentUserId) !== 'ABSENCE_ALERT_PARENT') {
        this.logger.debug(
          `Skipping absence apology: no uncorrected alert for student [${payload.studentId}] to parent [${parentUserId}]`,
        );
        return false;
      }
      return true;
    });

    const notifications = collectParentNotifications(eligibleLinks, (parentUser) => ({
      notificationType: NotificationType.ABSENCE_ALERT_PARENT,
      type: 'ABSENCE_CORRECTION_PARENT',
      title: '🌸 تصحيح واعتذار - تأكيد حضور الطالب',
      body,
      data: {
        studentId: payload.studentId,
        studentName,
        phone: parentUser.phone,
        groupName,
        date: dateStr,
        sessionId: payload.sessionId,
      },
      referenceEntityId: payload.studentId,
    }));

    if (notifications.length > 0) {
      await this.dispatchService.sendBatch(notifications);
    }
  }

  /**
   * Handles student missing homework and notifies linked parent guardian accounts.
   */
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
    const body = this.templatesService.formatMissingHomeworkMessage(
      studentName,
      payload.assessmentTitle,
      payload.groupName,
      payload.date,
    );

    const notifications = collectParentNotifications(student.parentLinks, (parentUser) => ({
      notificationType: NotificationType.HOMEWORK_MISSING_PARENT,
      type: 'HOMEWORK_MISSING_PARENT',
      title: '⚠️ تنبيه عدم حل الواجب',
      body,
      data: {
        studentId: payload.studentId,
        phone: parentUser.phone,
      },
      referenceEntityId: payload.studentId,
    }));

    if (notifications.length > 0) {
      await this.dispatchService.sendBatch(notifications);
    }
  }

  /**
   * Handles repeated lateness and notifies linked parent guardian accounts.
   */
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
    const body = this.templatesService.formatRepeatedLatenessMessage(studentName, payload.groupName);

    const notifications = collectParentNotifications(student.parentLinks, (parentUser) => ({
      notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
      type: 'REPEATED_LATENESS_PARENT',
      title: '⏰ تنبيه تأخير متكرر',
      body,
      data: {
        studentId: payload.studentId,
        phone: parentUser.phone,
      },
      referenceEntityId: payload.studentId,
    }));

    if (notifications.length > 0) {
      await this.dispatchService.sendBatch(notifications);
    }
  }

  /**
   * Handles assessment graded notifications — notifies student and guardians.
   */
  async handleAssessmentGradedEvent(payload: {
    submissionId: string;
    assessmentId: string;
    studentId: string;
    scoreObtained: number | null;
  }) {
    this.logger.log(`Processing assessment graded notification for submission [${payload.submissionId}]`);

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

    const body = this.templatesService.formatAssessmentGradedMessage(
      student.user.fullName,
      assessment.title,
      scoreDisplay,
    );

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

    const parentNotifications = collectParentNotifications(student.parentLinks, (parentUser) => ({
      notificationType: isFailed
        ? NotificationType.EXAM_FAILED_ALERT_PARENT
        : NotificationType.GENERAL_ANNOUNCEMENT,
      type: isFailed ? 'EXAM_FAILED_ALERT_PARENT' : 'EXAM_PASSED_ALERT_PARENT',
      title: isFailed ? '❌ تنبيه: درجات الاختبار' : '📊 نتيجة الاختبار',
      body,
      data: {
        studentId: payload.studentId,
        assessmentId: payload.assessmentId,
        phone: parentUser.phone,
        score: payload.scoreObtained,
      },
      referenceEntityId: payload.assessmentId,
    }));

    notificationsToDispatch.push(...parentNotifications);
    await this.dispatchService.sendBatch(notificationsToDispatch);
  }

  /**
   * Handles payment received confirmation — dispatches receipt to guardians.
   */
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

    const notifications = collectParentNotifications(links as any, (parentUser) => {
      const parentName = parentUser.fullName || 'ولي الأمر المحترم';
      const messageBody = this.templatesService.formatPaymentReceived({
        parentName,
        studentName: payload.studentName,
        amount: payload.amountPaid,
        currency: payload.currency || 'جنيه',
        paymentType: paymentTypeText,
        invoiceNumber: payload.receiptNumber,
        paymentMethod: payload.paymentMethod || 'نقدي / السنتر',
        remainingBalance: payload.remainingBalance ?? 0,
      });

      return {
        notificationType: NotificationType.PAYMENT_RECEIVED_PARENT,
        type: 'PAYMENT_RECEIVED_PARENT',
        title: `🧾 إيصال دفع: تم سداد ${payload.amountPaid} ${payload.currency || 'جنيه'} بنجاح`,
        body: messageBody,
        extraChannels: [NotificationChannel.WEB_PUSH],
        data: {
          studentId: payload.studentId,
          studentName: payload.studentName,
          amount: String(payload.amountPaid),
          phone: parentUser.phone || undefined,
          paymentType: payload.paymentType,
          receiptNumber: payload.receiptNumber,
          url: `/parent-access`,
        },
      };
    });

    if (notifications.length > 0) {
      await this.dispatchService.sendBatch(notifications);
    }
  }
}
