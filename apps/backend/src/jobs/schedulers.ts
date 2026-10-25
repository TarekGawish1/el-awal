import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../core/database/prisma.service';
import { NotificationsService } from '../modules/notifications/services/notifications.service';
import { NotificationSettingsService } from '../modules/notifications/services/notification-settings.service';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service';
import { StorageCleanupService } from '../integrations/storage/storage-cleanup.service';
import { ClusterService } from '../core/cluster/cluster.service';
import { ReminderJobsService } from './reminder-jobs.service';
import { TeacherScheduleJobService } from './teacher-schedule-job.service';
import { AutoAttendanceJobService } from './auto-attendance-job.service';
import { CleanupJobsService } from './cleanup-jobs.service';

/**
 * SchedulersService — orchestrator for automated cron jobs in the El-Awal notification engine.
 * Active schedules:
 * 1. Every 15 min      — SESSION_REMINDER_STUDENT (45–60 min window)
 * 2. Every 15 min      — ONLINE_EXAM_REMINDER (60 min window)
 * 3. Daily 07:00       — TEACHER_DAILY_SCHEDULE (morning agenda)
 * 4. Every 5 min       — TEACHER_SESSION_REMINDER (15 min window)
 * 5. Every 14 min      — Heroku keep-alive ping
 * 6. Daily 03:00       — CLOUDFLARE_R2_ORPHAN_CLEANUP (purges unlinked files)
 * 7. Daily 23:00       — AUTO_ATTENDANCE_PRESENT (marks unrecorded students as PRESENT)
 */
@Injectable()
export class SchedulersService implements OnModuleInit {
  private readonly logger = new Logger(SchedulersService.name);
  private readonly tasks: cron.ScheduledTask[] = [];

  private readonly reminderJobs: ReminderJobsService;
  private readonly teacherScheduleJob: TeacherScheduleJobService;
  private readonly autoAttendanceJob: AutoAttendanceJobService;
  private readonly cleanupJobs: CleanupJobsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly settingsService: NotificationSettingsService,
    private readonly whatsapp: WhatsAppService,
    @Optional() private readonly storageCleanup?: StorageCleanupService,
    @Optional() private readonly clusterService?: ClusterService,
    @Optional() reminderJobs?: ReminderJobsService,
    @Optional() teacherScheduleJob?: TeacherScheduleJobService,
    @Optional() autoAttendanceJob?: AutoAttendanceJobService,
    @Optional() cleanupJobs?: CleanupJobsService,
  ) {
    this.reminderJobs = reminderJobs ?? new ReminderJobsService(prisma, notifications, clusterService);
    this.teacherScheduleJob = teacherScheduleJob ?? new TeacherScheduleJobService(prisma, notifications, settingsService, whatsapp);
    this.autoAttendanceJob = autoAttendanceJob ?? new AutoAttendanceJobService(prisma);
    this.cleanupJobs = cleanupJobs ?? new CleanupJobsService(storageCleanup, prisma);
  }

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
    this.tasks.push(
      cron.schedule(
        '0 23 * * *',
        () => this.runAutoAttendancePresent(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    // 8. Hourly student temporary access PIN cleanup (every hour at minute 0 Africa/Cairo)
    this.tasks.push(
      cron.schedule(
        '0 * * * *',
        () => this.runExpiredTemporaryPinCleanup(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    // 9. Hourly delivered credential & message log redaction (every hour at minute 5 Africa/Cairo)
    this.tasks.push(
      cron.schedule(
        '5 * * * *',
        () => this.runDeliveredCredentialRedaction(),
        { timezone: 'Africa/Cairo' },
      ),
    );

    this.logger.log(`✅ ${this.tasks.length} cron schedulers active`);
  }

  // ─── Public Runner Methods ────────────────────────────────────────────────

  runKeepAlivePing(): void {
    return this.cleanupJobs.runKeepAlivePing();
  }

  async runStudentSessionReminders(): Promise<void> {
    return this.reminderJobs.runStudentSessionReminders();
  }

  async runOnlineExamReminders(): Promise<void> {
    return this.reminderJobs.runOnlineExamReminders();
  }

  async runTeacherDailySchedule(force = false): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
    return this.teacherScheduleJob.runTeacherDailySchedule(force);
  }

  async runTeacherSessionReminders(): Promise<void> {
    return this.reminderJobs.runTeacherSessionReminders();
  }

  async runStorageOrphanCleanup(): Promise<void> {
    return this.cleanupJobs.runStorageOrphanCleanup();
  }

  async runAutoAttendancePresent(): Promise<void> {
    return this.autoAttendanceJob.runAutoAttendancePresent();
  }

  async runExpiredTemporaryPinCleanup(): Promise<{ purgedCount: number; durationMs: number }> {
    return this.cleanupJobs.cleanupExpiredTemporaryPins();
  }

  async runDeliveredCredentialRedaction(): Promise<{
    redactedWhatsAppLogsCount: number;
    redactedNotificationsCount: number;
    durationMs: number;
  }> {
    return this.cleanupJobs.cleanupDeliveredCredentialMessages();
  }
}
