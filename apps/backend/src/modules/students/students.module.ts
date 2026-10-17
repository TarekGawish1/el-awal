import { Module } from '@nestjs/common';
import { StudentsController } from './controllers/students.controller';
import { StudentsService } from './services/students.service';
import { StudentRegistrationService } from './services/student-registration.service';
import { StudentProfileService } from './services/student-profile.service';
import { StudentDeletionService } from './services/student-deletion.service';
import { StudentQueryService } from './services/student-query.service';
import { StudentCredentialsService } from './services/student-credentials.service';
import { StudentGroupHubService } from './services/student-group-hub.service';
import { StudentPortalDataService } from './services/student-portal-data.service';
import { StudentGroupReservationService } from './services/student-group-reservation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../../realtime/realtime.module';

const studentSubServices = [
  StudentRegistrationService,
  StudentProfileService,
  StudentDeletionService,
  StudentQueryService,
  StudentCredentialsService,
  StudentGroupHubService,
  StudentPortalDataService,
  StudentGroupReservationService,
];

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [StudentsController],
  providers: [StudentsService, ...studentSubServices],
  exports: [StudentsService, ...studentSubServices],
})
export class StudentsModule {}
