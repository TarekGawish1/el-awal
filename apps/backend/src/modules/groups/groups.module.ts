import { Module } from '@nestjs/common';
import { GroupsController } from './controllers/groups.controller';
import { GroupsService } from './services/groups.service';
import { GroupPdfService } from './services/group-pdf.service';
import { GroupCrudService } from './services/group-crud.service';
import { GroupEnrollmentsService } from './services/group-enrollments.service';
import { GroupReservationsService } from './services/group-reservations.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    GroupPdfService,
    GroupCrudService,
    GroupEnrollmentsService,
    GroupReservationsService,
  ],
  exports: [
    GroupsService,
    GroupPdfService,
    GroupCrudService,
    GroupEnrollmentsService,
    GroupReservationsService,
  ],
})
export class GroupsModule {}
