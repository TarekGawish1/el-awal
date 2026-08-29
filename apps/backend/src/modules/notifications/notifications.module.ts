import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { WebPushService } from '../../services/webpush.service';
import { WhatsAppService } from '../../services/whatsapp/whatsapp.service';
import { WhatsAppDispatcherService } from '../whatsapp/services/whatsapp-dispatcher.service';
import { SchedulersService } from '../../jobs/schedulers';
import { DeadlineReminderCron } from './crons/deadline-reminder.cron';

import { NotificationSettingsService } from './services/notification-settings.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    // Core notification services
    NotificationSettingsService,
    NotificationsService,
    WebPushService,

    // WhatsApp: socket manager + strictly sequential persistent dispatcher
    WhatsAppService,
    WhatsAppDispatcherService,

    // Cron schedulers (run in-process)
    SchedulersService,
    DeadlineReminderCron,
  ],
  exports: [NotificationSettingsService, NotificationsService, WebPushService, WhatsAppService],
})
export class NotificationsModule {}
