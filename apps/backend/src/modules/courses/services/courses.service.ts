import {
  Injectable,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  CourseProgressRepository,
  SyncProgressItemDto,
  SyncBatchResult,
} from '../repositories/course-progress.repository';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { AiModerationService } from '../../../integrations/ai/ai-moderation.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { CourseQueryDto } from '../dto/course-query.dto';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import {
  CreateQuestionDto,
  CreateQuestionReplyDto,
  UpdateQuestionDto,
  UpdateQuestionReplyDto,
} from '../dto/lesson-qa.dto';
import { CreateAttachmentDto } from '../dto/lesson-attachment.dto';
import { GrantGroupAccessDto } from '../dto/group-access.dto';
import { ReorderModulesDto, ReorderLessonsDto } from '../dto/reorder-modules.dto';
import {
  EnrollStudentsBatchDto,
  CreateAndEnrollStudentDto,
  EnrollByQrDto,
  CourseSubscriptionRequestDto,
  RejectSubscriptionRequestDto,
} from '../dto/enrollment.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

import { CourseVideoService, generateBunnyEmbedTicket } from './course-video.service';
import { CourseCoreService } from './course-core.service';
import { CourseModulesService } from './course-modules.service';
import { CourseCurriculumService } from './course-curriculum.service';
import { CourseQaService } from './course-qa.service';
import { CourseCatalogService } from './course-catalog.service';
import { CourseQueryService } from './course-query.service';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CourseSubscriptionService } from './course-subscription.service';
import { CourseViewerService } from './course-viewer.service';
import { CourseProgressService } from './course-progress.service';
import { CourseAccessService } from './course-access.service';

export { generateBunnyEmbedTicket };

@Injectable()
export class CoursesService {
  public readonly videoService: CourseVideoService;
  public readonly coreService: CourseCoreService;
  public readonly modulesService: CourseModulesService;
  public readonly curriculumService: CourseCurriculumService;
  public readonly qaService: CourseQaService;
  public readonly catalogService: CourseCatalogService;
  public readonly queryService: CourseQueryService;
  public readonly enrollmentService: CourseEnrollmentService;
  public readonly subscriptionService: CourseSubscriptionService;
  public readonly viewerService: CourseViewerService;
  public readonly progressService: CourseProgressService;
  public readonly accessService: CourseAccessService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly progressRepository: CourseProgressRepository,
    private readonly bunnyVideoService: BunnyVideoService,
    private readonly storageService: StorageService,
    private readonly aiModeration: AiModerationService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() videoService?: CourseVideoService,
    @Optional() coreService?: CourseCoreService,
    @Optional() modulesService?: CourseModulesService,
    @Optional() curriculumService?: CourseCurriculumService,
    @Optional() qaService?: CourseQaService,
    @Optional() catalogService?: CourseCatalogService,
    @Optional() queryService?: CourseQueryService,
    @Optional() enrollmentService?: CourseEnrollmentService,
    @Optional() subscriptionService?: CourseSubscriptionService,
    @Optional() viewerService?: CourseViewerService,
    @Optional() progressService?: CourseProgressService,
    @Optional() accessService?: CourseAccessService,
  ) {
    this.videoService = videoService ?? new CourseVideoService(this.bunnyVideoService);
    this.coreService =
      coreService ??
      new CourseCoreService(this.prisma, this.storageService, this.bunnyVideoService, this.videoService, this.redisCache);
    this.modulesService =
      modulesService ??
      new CourseModulesService(this.prisma, this.storageService, this.bunnyVideoService, this.videoService, this.coreService);
    this.curriculumService =
      curriculumService ??
      new CourseCurriculumService(this.prisma, this.storageService, this.bunnyVideoService, this.videoService, this.coreService);
    this.qaService = qaService ?? new CourseQaService(this.prisma, this.aiModeration);
    this.catalogService =
      catalogService ??
      new CourseCatalogService(this.prisma, this.videoService, this.coreService, this.redisCache);
    this.queryService = queryService ?? new CourseQueryService(this.prisma, this.videoService);
    this.enrollmentService =
      enrollmentService ?? new CourseEnrollmentService(this.prisma, this.coreService);
    this.subscriptionService =
      subscriptionService ??
      new CourseSubscriptionService(
        this.prisma,
        this.coreService,
        this.enrollmentService,
        this.notificationsService,
        this.realtimeGateway,
      );
    this.viewerService =
      viewerService ??
      new CourseViewerService(
        this.prisma,
        this.bunnyVideoService,
        this.storageService,
        this.videoService,
        this.queryService,
      );
    this.progressService =
      progressService ?? new CourseProgressService(this.prisma, this.progressRepository);
    this.accessService =
      accessService ?? new CourseAccessService(this.prisma, this.bunnyVideoService, this.videoService);
  }

  // ── Video & Media Helpers ──
  extractBunnyVideoId(value?: string | null): string | null {
    return this.videoService.extractBunnyVideoId(value);
  }
  resolveLessonVideoId(lesson?: any): string | null {
    return this.videoService.resolveLessonVideoId(lesson);
  }
  isBunnyEmbedUrl(value?: string | null): boolean {
    return this.videoService.isBunnyEmbedUrl(value);
  }
  resolveFreshLessonEmbed(lesson?: any): string | null {
    return this.videoService.resolveFreshLessonEmbed(lesson);
  }
  signPreviewVideoUrl(rawUrl?: string | null): string | null {
    return this.videoService.signPreviewVideoUrl(rawUrl);
  }
  async generateDirectVideoUploadCredentials(title: string) {
    return this.videoService.generateDirectVideoUploadCredentials(title);
  }
  async uploadVideoDirect(file: Express.Multer.File, title?: string, videoId?: string) {
    return this.videoService.uploadVideoDirect(file, title, videoId);
  }

  // ── Course Core ──
  async clearCatalogCache() {
    return this.coreService.clearCatalogCache();
  }
  async createCourse(teacherId: string, dto: CreateCourseDto) {
    return this.coreService.createCourse(teacherId, dto);
  }
  async updateCourse(courseId: string, teacherId: string, isSecretariat: boolean, dto: UpdateCourseDto) {
    return this.coreService.updateCourse(courseId, teacherId, isSecretariat, dto);
  }
  async deleteCourse(courseId: string, teacherId: string, isSecretariat: boolean) {
    return this.coreService.deleteCourse(courseId, teacherId, isSecretariat);
  }
  async grantGroupAccess(courseId: string, teacherId: string, isSecretariat: boolean, dto: GrantGroupAccessDto) {
    return this.coreService.grantGroupAccess(courseId, teacherId, isSecretariat, dto);
  }

  // ── Course Modules & Lessons ──
  async createModule(courseId: string, teacherId: string, isSecretariat: boolean, dto: CreateModuleDto) {
    return this.modulesService.createModule(courseId, teacherId, isSecretariat, dto);
  }
  async updateModule(moduleId: string, teacherId: string, isSecretariat: boolean, dto: UpdateModuleDto) {
    return this.modulesService.updateModule(moduleId, teacherId, isSecretariat, dto);
  }
  async deleteModule(moduleId: string, teacherId: string, isSecretariat: boolean) {
    return this.modulesService.deleteModule(moduleId, teacherId, isSecretariat);
  }
  async reorderModules(courseId: string, teacherId: string, isSecretariat: boolean, dto: ReorderModulesDto) {
    return this.modulesService.reorderModules(courseId, teacherId, isSecretariat, dto);
  }
  async reorderLessons(courseId: string, teacherId: string, isSecretariat: boolean, dto: ReorderLessonsDto) {
    return this.curriculumService.reorderLessons(courseId, teacherId, isSecretariat, dto);
  }
  async createLesson(moduleId: string, teacherId: string, isSecretariat: boolean, dto: CreateLessonDto) {
    return this.curriculumService.createLesson(moduleId, teacherId, isSecretariat, dto);
  }
  async updateLesson(lessonId: string, teacherId: string, isSecretariat: boolean, dto: UpdateLessonDto) {
    return this.curriculumService.updateLesson(lessonId, teacherId, isSecretariat, dto);
  }
  async deleteLesson(lessonId: string, teacherId: string, isSecretariat: boolean) {
    return this.curriculumService.deleteLesson(lessonId, teacherId, isSecretariat);
  }
  async addLessonAttachment(lessonId: string, teacherId: string, isSecretariat: boolean, dto: CreateAttachmentDto) {
    return this.curriculumService.addLessonAttachment(lessonId, teacherId, isSecretariat, dto);
  }
  async deleteLessonAttachment(attachmentId: string, teacherId: string, isSecretariat: boolean) {
    return this.curriculumService.deleteLessonAttachment(attachmentId, teacherId, isSecretariat);
  }

  // ── Course Q&A ──
  async getLessonQuestions(lessonId: string) {
    return this.qaService.getLessonQuestions(lessonId);
  }
  async createLessonQuestion(lessonId: string, user: AuthenticatedUser, dto: CreateQuestionDto) {
    return this.qaService.createLessonQuestion(lessonId, user, dto);
  }
  async updateLessonQuestion(questionId: string, user: AuthenticatedUser, dto: UpdateQuestionDto) {
    return this.qaService.updateLessonQuestion(questionId, user, dto);
  }
  async deleteLessonQuestion(questionId: string, user: AuthenticatedUser) {
    return this.qaService.deleteLessonQuestion(questionId, user);
  }
  async createQuestionReply(questionId: string, user: AuthenticatedUser, dto: CreateQuestionReplyDto) {
    return this.qaService.createQuestionReply(questionId, user, dto);
  }
  async updateQuestionReply(replyId: string, user: AuthenticatedUser, dto: UpdateQuestionReplyDto) {
    return this.qaService.updateQuestionReply(replyId, user, dto);
  }
  async deleteQuestionReply(replyId: string, user: AuthenticatedUser) {
    return this.qaService.deleteQuestionReply(replyId, user);
  }

  // ── Catalog & Query ──
  async getPublishedCatalog(query: CourseQueryDto) {
    return this.catalogService.getPublishedCatalog(query);
  }
  async getPublicCourseDetails(courseId: string) {
    return this.catalogService.getPublicCourseDetails(courseId);
  }
  async getTeacherCourses(teacherId: string) {
    return this.queryService.getTeacherCourses(teacherId);
  }
  async getCourseDetails(courseId: string, user?: AuthenticatedUser) {
    return this.queryService.getCourseDetails(courseId, user);
  }

  // ── Enrollments & Subscriptions ──
  async enrollCourse(courseId: string, studentId: string) {
    return this.enrollmentService.enrollCourse(courseId, studentId);
  }
  async getCourseEnrollments(courseId: string, teacherId: string, isSecretariat: boolean) {
    return this.enrollmentService.getCourseEnrollments(courseId, teacherId, isSecretariat);
  }
  async enrollStudentsBatch(courseId: string, teacherId: string, isSecretariat: boolean, dto: EnrollStudentsBatchDto) {
    return this.enrollmentService.enrollStudentsBatch(courseId, teacherId, isSecretariat, dto);
  }
  async createAndEnrollStudent(courseId: string, teacherId: string, isSecretariat: boolean, dto: CreateAndEnrollStudentDto) {
    return this.enrollmentService.createAndEnrollStudent(courseId, teacherId, isSecretariat, dto);
  }
  async enrollByQrToken(courseId: string, teacherId: string, isSecretariat: boolean, dto: EnrollByQrDto) {
    return this.enrollmentService.enrollByQrToken(courseId, teacherId, isSecretariat, dto);
  }
  async revokeStudentEnrollment(courseId: string, studentId: string, teacherId: string, isSecretariat: boolean) {
    return this.enrollmentService.revokeStudentEnrollment(courseId, studentId, teacherId, isSecretariat);
  }

  async requestCourseSubscription(courseId: string, studentId: string, dto: CourseSubscriptionRequestDto) {
    return this.subscriptionService.requestCourseSubscription(courseId, studentId, dto);
  }
  async getPendingEnrollmentRequests(courseId: string, user: AuthenticatedUser) {
    return this.subscriptionService.getPendingEnrollmentRequests(courseId, user);
  }
  async getTeacherSubscriptions(user: AuthenticatedUser) {
    return this.subscriptionService.getTeacherSubscriptions(user);
  }
  async approveSubscriptionRequest(enrollmentId: string, user: AuthenticatedUser) {
    return this.subscriptionService.approveSubscriptionRequest(enrollmentId, user);
  }
  async rejectSubscriptionRequest(enrollmentId: string, user: AuthenticatedUser, dto: RejectSubscriptionRequestDto) {
    return this.subscriptionService.rejectSubscriptionRequest(enrollmentId, user, dto);
  }
  async cancelStudentSubscription(enrollmentId: string, user: AuthenticatedUser, reason?: string) {
    return this.subscriptionService.cancelStudentSubscription(enrollmentId, user, reason);
  }
  async getStudentCourseSubscriptionStatus(courseId: string, studentId: string) {
    return this.subscriptionService.getStudentCourseSubscriptionStatus(courseId, studentId);
  }

  // ── Viewer, Streaming & Progress ──
  async getMyCourses(studentId: string) {
    return this.progressService.getMyCourses(studentId);
  }
  async getLessonViewer(lessonId: string, user: AuthenticatedUser) {
    return this.viewerService.getLessonViewer(lessonId, user);
  }
  async updateLessonProgress(user: AuthenticatedUser, lessonId: string, dto: UpdateProgressDto) {
    return this.progressService.updateLessonProgress(user, lessonId, dto);
  }
  async applyMonotonicProgressBatch(studentId: string, items: SyncProgressItemDto[]): Promise<SyncBatchResult> {
    return this.progressService.applyMonotonicProgressBatch(studentId, items);
  }
  async getLessonStreamAuth(lessonId: string, user: AuthenticatedUser) {
    return this.viewerService['accessService']?.getLessonStreamAuth(lessonId, user) ??
      new CourseAccessService(this.prisma, this.bunnyVideoService, this.videoService).getLessonStreamAuth(lessonId, user);
  }
  async assertStudentCourseAccess(lessonId: string, userId: string) {
    return new CourseAccessService(this.prisma, this.bunnyVideoService, this.videoService).assertStudentCourseAccess(lessonId, userId);
  }
  async getLessonStreamTicket(lessonId: string, user: AuthenticatedUser): Promise<{ embedUrl: string; expiresAt: number }> {
    return new CourseAccessService(this.prisma, this.bunnyVideoService, this.videoService).getLessonStreamTicket(lessonId, user);
  }
}
