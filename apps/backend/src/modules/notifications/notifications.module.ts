import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { WebPushService } from '../../services/webpush.service';
import { WhatsAppService } from '../../services/whatsapp/whatsapp.service';
import { WhatsAppWorker } from '../../workers/whatsapp.worker';
import { SchedulersService } from '../../jobs/schedulers';

@Module({
  controllers: [NotificationsController],
  providers: [
    // Core notification services
    NotificationsService,
    WebPushService,

    // WhatsApp: socket manager + queue worker
    WhatsAppService,
    WhatsAppWorker,

    // Cron schedulers (run in-process)
    SchedulersService,
  ],
  exports: [NotificationsService, WebPushService, WhatsAppService],
})
export class NotificationsModule {}
