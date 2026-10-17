import { Module } from '@nestjs/common';
import { CoursesController } from './controllers/courses.controller';
import { CoursesService } from './services/courses.service';
import { CourseVideoService } from './services/course-video.service';
import { CourseCoreService } from './services/course-core.service';
import { CourseModulesService } from './services/course-modules.service';
import { CourseCurriculumService } from './services/course-curriculum.service';
import { CourseQaService } from './services/course-qa.service';
import { CourseCatalogService } from './services/course-catalog.service';
import { CourseQueryService } from './services/course-query.service';
import { CourseEnrollmentService } from './services/course-enrollment.service';
import { CourseRegistrationService } from './services/course-registration.service';
import { CourseSubscriptionService } from './services/course-subscription.service';
import { CourseSubscriptionApprovalService } from './services/course-subscription-approval.service';
import { CourseAccessService } from './services/course-access.service';
import { CourseViewerService } from './services/course-viewer.service';
import { CourseProgressService } from './services/course-progress.service';
import { CourseProgressRepository } from './repositories/course-progress.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../../realtime/realtime.module';

const courseSubServices = [
  CourseVideoService,
  CourseCoreService,
  CourseModulesService,
  CourseCurriculumService,
  CourseQaService,
  CourseCatalogService,
  CourseQueryService,
  CourseEnrollmentService,
  CourseRegistrationService,
  CourseSubscriptionService,
  CourseSubscriptionApprovalService,
  CourseAccessService,
  CourseViewerService,
  CourseProgressService,
];

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseProgressRepository, ...courseSubServices],
  exports: [CoursesService, CourseProgressRepository, ...courseSubServices],
})
export class CoursesModule {}
