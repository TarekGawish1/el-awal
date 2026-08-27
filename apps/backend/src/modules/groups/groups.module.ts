import { Module } from '@nestjs/common';
import { GroupsController } from './controllers/groups.controller';
import { GroupsService } from './services/groups.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
