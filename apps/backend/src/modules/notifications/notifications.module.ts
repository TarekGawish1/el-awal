import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationDispatchService } from './services/notification-dispatch.service';
import { NotificationTemplatesService } from './services/notification-templates.service';
import { NotificationEventsService } from './services/notification-events.service';
import { WebPushService } from '../../services/webpush.service';
import { WhatsAppService } from '../../services/whatsapp/whatsapp.service';
import { WhatsAppBanService } from '../../services/whatsapp/whatsapp-ban.service';
import { WhatsAppDispatcherService } from '../whatsapp/services/whatsapp-dispatcher.service';
import { WhatsAppQueueManagerService } from '../whatsapp/services/whatsapp-queue-manager.service';
import { SchedulersService } from '../../jobs/schedulers';
import { ReminderJobsService } from '../../jobs/reminder-jobs.service';
import { TeacherScheduleJobService } from '../../jobs/teacher-schedule-job.service';
import { AutoAttendanceJobService } from '../../jobs/auto-attendance-job.service';
import { CleanupJobsService } from '../../jobs/cleanup-jobs.service';
import { DeadlineReminderCron } from './crons/deadline-reminder.cron';
import { NotificationSettingsService } from './services/notification-settings.service';
import { WebPushDispatcherService } from './services/webpush-dispatcher.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    // Core notification services
    NotificationSettingsService,
    NotificationTemplatesService,
    NotificationDispatchService,
    NotificationEventsService,
    NotificationsService,
    WebPushService,
    WebPushDispatcherService,

    // WhatsApp: socket manager + ban tracking + persistent queue dispatcher
    WhatsAppBanService,
    WhatsAppService,
    WhatsAppQueueManagerService,
    WhatsAppDispatcherService,

    // Cron schedulers & job services (run in-process)
    ReminderJobsService,
    TeacherScheduleJobService,
    AutoAttendanceJobService,
    CleanupJobsService,
    SchedulersService,
    DeadlineReminderCron,
  ],
  exports: [
    NotificationSettingsService,
    NotificationTemplatesService,
    NotificationDispatchService,
    NotificationEventsService,
    NotificationsService,
    WebPushService,
    WebPushDispatcherService,
    WhatsAppService,
    WhatsAppDispatcherService,
    WhatsAppQueueManagerService,
    SchedulersService,
  ],
})
export class NotificationsModule {}
