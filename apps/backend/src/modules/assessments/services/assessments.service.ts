import {
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { SubmitHomeworkDto } from '../dto/submit-homework.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { isAnswerCorrect } from '../helpers/assessment-evaluator.helper';
import { AssessmentCrudService } from './assessment-crud.service';
import { AssessmentQueryService } from './assessment-query.service';
import { AssessmentSessionService } from './assessment-session.service';
import { AssessmentSubmissionService } from './assessment-submission.service';
import { AssessmentGradingService } from './assessment-grading.service';

export { isAnswerCorrect };

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);
  private readonly assessmentsListCache = new MemoryCache(25, 200);
  private readonly groupSessionsCache = new MemoryCache(60, 50);
  private readonly assessmentDetailsCache = new MemoryCache<any>(45, 200);

  private readonly crudService: AssessmentCrudService;
  private readonly queryService: AssessmentQueryService;
  private readonly sessionService: AssessmentSessionService;
  private readonly submissionService: AssessmentSubmissionService;
  private readonly gradingService: AssessmentGradingService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() assessmentCrudService?: AssessmentCrudService,
    @Optional() assessmentQueryService?: AssessmentQueryService,
    @Optional() assessmentSessionService?: AssessmentSessionService,
    @Optional() assessmentSubmissionService?: AssessmentSubmissionService,
    @Optional() assessmentGradingService?: AssessmentGradingService,
  ) {
    this.queryService =
      assessmentQueryService ??
      new AssessmentQueryService(
        this.prisma,
        this.redisCache,
        this.assessmentsListCache,
        this.groupSessionsCache,
        this.assessmentDetailsCache,
      );

    this.crudService =
      assessmentCrudService ??
      new AssessmentCrudService(
        this.prisma,
        this.eventEmitter,
        this.notifications,
        this.storageService,
        this.redisCache,
        this.assessmentsListCache,
        this.assessmentDetailsCache,
      );

    this.sessionService =
      assessmentSessionService ??
      new AssessmentSessionService(this.prisma, this.queryService);

    this.submissionService =
      assessmentSubmissionService ??
      new AssessmentSubmissionService(
        this.prisma,
        this.eventEmitter,
        this.queryService,
        this.assessmentsListCache,
      );

    this.gradingService =
      assessmentGradingService ??
      new AssessmentGradingService(
        this.prisma,
        this.eventEmitter,
        this.queryService,
        this.assessmentsListCache,
      );
  }

  async createAssessment(
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAssessmentDto,
  ) {
    return this.crudService.createAssessment(teacherId, isSecretariat, dto);
  }

  async getAssessments(query: AssessmentQueryDto, user: AuthenticatedUser) {
    return this.queryService.getAssessments(query, user);
  }

  async getCachedAssessmentBase(assessmentId: string) {
    return this.queryService.getCachedAssessmentBase(assessmentId);
  }

  async getAssessmentById(assessmentId: string, user: AuthenticatedUser) {
    return this.sessionService.getAssessmentById(assessmentId, user);
  }

  async getMyAssessmentStatus(assessmentId: string, user: AuthenticatedUser) {
    return this.sessionService.getMyAssessmentStatus(assessmentId, user);
  }

  async submitAssessment(
    assessmentId: string,
    user: AuthenticatedUser,
    dto: SubmitAssessmentDto,
  ) {
    return this.submissionService.submitAssessment(assessmentId, user, dto);
  }

  async submitHomework(
    assessmentId: string,
    user: AuthenticatedUser,
    dto: SubmitHomeworkDto,
  ) {
    return this.submissionService.submitHomework(assessmentId, user, dto);
  }

  async gradeSubmission(
    submissionId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: GradeSubmissionDto,
  ) {
    return this.gradingService.gradeSubmission(
      submissionId,
      teacherId,
      isSecretariat,
      dto,
    );
  }

  async getAssessmentSubmissions(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    return this.gradingService.getAssessmentSubmissions(
      assessmentId,
      teacherId,
      isSecretariat,
    );
  }

  async getSubmissionById(
    submissionId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    return this.gradingService.getSubmissionById(
      submissionId,
      teacherId,
      isSecretariat,
    );
  }

  async updateAssessment(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateAssessmentDto,
  ) {
    return this.crudService.updateAssessment(
      assessmentId,
      teacherId,
      isSecretariat,
      dto,
    );
  }

  async reEvaluateAutoGradedSubmissions(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    return this.gradingService.reEvaluateAutoGradedSubmissions(
      assessmentId,
      teacherId,
      isSecretariat,
    );
  }

  async deleteAssessment(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    return this.crudService.deleteAssessment(
      assessmentId,
      teacherId,
      isSecretariat,
    );
  }
}
