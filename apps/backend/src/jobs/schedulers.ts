import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { NotificationsService } from '../modules/notifications/services/notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import * as cron from 'node-cron';

/**
 * SchedulersService — automated cron jobs for the El-Awal notification engine.
 *
 * All crons run inside the same NestJS process (no separate worker dyno needed on Heroku).
 * Timezone: Africa/Cairo (UTC+2 / UTC+3 DST)
 *
 * Active schedules:
 * 1. Every 15 min  — SESSION_REMINDER_STUDENT (45–60 min window)
 * 2. Every 15 min  — ONLINE_EXAM_REMINDER (60 min window)
 * 3. Daily 07:00   — TEACHER_DAILY_SCHEDULE (morning agenda)
 * 4. Every 5 min   — TEACHER_SESSION_REMINDER (15 min window)
 */
@Injectable()
export class SchedulersService implements OnModuleInit {
  private readonly logger = new Logger(SchedulersService.name);
  private readonly tasks: cron.ScheduledTask[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.logger.log('⏰ Initializing cron schedulers...');

    // 1. Student session reminder (every 15 minutes)
    this.tasks.push(
      cron.schedule(
        '*/15 * * * *',
        () => this.runStudentSessionReminders(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    // 2. Online exam reminder (every 15 minutes)
    this.tasks.push(
      cron.schedule(
        '*/15 * * * *',
        () => this.runOnlineExamReminders(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    // 3. Teacher morning daily schedule (every day at 07:00)
    this.tasks.push(
      cron.schedule(
        '0 7 * * *',
        () => this.runTeacherDailySchedule(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    // 4. Teacher pre-session reminder (every 5 minutes)
    this.tasks.push(
      cron.schedule(
        '*/5 * * * *',
        () => this.runTeacherSessionReminders(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    this.logger.log(`✅ ${this.tasks.length} cron schedulers active`);
  }

  // ─── Scheduler Methods ────────────────────────────────────────────────────

  /**
   * Notifies students enrolled in sessions starting in 45–60 minutes.
   * Also notifies linked parents via WhatsApp.
   */
  async runStudentSessionReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);

    this.logger.debug(`[StudentReminder] Scanning sessions ${windowStart.toISOString()} – ${windowEnd.toISOString()}`);

    try {
      // Find sessions starting in the next 45–60 minutes
      // Sessions use DATE + TIME string fields, so we need to match carefully
      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          sessionDate: {
            gte: new Date(now.toISOString().split('T')[0]),
            lte: new Date(
              new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            ),
          },
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

      // Filter to sessions within our 45–60 minute window
      const targetSessions = sessions.filter((s) => {
        if (!s.startTime) return false;
        const [hours, minutes] = s.startTime.split(':').map(Number);
        const sessionDateTime = new Date(s.sessionDate);
        sessionDateTime.setHours(hours, minutes, 0, 0);
        return sessionDateTime >= windowStart && sessionDateTime <= windowEnd;
      });

      this.logger.log(
        `[StudentReminder] Found ${targetSessions.length} session(s) in window`,
      );

      for (const session of targetSessions) {
        const timeStr = session.startTime || '';
        for (const enrollment of session.group.enrollments) {
          const student = enrollment.student;
          const studentUser = student.user;

          // Notify student in-app
          await this.notifications.sendNotification({
            recipientId: studentUser.id,
            notificationType: NotificationType.SESSION_REMINDER_STUDENT,
            type: 'SESSION_REMINDER_STUDENT',
            title: '📅 تذكير: حصة دراسية قريباً',
            body: `تذكير: لديك حصة في مجموعة (${session.group.name}) الساعة ${timeStr} اليوم.`,
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
            data: {
              sessionId: session.id,
              groupId: session.groupId,
              groupName: session.group.name,
              startTime: timeStr,
            },
          });

          // Notify parents via WhatsApp
          for (const link of student.parentLinks) {
            const parentUser = link.parent.user;
            if (!parentUser.phone) continue;

            await this.notifications.sendNotification({
              recipientId: parentUser.id,
              notificationType: NotificationType.SESSION_REMINDER_STUDENT,
              type: 'SESSION_REMINDER_STUDENT',
              title: '📅 تذكير: حصة دراسية للطالب',
              body: `تذكير: لدى الطالب ${studentUser.fullName} حصة في مجموعة (${session.group.name}) الساعة ${timeStr} اليوم.`,
              channels: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
              data: {
                sessionId: session.id,
                studentId: student.id,
                phone: parentUser.phone,
              },
            });
          }
        }
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

      this.logger.log(
        `[ExamReminder] Found ${exams.length} upcoming exam(s) in window`,
      );

      for (const exam of exams) {
        const startTimeStr = exam.startDate?.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const alreadySubmittedIds = new Set(exam.submissions.map((s) => s.studentId));

        for (const group of exam.targetGroups) {
          for (const enrollment of group.enrollments) {
            const student = enrollment.student;
            // Skip students who already submitted
            if (alreadySubmittedIds.has(student.id)) continue;

            await this.notifications.sendNotification({
              recipientId: student.user.id,
              notificationType: NotificationType.ONLINE_EXAM_REMINDER,
              type: 'ONLINE_EXAM_REMINDER',
              title: '⏰ تذكير: امتحان أونلاين قريباً',
              body: `تذكير: امتحان (${exam.title}) يبدأ الساعة ${startTimeStr}. تأكد من جهازك وإنترنتك.`,
              channels: [
                NotificationChannel.IN_APP,
                NotificationChannel.WEB_PUSH,
              ],
              data: {
                examId: exam.id,
                studentId: student.id,
                startDate: exam.startDate?.toISOString(),
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('[ExamReminder] Error in cron job', error);
    }
  }

  /**
   * Sends each teacher a morning agenda with their sessions for today.
   * Runs daily at 07:00 Africa/Cairo.
   */
  async runTeacherDailySchedule(): Promise<void> {
    this.logger.log('[TeacherSchedule] Compiling daily agendas...');

    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const teachers = await this.prisma.teacherProfile.findMany({
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
        },
      });

      for (const teacher of teachers) {
        const sessions = await this.prisma.lessonSession.findMany({
          where: {
            group: { teacherId: teacher.id },
            sessionDate: new Date(todayStr),
            isCancelled: false,
          },
          include: { group: { select: { name: true, gradeLevel: true } } },
          orderBy: { startTime: 'asc' },
        });

        if (sessions.length === 0) continue;

        const agendaLines = sessions.map(
          (s, i) =>
            `${i + 1}. ${s.group.name} (${s.group.gradeLevel}) — الساعة ${s.startTime || '—'}`,
        );

        const body = [
          `صباح الخير أستاذ ${teacher.user.fullName} 👋`,
          `جدولك اليوم (${todayStr}):`,
          ...agendaLines,
          `\nبالتوفيق في يومك! 🌟`,
        ].join('\n');

        const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
        if (teacher.user.phone) {
          channels.push(NotificationChannel.WHATSAPP);
        }

        await this.notifications.sendNotification({
          recipientId: teacher.user.id,
          notificationType: NotificationType.TEACHER_DAILY_SCHEDULE,
          type: 'TEACHER_DAILY_SCHEDULE',
          title: `📋 جدولك اليوم — ${sessions.length} حصة`,
          body,
          channels,
          data: {
            phone: teacher.user.phone,
            date: todayStr,
            sessionCount: sessions.length,
          },
        });
      }
    } catch (error) {
      this.logger.error('[TeacherSchedule] Error in cron job', error);
    }
  }

  /**
   * Sends teachers a pre-session reminder 15 minutes before each class.
   * Runs every 5 minutes.
   */
  async runTeacherSessionReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 10 * 60 * 1000); // 10 min from now
    const windowEnd = new Date(now.getTime() + 20 * 60 * 1000);   // 20 min from now

    try {
      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          sessionDate: {
            gte: new Date(now.toISOString().split('T')[0]),
            lte: new Date(
              new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            ),
          },
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
        const [hours, minutes] = s.startTime.split(':').map(Number);
        const sessionDateTime = new Date(s.sessionDate);
        sessionDateTime.setHours(hours, minutes, 0, 0);
        return sessionDateTime >= windowStart && sessionDateTime <= windowEnd;
      });

      for (const session of targetSessions) {
        const teacher = session.group.teacher;
        const teacherUser = teacher.user;

        const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
        if (teacherUser.phone) channels.push(NotificationChannel.WHATSAPP);

        await this.notifications.sendNotification({
          recipientId: teacherUser.id,
          notificationType: NotificationType.TEACHER_SESSION_REMINDER,
          type: 'TEACHER_SESSION_REMINDER',
          title: '🔔 تذكير: حصة بعد 15 دقيقة',
          body: `حصة مجموعة (${session.group.name}) تبدأ الساعة ${session.startTime}. الرجاء الاستعداد.`,
          channels,
          data: {
            phone: teacherUser.phone,
            sessionId: session.id,
            groupId: session.groupId,
            groupName: session.group.name,
            startTime: session.startTime,
          },
        });
      }
    } catch (error) {
      this.logger.error('[TeacherReminder] Error in cron job', error);
    }
  }
}
