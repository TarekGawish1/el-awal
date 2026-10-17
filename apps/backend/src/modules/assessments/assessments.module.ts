import { Module } from '@nestjs/common';
import { AssessmentsController } from './controllers/assessments.controller';
import { AssessmentsService } from './services/assessments.service';
import { AssessmentCrudService } from './services/assessment-crud.service';
import { AssessmentQueryService } from './services/assessment-query.service';
import { AssessmentSessionService } from './services/assessment-session.service';
import { AssessmentSubmissionService } from './services/assessment-submission.service';
import { AssessmentGradingService } from './services/assessment-grading.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AssessmentsController],
  providers: [
    AssessmentsService,
    AssessmentCrudService,
    AssessmentQueryService,
    AssessmentSessionService,
    AssessmentSubmissionService,
    AssessmentGradingService,
  ],
  exports: [
    AssessmentsService,
    AssessmentCrudService,
    AssessmentQueryService,
    AssessmentSessionService,
    AssessmentSubmissionService,
    AssessmentGradingService,
  ],
})
export class AssessmentsModule {}
