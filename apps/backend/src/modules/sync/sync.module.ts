import { Module } from '@nestjs/common';
import { SyncController } from './controllers/sync.controller';
import { SyncService } from './services/sync.service';
import { SyncTeacherSnapshotService } from './services/sync-teacher-snapshot.service';
import { SyncStudentSnapshotService } from './services/sync-student-snapshot.service';
import { SyncSnapshotService } from './services/sync-snapshot.service';
import { SyncAttendanceService } from './services/sync-attendance.service';
import { SyncPaymentsService } from './services/sync-payments.service';
import { SyncAssessmentsService } from './services/sync-assessments.service';
import { SyncHomeworkService } from './services/sync-homework.service';
import { SyncMutationsService } from './services/sync-mutations.service';
import { SyncStudentsService } from './services/sync-students.service';
import { CoursesModule } from '../courses/courses.module';

const syncSubServices = [
  SyncTeacherSnapshotService,
  SyncStudentSnapshotService,
  SyncSnapshotService,
  SyncAttendanceService,
  SyncPaymentsService,
  SyncAssessmentsService,
  SyncHomeworkService,
  SyncMutationsService,
  SyncStudentsService,
];

@Module({
  imports: [CoursesModule],
  controllers: [SyncController],
  providers: [SyncService, ...syncSubServices],
  exports: [SyncService, ...syncSubServices],
})
export class SyncModule {}
