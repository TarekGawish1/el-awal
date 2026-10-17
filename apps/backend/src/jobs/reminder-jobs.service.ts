import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { NotificationsService, SendNotificationDto } from '../modules/notifications/services/notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { ClusterService } from '../core/cluster/cluster.service';
import { getSessionUtcDate } from './scheduler-timezone.util';

@Injectable()
export class ReminderJobsService {
  private readonly logger = new Logger(ReminderJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Optional() private readonly clusterService?: ClusterService,
  ) {}

  /**
   * Notifies students enrolled in sessions starting in 45–60 minutes.
   */
  async runStudentSessionReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);

    this.logger.debug(`[StudentReminder] Scanning sessions ${windowStart.toISOString()} – ${windowEnd.toISOString()}`);

    try {
      const scanStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const scanEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);

      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          sessionDate: { gte: scanStart, lte: scanEnd },
          isCancelled: false,
        },
        include: {
          group: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: {
                  student: {
                    include: {
                      user: { select: { id: true, fullName: true } },
                      parentLinks: {
                        include: {
                          parent: {
                            include: {
                              user: { select: { id: true, phone: true } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const targetSessions = sessions.filter((s) => {
        if (!s.startTime) return false;
        const sessionUtc = getSessionUtcDate(s.sessionDate, s.startTime);
        return sessionUtc >= windowStart && sessionUtc <= windowEnd;
      });

      this.logger.log(`[StudentReminder] Found ${targetSessions.length} session(s) in window`);

      const targetSessionIds = targetSessions.map((s) => s.id);
      const allStudentUserIds: string[] = [];
      for (const session of targetSessions) {
        for (const enrollment of session.group.enrollments) {
          if (enrollment.student?.user?.id) {
            allStudentUserIds.push(enrollment.student.user.id);
          }
        }
      }

      const sentNotifications =
        targetSessionIds.length > 0 && allStudentUserIds.length > 0
          ? await this.prisma.notification.findMany({
              where: {
                recipientId: { in: allStudentUserIds },
                notificationType: NotificationType.SESSION_REMINDER_STUDENT,
                referenceEntityId: { in: targetSessionIds },
              },
              select: { recipientId: true, referenceEntityId: true },
            })
          : [];

      const visitedStudentSessions = new Set<string>(
        sentNotifications.map((n) => `${n.recipientId}:${n.referenceEntityId}`),
      );
      const remindersToDispatch: SendNotificationDto[] = [];

      for (const session of targetSessions) {
        const timeStr = session.startTime || '';

        for (const enrollment of session.group.enrollments) {
          const student = enrollment.student;
          const studentUser = student?.user;
          if (!studentUser?.id) continue;

          const dedupKey = `${studentUser.id}:${session.id}`;
          if (visitedStudentSessions.has(dedupKey)) continue;
          visitedStudentSessions.add(dedupKey);

          remindersToDispatch.push({
            recipientId: studentUser.id,
            notificationType: NotificationType.SESSION_REMINDER_STUDENT,
            type: 'SESSION_REMINDER_STUDENT',
            title: '📅 تذكير: حصة دراسية قريباً',
            body: `تذكير: لديك حصة في مجموعة (${session.group.name}) الساعة ${timeStr} اليوم.`,
            referenceEntityId: session.id,
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
            data: {
              sessionId: session.id,
              groupId: session.groupId,
              groupName: session.group.name,
              startTime: timeStr,
            },
          });
        }
      }

      if (remindersToDispatch.length > 0) {
        await this.notifications.sendBatch(remindersToDispatch);
      }
    } catch (error) {
      this.logger.error('[StudentReminder] Error in cron job', error);
    }
  }

  /**
   * Notifies students with online exams starting in the next 60 minutes.
   */
  async runOnlineExamReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);

    this.logger.debug(`[ExamReminder] Scanning online exams until ${windowEnd.toISOString()}`);

    try {
      const exams = await this.prisma.assessment.findMany({
        where: {
          type: 'EXAM',
          isPublished: true,
          startDate: { gte: now, lte: windowEnd },
        },
        include: {
          submissions: {
            select: { studentId: true },
          },
          targetGroups: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: {
                  student: {
                    include: {
                      user: { select: { id: true, fullName: true } },
                      parentLinks: {
                        include: {
                          parent: {
                            include: {
                              user: { select: { id: true, phone: true } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      this.logger.log(`[ExamReminder] Found ${exams.length} upcoming exam(s) in window`);

      if (exams.length > 0 && this.clusterService) {
        this.logger.log(
          `⚡ [ExamReminder] Found ${exams.length} active online exam(s). Priming Worker 2 for peak concurrent throughput...`,
        );
        await this.clusterService.scaleUp(120);
      }

      const targetExamIds = exams.map((e) => e.id);
      const allExamStudentUserIds: string[] = [];
      for (const exam of exams) {
        for (const group of exam.targetGroups) {
          for (const enrollment of group.enrollments) {
            if (enrollment.student?.user?.id) {
              allExamStudentUserIds.push(enrollment.student.user.id);
            }
          }
        }
      }

      const sentExamNotifications =
        targetExamIds.length > 0 && allExamStudentUserIds.length > 0
          ? await this.prisma.notification.findMany({
              where: {
                recipientId: { in: allExamStudentUserIds },
                notificationType: NotificationType.ONLINE_EXAM_REMINDER,
                referenceEntityId: { in: targetExamIds },
              },
              select: { recipientId: true, referenceEntityId: true },
            })
          : [];

      const visitedExamStudents = new Set<string>(
        sentExamNotifications.map((n) => `${n.recipientId}:${n.referenceEntityId}`),
      );
      const examRemindersToDispatch: SendNotificationDto[] = [];

      for (const exam of exams) {
        const startTimeStr = exam.startDate?.toLocaleTimeString('ar-EG', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
        });

        const alreadySubmittedIds = new Set(exam.submissions.map((s) => s.studentId));

        for (const group of exam.targetGroups) {
          for (const enrollment of group.enrollments) {
            const student = enrollment.student;
            if (!student?.user?.id) continue;
            if (alreadySubmittedIds.has(student.id)) continue;

            const dedupKey = `${student.user.id}:${exam.id}`;
            if (visitedExamStudents.has(dedupKey)) continue;
            visitedExamStudents.add(dedupKey);

            examRemindersToDispatch.push({
              recipientId: student.user.id,
              notificationType: NotificationType.ONLINE_EXAM_REMINDER,
              type: 'ONLINE_EXAM_REMINDER',
              title: '⏰ تذكير: امتحان أونلاين قريباً',
              body: `تذكير: امتحان (${exam.title}) يبدأ الساعة ${startTimeStr}. تأكد من جهازك وإنترنتك.`,
              referenceEntityId: exam.id,
              channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
              data: {
                examId: exam.id,
                startDate: exam.startDate?.toISOString(),
              },
            });
          }
        }
      }

      if (examRemindersToDispatch.length > 0) {
        await this.notifications.sendBatch(examRemindersToDispatch);
      }
    } catch (error) {
      this.logger.error('[ExamReminder] Error in cron job', error);
    }
  }

  /**
   * Sends teachers a pre-session reminder 15 minutes before each class.
   */
  async runTeacherSessionReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 10 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 20 * 60 * 1000);

    try {
      const scanStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const scanEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000);

      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          sessionDate: { gte: scanStart, lte: scanEnd },
          isCancelled: false,
        },
        include: {
          group: {
            include: {
              teacher: {
                include: {
                  user: { select: { id: true, fullName: true, phone: true } },
                },
              },
            },
          },
        },
      });

      const targetSessions = sessions.filter((s) => {
        if (!s.startTime) return false;
        const sessionUtc = getSessionUtcDate(s.sessionDate, s.startTime);
        return sessionUtc >= windowStart && sessionUtc <= windowEnd;
      });

      const targetSessionIds = targetSessions.map((s) => s.id);
      const allTeacherUserIds = targetSessions
        .map((s) => s.group.teacher?.user?.id)
        .filter(Boolean) as string[];

      const sentTeacherReminders =
        targetSessionIds.length > 0 && allTeacherUserIds.length > 0
          ? await this.prisma.notification.findMany({
              where: {
                recipientId: { in: allTeacherUserIds },
                notificationType: NotificationType.TEACHER_SESSION_REMINDER,
                referenceEntityId: { in: targetSessionIds },
              },
              select: { recipientId: true, referenceEntityId: true },
            })
          : [];

      const visitedTeacherSessions = new Set<string>(
        sentTeacherReminders.map((n) => `${n.recipientId}:${n.referenceEntityId}`),
      );
      const teacherRemindersToDispatch: SendNotificationDto[] = [];

      for (const session of targetSessions) {
        const teacher = session.group.teacher;
        const teacherUser = teacher?.user;
        if (!teacherUser?.id) continue;

        const dedupKey = `${teacherUser.id}:${session.id}`;
        if (visitedTeacherSessions.has(dedupKey)) continue;
        visitedTeacherSessions.add(dedupKey);

        const channels: NotificationChannel[] = [
          NotificationChannel.IN_APP,
          NotificationChannel.WEB_PUSH,
        ];

        teacherRemindersToDispatch.push({
          recipientId: teacherUser.id,
          notificationType: NotificationType.TEACHER_SESSION_REMINDER,
          type: 'TEACHER_SESSION_REMINDER',
          title: '🔔 تذكير: حصة بعد 15 دقيقة',
          body: `حصة مجموعة (${session.group.name}) تبدأ الساعة ${session.startTime}. الرجاء الاستعداد.`,
          channels,
          referenceEntityId: session.id,
          data: {
            phone: teacherUser.phone,
            sessionId: session.id,
            groupId: session.groupId,
            groupName: session.group.name,
            startTime: session.startTime,
          },
        });
      }

      if (teacherRemindersToDispatch.length > 0) {
        await this.notifications.sendBatch(teacherRemindersToDispatch);
      }
    } catch (error) {
      this.logger.error('[TeacherReminder] Error in cron job', error);
    }
  }
}
