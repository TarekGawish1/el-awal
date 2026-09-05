import { Module } from '@nestjs/common';
import { GroupsController } from './controllers/groups.controller';
import { GroupsService } from './services/groups.service';
import { GroupPdfService } from './services/group-pdf.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupPdfService],
  exports: [GroupsService, GroupPdfService],
})
export class GroupsModule {}
