import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { NotificationsService } from '../modules/notifications/services/notifications.service';
import { NotificationSettingsService } from '../modules/notifications/services/notification-settings.service';
import {
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import * as cron from 'node-cron';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service';

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
// ─── Cairo Timezone Helpers ──────────────────────────────────────────────────

/**
 * Computes the exact UTC Date corresponding to a sessionDate (Date or YYYY-MM-DD string)
 * and a startTime ("HH:mm") in the 'Africa/Cairo' timezone.
 */
function getSessionUtcDate(sessionDate: Date | string, startTime: string): Date {
  const dateStr =
    sessionDate instanceof Date
      ? sessionDate.toISOString().split('T')[0]
      : String(sessionDate).split('T')[0];

  const [hours, minutes] = (startTime || '00:00').split(':').map(Number);

  // Cairo is UTC+2 (standard) or UTC+3 (Daylight Saving Time).
  // Compute the exact offset in hours for that date using Intl:
  const refDate = new Date(`${dateStr}T12:00:00Z`);
  const cairoHourStr = refDate.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: 'numeric',
  });
  const cairoHour = parseInt(cairoHourStr, 10);
  const diffHours = cairoHour - 12; // 2 or 3

  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hours - diffHours, minutes, 0, 0));
}

/**
 * Returns today's YYYY-MM-DD date string in 'Africa/Cairo'.
 */
function getCairoTodayString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

/**
 * Returns the start (00:00:00.000) and end (23:59:59.999) of today in 'Africa/Cairo' as UTC Date objects.
 */
function getCairoTodayBounds(): { start: Date; end: Date; dateStr: string } {
  const dateStr = getCairoTodayString();
  const [y, m, d] = dateStr.split('-').map(Number);

  const refDate = new Date(`${dateStr}T12:00:00Z`);
  const cairoHourStr = refDate.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: 'numeric',
  });
  const diffHours = parseInt(cairoHourStr, 10) - 12;

  const start = new Date(Date.UTC(y, m - 1, d, 0 - diffHours, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23 - diffHours, 59, 59, 999));
  return { start, end, dateStr };
}

@Injectable()
export class SchedulersService implements OnModuleInit {
  private readonly logger = new Logger(SchedulersService.name);
  private readonly tasks: cron.ScheduledTask[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settingsService: NotificationSettingsService,
    private readonly whatsapp: WhatsAppService,
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

    // 3. Teacher morning daily schedule (every day at 07:00 Africa/Cairo)
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

    // 5. Keep-alive self-ping (every 14 minutes)
    //    Prevents Heroku Eco dyno from sleeping after 30 min of inactivity.
    //    When the dyno sleeps, the Baileys WhatsApp socket disconnects and the
    //    first registration request after wake-up would get 'not_connected'.
    this.tasks.push(
      cron.schedule(
        '*/14 * * * *',
        () => this.runKeepAlivePing(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    this.logger.log(`✅ ${this.tasks.length} cron schedulers active`);
  }

  // ─── Scheduler Methods ────────────────────────────────────────────────────

  /**
   * Self-ping the app's health endpoint to prevent Heroku Eco dyno sleep.
   * Dyno sleeps after 30 min of inactivity — this runs every 14 min to prevent it.
   * When the dyno sleeps the Baileys WA socket disconnects, causing 'not_connected'
   * errors on the first registration after wakeup.
   */
  private runKeepAlivePing(): void {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '';
    if (!appUrl) {
      // No URL configured — skip silently (local dev)
      return;
    }

    try {
      const targetUrl = `${appUrl.replace(/\/$/, '')}/api/health`;
      const lib = targetUrl.startsWith('https') ? require('https') : require('http');
      const req = lib.get(targetUrl, (res: any) => {
        this.logger.debug(`[KeepAlive] Ping ${targetUrl} → HTTP ${res.statusCode}`);
        res.resume(); // consume response so socket closes
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
   * Notifies students enrolled in sessions starting in 45–60 minutes.
   * Also notifies linked parents via WhatsApp.
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

      // Filter to sessions within our 45–60 minute window using Cairo local time conversion
      const targetSessions = sessions.filter((s) => {
        if (!s.startTime) return false;
        const sessionUtc = getSessionUtcDate(s.sessionDate, s.startTime);
        return sessionUtc >= windowStart && sessionUtc <= windowEnd;
      });

      this.logger.log(
        `[StudentReminder] Found ${targetSessions.length} session(s) in window`,
      );

      for (const session of targetSessions) {
        const timeStr = session.startTime || '';
        for (const enrollment of session.group.enrollments) {
          const student = enrollment.student;
          const studentUser = student.user;

          // Deduplicate: avoid sending twice for the same session to the same student
          const alreadySent = await this.prisma.notification.findFirst({
            where: {
              recipientId: studentUser.id,
              notificationType: NotificationType.SESSION_REMINDER_STUDENT,
              referenceEntityId: session.id,
            },
          });
          if (alreadySent) continue;

          // Notify student in-app and web push
          await this.notifications.sendNotification({
            recipientId: studentUser.id,
            notificationType: NotificationType.SESSION_REMINDER_STUDENT,
            type: 'SESSION_REMINDER_STUDENT',
            title: '📅 تذكير: حصة دراسية قريباً',
            body: `تذكير: لديك حصة في مجموعة (${session.group.name}) الساعة ${timeStr} اليوم.`,
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
            referenceEntityId: session.id,
            data: {
              sessionId: session.id,
              groupId: session.groupId,
              groupName: session.group.name,
              startTime: timeStr,
            },
          });
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
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
        });

        const alreadySubmittedIds = new Set(exam.submissions.map((s) => s.studentId));

        for (const group of exam.targetGroups) {
          for (const enrollment of group.enrollments) {
            const student = enrollment.student;
            // Skip students who already submitted
            if (alreadySubmittedIds.has(student.id)) continue;

            const alreadySent = await this.prisma.notification.findFirst({
              where: {
                recipientId: student.user.id,
                notificationType: NotificationType.ONLINE_EXAM_REMINDER,
                referenceEntityId: exam.id,
              },
            });
            if (alreadySent) continue;

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
              referenceEntityId: exam.id,
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
   * @param force If true, bypasses deduplication and sends even if 0 sessions scheduled (e.g. manual/test trigger).
   */
  async runTeacherDailySchedule(force = false): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
    this.logger.log(`[TeacherSchedule] Compiling daily agendas (force=${force})...`);
    let dispatchedCount = 0;

    try {
      const { start, end, dateStr } = getCairoTodayBounds();

      const teachers = await this.prisma.teacherProfile.findMany({
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
        },
      });

      for (const teacher of teachers) {
        // Deduplicate: ensure teacher receives at most one morning agenda per day unless forced
        if (!force) {
          const alreadySentToday = await this.prisma.notification.findFirst({
            where: {
              recipientId: teacher.user.id,
              notificationType: NotificationType.TEACHER_DAILY_SCHEDULE,
              createdAt: { gte: start, lte: end },
            },
          });
          if (alreadySentToday) continue;
        }

        // Query candidate sessions around today's window
        let sessions = await this.prisma.lessonSession.findMany({
          where: {
            group: { teacherId: teacher.id },
            sessionDate: { gte: start, lte: end },
            isCancelled: false,
          },
          include: { group: { select: { name: true, gradeLevel: true } } },
          orderBy: { startTime: 'asc' },
        });

        // If forced and 0 sessions for today, pull latest active group sessions for demonstration
        if (sessions.length === 0 && force) {
          sessions = await this.prisma.lessonSession.findMany({
            where: {
              group: { teacherId: teacher.id },
              isCancelled: false,
            },
            include: { group: { select: { name: true, gradeLevel: true } } },
            orderBy: { startTime: 'asc' },
            take: 3,
          });
        }

        if (sessions.length === 0 && !force) continue;

        const agendaLines = sessions.length > 0
          ? sessions.map(
              (s, i) => `${s.group.name} (${s.group.gradeLevel}) — الساعة ${s.startTime || '—'}`,
            )
          : ['لا توجد حصص مجدولة لهذا اليوم'];

        const body = [
          `صباح الخير أستاذ ${teacher.user.fullName} 👋`,
          `جدولك اليوم (${dateStr}):`,
          ...agendaLines.map((l, i) => `${i + 1}. ${l}`),
          `\nبالتوفيق في يومك! 🌟`,
        ].join('\n');

        const settings = await this.settingsService.getSettings();
        const targetPhone = settings.teacherRecipientPhone?.trim() || teacher.user.phone;

        const channels: NotificationChannel[] = [
          NotificationChannel.IN_APP,
          NotificationChannel.WEB_PUSH,
        ];
        if (targetPhone) {
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
            phone: targetPhone,
            teacherName: teacher.user.fullName,
            date: dateStr,
            sessionCount: sessions.length,
            sessions: agendaLines,
          },
        });

        if (targetPhone && force) {
          const waResult = await this.whatsapp.sendTrackedProtectedMessage(targetPhone, body);
          this.logger.log(
            `[TeacherSchedule] Direct WhatsApp dispatch to ${targetPhone}: outcome=${waResult.outcome}, reason=${waResult.failureReason || 'OK'}`,
          );
          if (waResult.outcome !== 'sent') {
            return {
              success: false,
              message: `تعذر إرسال رسالة الواتساب: ${waResult.failureReason || waResult.outcome}`,
              dispatchedCount: 0,
            };
          }
        }

        dispatchedCount++;
      }

      return {
        success: true,
        message: `تم إرسال الجدول اليومي عبر الواتساب والإشعارات بنجاح (${dispatchedCount} معلم)`,
        dispatchedCount,
      };
    } catch (error: any) {
      this.logger.error('[TeacherSchedule] Error in cron job', error);
      return {
        success: false,
        message: error?.message || 'فشل إرسال الجدول اليومي',
        dispatchedCount: 0,
      };
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

      for (const session of targetSessions) {
        const teacher = session.group.teacher;
        const teacherUser = teacher.user;

        // Deduplicate: avoid sending twice for the same session
        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            recipientId: teacherUser.id,
            notificationType: NotificationType.TEACHER_SESSION_REMINDER,
            referenceEntityId: session.id,
          },
        });
        if (alreadySent) continue;

        const channels: NotificationChannel[] = [
          NotificationChannel.IN_APP,
          NotificationChannel.WEB_PUSH,
        ];

        await this.notifications.sendNotification({
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
    } catch (error) {
      this.logger.error('[TeacherReminder] Error in cron job', error);
    }
  }
}

