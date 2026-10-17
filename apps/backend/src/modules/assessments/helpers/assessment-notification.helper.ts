import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  AssessmentType,
  GroupEnrollmentStatus,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';

export async function notifyAssessmentPublished(
  prisma: PrismaService,
  notifications: NotificationsService | undefined,
  assessment: {
    id: string;
    title: string;
    type: AssessmentType;
    assessmentType?: AssessmentType | null;
    totalScore: unknown;
    groupId?: string | null;
    isPublished: boolean;
    deadline?: Date | null;
    dueDate?: Date | null;
  },
  logger: Logger,
) {
  if (!notifications || !assessment.isPublished || !assessment.groupId) return;

  const isHomework =
    assessment.assessmentType === AssessmentType.HOMEWORK ||
    assessment.type === AssessmentType.ASSIGNMENT;
  const isExam =
    assessment.assessmentType === AssessmentType.EXAM ||
    assessment.assessmentType === AssessmentType.QUIZ ||
    assessment.type === AssessmentType.EXAM;
  if (!isHomework && !isExam) return;

  try {
    const [group, enrollments] = await Promise.all([
      prisma.academicGroup.findUnique({
        where: { id: assessment.groupId },
        select: { name: true },
      }),
      prisma.groupEnrollment.findMany({
        where: { groupId: assessment.groupId, status: GroupEnrollmentStatus.ACTIVE },
        select: { student: { select: { id: true, user: { select: { id: true } } } } },
      }),
    ]);

    const targetUserIds = enrollments
      .map(
        (enrollment) =>
          enrollment.student?.user?.id ||
          (enrollment.student as { userId?: string })?.userId ||
          enrollment.student?.id,
      )
      .filter((id): id is string => Boolean(id));
    if (targetUserIds.length === 0) return;

    const notificationType = isHomework
      ? NotificationType.NEW_HOMEWORK_ASSIGNED
      : NotificationType.NEW_EXAM_PUBLISHED;
    const groupName = group?.name || 'مجموعتك الدراسية';
    const deadline = assessment.deadline || assessment.dueDate;
    const deadlineText = deadline
      ? deadline.toLocaleString('ar-EG', {
          timeZone: 'Africa/Cairo',
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : 'غير محدد';
    const body = isHomework
      ? `تمت إضافة واجب جديد لمجموعتك (${groupName}). آخر موعد للتسليم: ${deadlineText}.`
      : `تم نشر اختبار جديد لمجموعتك (${groupName}). الدرجة: ${Number(assessment.totalScore)} درجة.`;

    await notifications.dispatchToUsers(
      targetUserIds,
      {
        notificationType,
        title: isHomework
          ? `📝 واجب جديد: ${assessment.title}`
          : `📋 اختبار جديد: ${assessment.title}`,
        body,
        referenceEntityId: assessment.id,
        data: {
          assessmentId: assessment.id,
          groupId: assessment.groupId,
          groupName,
          deadline: deadline?.toISOString(),
          priority: 'high',
        },
      },
      [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
    );
  } catch (error) {
    logger.error(`Failed to notify students about assessment [${assessment.id}]`, error);
  }
}
