import { Module } from '@nestjs/common';
import { StudentsController } from './controllers/students.controller';
import { StudentsService } from './services/students.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { WhatsAppService } from '../../services/whatsapp/whatsapp.service';

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [StudentsController],
  providers: [StudentsService, WhatsAppService],
  exports: [StudentsService],
})
export class StudentsModule {}
