import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { NotificationsService, SendNotificationDto } from '../modules/notifications/services/notifications.service';
import { NotificationSettingsService } from '../modules/notifications/services/notification-settings.service';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service';
import { formatTeacherAgendaMessage } from '../utils/spintax';
import { getCairoTodayBounds } from './scheduler-timezone.util';

@Injectable()
export class TeacherScheduleJobService {
  private readonly logger = new Logger(TeacherScheduleJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settingsService: NotificationSettingsService,
    private readonly whatsapp: WhatsAppService,
  ) {}

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

      if (teacherAgendasToDispatch.length > 0) {
        await this.notifications.sendBatch(teacherAgendasToDispatch);
      }

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
}
