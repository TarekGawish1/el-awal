import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { NotificationsService, SendNotificationDto } from '../modules/notifications/services/notifications.service';
import { NotificationSettingsService } from '../modules/notifications/services/notification-settings.service';
import {
  NotificationChannel,
  NotificationType,
  AttendanceStatus,
  RecordingMethod,
  GroupEnrollmentStatus,
} from '@prisma/client';
import * as cron from 'node-cron';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service';
import { WhatsAppDispatcherService } from '../modules/whatsapp/services/whatsapp-dispatcher.service';
import { formatTeacherAgendaMessage } from '../utils/spintax';
import { StorageCleanupService } from '../integrations/storage/storage-cleanup.service';
import { ClusterService } from '../core/cluster/cluster.service';

/**
 * SchedulersService — automated cron jobs for the El-Awal notification engine.
 *
 * All crons run inside the same NestJS process (no separate worker dyno needed on Heroku).
 * Timezone: Africa/Cairo (UTC+2 / UTC+3 DST)
 *
 * ─── لماذا تعمل الجوبات كل 5/15 دقيقة وليس مرة واحدة؟ ──────────────────────
 * الجوبات المتعلقة بالتذكيرات (session reminders, exam reminders) تعمل بشكل متكرر
 * لأنها تبحث عن "نافذة زمنية" (time window) — مثلاً: "حصص تبدأ خلال 45-60 دقيقة".
 * لو اشتغلت مرة واحدة في اليوم، كانت هتفوّت حصص الساعة 3 عصراً أو 7 مساءً.
 * بالتكرار كل 15 دقيقة → تضمن إنها تغطي الحصص في أي وقت طول اليوم.
 * التكرار لا يسبب رسائل مضاعفة بفضل الـ deduplication check (findFirst by sessionId+userId).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Active schedules:
 * 1. Every 15 min      — SESSION_REMINDER_STUDENT (45–60 min window)
 * 2. Every 15 min      — ONLINE_EXAM_REMINDER (60 min window)
 * 3. Daily 07:00       — TEACHER_DAILY_SCHEDULE (morning agenda)
 * 4. Every 5 min       — TEACHER_SESSION_REMINDER (15 min window)
 * 5. Every 14 min      — Heroku keep-alive ping
 * 6. Daily 03:00       — CLOUDFLARE_R2_ORPHAN_CLEANUP (purges unlinked files)
 * 7. Daily 23:00       — AUTO_ATTENDANCE_PRESENT (marks unrecorded students as PRESENT)
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
    private readonly whatsappDispatcher: WhatsAppDispatcherService,
    @Optional() private readonly storageCleanup?: StorageCleanupService,
    @Optional() private readonly clusterService?: ClusterService,
  ) {}

  onModuleInit() {
    if (this.clusterService && !this.clusterService.isPrimaryWorker()) {
      this.logger.log(
        `⏰ [SchedulersService] Running inside secondary worker (Worker ID: ${this.clusterService.getWorkerId()}). Skipping cron schedulers to prevent duplicates.`,
      );
      return;
    }

    this.logger.log('⏰ Initializing cron schedulers (Primary Worker)...');

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

    // 6. Daily Cloudflare R2 orphan cleanup (every day at 03:00 Africa/Cairo)
    this.tasks.push(
      cron.schedule(
        '0 3 * * *',
        () => this.runStorageOrphanCleanup(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    // 7. Auto-attendance: mark unrecorded students as PRESENT (daily at 23:00 Africa/Cairo)
    //    Covers any session that ended > 1 hour ago and still has students with no record.
    this.tasks.push(
      cron.schedule(
        '0 23 * * *',
        () => this.runAutoAttendancePresent(),
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

      // Pre-fetch all sent notifications in one batch query
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

          // Visited Set pattern: avoid sending twice for the same session to the same student
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

      // OUTSIDE ALL LOOPS: single batch dispatch for all sessions and students
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

      this.logger.log(
        `[ExamReminder] Found ${exams.length} upcoming exam(s) in window`,
      );

      // Auto-scale up to dual-worker mode on the same server if there are upcoming exams in this window
      if (exams.length > 0 && this.clusterService) {
        this.logger.log(
          `⚡ [ExamReminder] Found ${exams.length} active online exam(s). Priming Worker 2 for peak concurrent throughput...`,
        );
        await this.clusterService.scaleUp(120);
      }

      // Pre-fetch all sent online exam reminder notifications in one batch query
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
            // Skip students who already submitted
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

      // OUTSIDE ALL LOOPS: single batch dispatch for all exams and students
      if (examRemindersToDispatch.length > 0) {
        await this.notifications.sendBatch(examRemindersToDispatch);
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

      const teacherUserIds = teachers.map((t) => t.user.id);
      const teacherIds = teachers.map((t) => t.id);

      // 1. Batch prefetch already sent notifications today
      const alreadySentTodayList =
        force || teacherUserIds.length === 0
          ? []
          : await this.prisma.notification.findMany({
              where: {
                recipientId: { in: teacherUserIds },
                notificationType: NotificationType.TEACHER_DAILY_SCHEDULE,
                createdAt: { gte: start, lte: end },
              },
              select: { recipientId: true },
            });
      const sentTodayTeacherSet = new Set(alreadySentTodayList.map((n) => n.recipientId));

      // 2. Batch prefetch today's candidate sessions for all teachers
      const todayDateOnly = new Date(`${dateStr}T00:00:00.000Z`);
      const allTodaySessions =
        teacherIds.length > 0
          ? await this.prisma.lessonSession.findMany({
              where: {
                group: { teacherId: { in: teacherIds } },
                sessionDate: todayDateOnly,
                isCancelled: false,
              },
              include: { group: { select: { teacherId: true, name: true, gradeLevel: true } } },
              orderBy: { startTime: 'asc' },
            })
          : [];

      const sessionsByTeacherId = new Map<string, typeof allTodaySessions>();
      for (const s of allTodaySessions) {
        const tid = s.group.teacherId;
        if (!sessionsByTeacherId.has(tid)) {
          sessionsByTeacherId.set(tid, []);
        }
        sessionsByTeacherId.get(tid)!.push(s);
      }

      const settings = await this.settingsService.getSettings();

      const visitedTeachers = new Set<string>(sentTodayTeacherSet);
      const teacherAgendasToDispatch: SendNotificationDto[] = [];
      const forcedWhatsAppDispatches: Array<{ phone: string; body: string }> = [];

      for (const teacher of teachers) {
        // Visited Set pattern: ensure teacher receives at most one morning agenda per day unless forced
        if (!force && visitedTeachers.has(teacher.user.id)) {
          continue;
        }
        visitedTeachers.add(teacher.user.id);

        const sessions = sessionsByTeacherId.get(teacher.id) || [];

        const agendaLines = sessions.map(
          (s) => `${s.group.name} (${s.group.gradeLevel}) — الساعة ${s.startTime || '—'}`,
        );

        const hasSessions = sessions.length > 0;
        const countLabel = sessions.length === 1 ? '1 حصة' : sessions.length === 2 ? 'حصتان' : `${sessions.length} حصص`;
        const title = hasSessions
          ? `📋 جدولك اليوم — ${countLabel}`
          : '📋 جدولك اليوم — لا توجد حصص مجدولة';

        const body = hasSessions
          ? [
              `أستاذ ${teacher.user.fullName}، صباح النور والبركة! 🌸`,
              `مواعيد حصصك ومجموعاتك اليوم (${dateStr}):`,
              ...agendaLines.map((l, i) => `${i + 1}. ${l}`),
              `\n🎓 منصة الأوّل التعليمية — تتمنى لك يوماً موفقاً ومثمراً 🌟`,
            ].join('\n')
          : [
              `أستاذ ${teacher.user.fullName}، صباح النور والبركة! 🌸`,
              `لا توجد لديك أي حصص أو مجموعات مجدولة لهذا اليوم (${dateStr}).`,
              `\n🎓 منصة الأوّل التعليمية — نتمنى لك يوماً سعيداً وموفقاً ومثمراً 🌟`,
            ].join('\n');

        const targetPhone = settings.teacherRecipientPhone?.trim() || teacher.user.phone;

        const channels: NotificationChannel[] = [
          NotificationChannel.IN_APP,
          NotificationChannel.WEB_PUSH,
        ];
        if (targetPhone && !force) {
          channels.push(NotificationChannel.WHATSAPP);
        }

        teacherAgendasToDispatch.push({
          recipientId: teacher.user.id,
          notificationType: NotificationType.TEACHER_DAILY_SCHEDULE,
          type: 'TEACHER_DAILY_SCHEDULE',
          title,
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
          const waBody = formatTeacherAgendaMessage(
            teacher.user.fullName,
            dateStr,
            agendaLines,
          );
          forcedWhatsAppDispatches.push({ phone: targetPhone, body: waBody });
        }

        dispatchedCount++;
      }

      // OUTSIDE ALL LOOPS: single batch dispatch for all teachers
      if (teacherAgendasToDispatch.length > 0) {
        await this.notifications.sendBatch(teacherAgendasToDispatch);
      }

      // Handle explicit forced direct WhatsApp deliveries (e.g. admin manual test)
      for (const forced of forcedWhatsAppDispatches) {
        const waResult = await this.whatsapp.sendTrackedProtectedMessage(forced.phone, forced.body);
        this.logger.log(
          `[TeacherSchedule] Direct WhatsApp dispatch to ${forced.phone}: outcome=${waResult.outcome}, reason=${waResult.failureReason || 'OK'}`,
        );
        if (waResult.outcome !== 'sent') {
          return {
            success: false,
            message: `تعذر إرسال رسالة الواتساب: ${waResult.failureReason || waResult.outcome}`,
            dispatchedCount: 0,
          };
        }
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

      // Pre-fetch all sent teacher session reminders in one batch query
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

        // Visited Set pattern: avoid sending twice for the same session
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

      // OUTSIDE ALL LOOPS: single batch dispatch for all teacher session reminders
      if (teacherRemindersToDispatch.length > 0) {
        await this.notifications.sendBatch(teacherRemindersToDispatch);
      }
    } catch (error) {
      this.logger.error('[TeacherReminder] Error in cron job', error);
    }
  }

  /**
   * Daily Cloudflare R2 orphan storage reconciliation.
   * Compares all files in the R2 bucket against database references and deletes unlinked files older than 24 hours.
   */
  async runStorageOrphanCleanup(): Promise<void> {
    if (!this.storageCleanup) {
      this.logger.warn('StorageCleanupService is not available; skipping orphan cleanup.');
      return;
    }
    this.logger.log('🧹 [StorageCleanup] Running scheduled daily Cloudflare R2 orphan scan...');
    try {
      const report = await this.storageCleanup.scanAndCleanOrphans({
        dryRun: false,
        gracePeriodHours: 24,
      });
      const freedMb = (report.freedSizeBytes / (1024 * 1024)).toFixed(2);
      this.logger.log(
        `🧹 [StorageCleanup] Daily cleanup completed: ${report.deletedCount} orphans purged, ${freedMb} MB freed (total R2 objects: ${report.totalR2Objects}, protected recent: ${report.recentProtectedCount}) in ${report.durationMs}ms`,
      );
    } catch (err: any) {
      this.logger.error(`❌ [StorageCleanup] Daily cleanup failed: ${err.message}`, err.stack);
    }
  }

  /**
   * Auto-Attendance: يشتغل كل يوم الساعة 11 مساءً (Africa/Cairo).
   *
   * المنطق:
   * - يجيب كل الحصص الماضية (حتى اللحظة الحالية) في آخر 7 أيام.
   * - لكل حصة، يجيب الطلاب المقيدين (ACTIVE) في المجموعة.
   * - أي طالب مالوش سجل نهائياً (لم يُسجّل لا حاضر ولا غائب) → يتسجل تلقائياً كـ PRESENT.
   * - المعلم يقدر في أي وقت (سواء قبل الجوب أو بعده أو في أي يوم) يسجل الطالب غياب أو يعدله يدوياً.
   * - يستخدم teacher user ID كـ recordedById (معلم المجموعة).
   * - يطبع تقرير بعدد السجلات التي تم إنشاؤها.
   */
  async runAutoAttendancePresent(): Promise<void> {
    this.logger.log('📋 [AutoAttendance] Starting auto-present marking job...');

    try {
      const now = new Date();
      // تغطية الحصص الماضية حتى الآن في آخر 7 أيام
      const cutoffStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // جيب كل الجلسات الماضية حتى اللحظة الحالية
      const sessions = await this.prisma.lessonSession.findMany({
        where: {
          isCancelled: false,
          sessionDate: {
            gte: cutoffStart,
            lte: now,
          },
        },
        include: {
          group: {
            include: {
              teacher: {
                include: {
                  user: { select: { id: true } },
                },
              },
              enrollments: {
                where: { status: GroupEnrollmentStatus.ACTIVE },
                select: { studentId: true, enrolledAt: true },
              },
            },
          },
          attendanceRecords: {
            select: { studentId: true },
          },
        },
      });

      let totalMarked = 0;

      const allRecordsToCreate: Array<{
        sessionId: string;
        studentId: string;
        status: AttendanceStatus;
        recordingMethod: RecordingMethod;
        recordedById: string;
        notes: string;
        recordedAt: Date;
      }> = [];

      for (const session of sessions) {
        const teacherUserId = session.group.teacher?.user?.id;
        if (!teacherUserId) continue;

        // الطلاب اللي عندهم سجل حضور بالفعل
        const alreadyRecordedIds = new Set(
          session.attendanceRecords.map((r) => r.studentId),
        );

        const sessionEndTime = session.endTime
          ? getSessionUtcDate(session.sessionDate, session.endTime)
          : new Date(session.sessionDate);

        // الطلاب اللي مسجلين في المجموعة وملهومش سجل وكانوا منضمين بالفعل قبل انتهاء الحصة
        const studentsToMark = session.group.enrollments
          .filter((e) => {
            if (!e.enrolledAt) return true;
            return new Date(e.enrolledAt).getTime() <= sessionEndTime.getTime();
          })
          .map((e) => e.studentId)
          .filter((id) => !alreadyRecordedIds.has(id));

        for (const studentId of studentsToMark) {
          allRecordsToCreate.push({
            sessionId: session.id,
            studentId,
            status: AttendanceStatus.PRESENT,
            recordingMethod: RecordingMethod.MANUAL,
            recordedById: teacherUserId,
            notes: 'تسجيل تلقائي — لم يُسجَّل غياب',
            recordedAt: new Date(),
          });
        }
      }

      if (allRecordsToCreate.length > 0) {
        await this.prisma.attendanceRecord.createMany({
          data: allRecordsToCreate,
          skipDuplicates: true,
        });
      }

      totalMarked = allRecordsToCreate.length;

      this.logger.log(
        `✅ [AutoAttendance] Done. Processed ${sessions.length} session(s), auto-marked ${totalMarked} student attendance record(s) as PRESENT.`,
      );
    } catch (err: any) {
      this.logger.error(`❌ [AutoAttendance] Job failed: ${err.message}`, err.stack);
    }
  }
}


