import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from '../services/courses.service';
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
import { ReorderModulesDto } from '../dto/reorder-modules.dto';
import { ReorderLessonsDto } from '../dto/reorder-modules.dto';
import {
  EnrollStudentsBatchDto,
  CreateAndEnrollStudentDto,
  EnrollByQrDto,
  CourseSubscriptionRequestDto,
  RejectSubscriptionRequestDto,
} from '../dto/enrollment.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { Public } from '../../../core/security/decorators/public.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Online Courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'Public catalog of published courses with Keyset pagination and filters' })
  async getCatalog(@Query() query: CourseQueryDto) {
    return this.coursesService.getPublishedCatalog(query);
  }

  @Public()
  @Get(':id/public')
  @ApiOperation({ summary: 'Public course outline, modules, and preview lessons' })
  async getPublicCourse(@Param('id') id: string) {
    return this.coursesService.getPublicCourseDetails(id);
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all courses created by the authenticated teacher' })
  async getTeacherCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getTeacherCourses(user.teacherProfileId || user.id);
  }

  @Post('lessons/upload-video-credentials')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Generate direct Bunny Stream video upload authorization credentials' })
  async generateVideoUploadCredentials(
    @Body('title') title: string,
  ) {
    return this.coursesService.generateDirectVideoUploadCredentials(title || 'New Course Lesson');
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new online course (Draft) scoped to authenticated instructor' })
  @ApiResponse({ status: 201, description: 'Course created in draft status' })
  async createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.createCourse(user.teacherProfileId || user.id, dto);
  }

  @Get('my-courses')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all enrolled online courses for the authenticated student with progress %' })
  async getMyCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getMyCourses(user.studentProfileId || user.id);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get course outline, modules, and ordered lesson list' })
  async getCourseDetails(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.getCourseDetails(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update course metadata or publish status (Ownership protected)' })
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.updateCourse(
      id,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete or archive a course' })
  async deleteCourse(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.deleteCourse(id, user.teacherProfileId || user.id, isSecretariat);
  }

  @Post(':id/group-access')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Batch grant course access to students in specified physical AcademicGroups' })
  async grantGroupAccess(
    @Param('id') courseId: string,
    @Body() dto: GrantGroupAccessDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.grantGroupAccess(
      courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Post('modules/reorder')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Bulk reorder modules in a course' })
  async reorderModules(
    @Body() dto: ReorderModulesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.reorderModules(
      dto.courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Post('lessons/reorder')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Bulk reorder lessons within/across modules in a course' })
  async reorderLessons(
    @Body() dto: ReorderLessonsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.reorderLessons(
      dto.courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Post(':id/modules')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Add a new module/chapter to course outline' })
  @ApiResponse({ status: 201, description: 'Module created' })
  async createModule(
    @Param('id') courseId: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.createModule(
      courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Patch('modules/:moduleId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update module title, description, or linked unit quiz' })
  async updateModule(
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.updateModule(
      moduleId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Delete('modules/:moduleId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete a module and all its lessons' })
  async deleteModule(
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.deleteModule(moduleId, user.teacherProfileId || user.id, isSecretariat);
  }

  @Post('modules/:moduleId/lessons')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Add a new lesson to a course module with media identifiers' })
  @ApiResponse({ status: 201, description: 'Lesson created' })
  async createLesson(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.createLesson(
      moduleId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Patch('lessons/:lessonId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update lesson metadata, rich summary, or linked quiz' })
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.updateLesson(
      lessonId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Delete('lessons/:lessonId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete a lesson' })
  async deleteLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.deleteLesson(lessonId, user.teacherProfileId || user.id, isSecretariat);
  }

  @Post('lessons/:lessonId/attachments')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Upload and link PDF summaries / worksheets to a lesson' })
  async addLessonAttachment(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.addLessonAttachment(
      lessonId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Delete('lessons/attachments/:attachmentId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Remove a lesson attachment' })
  async deleteLessonAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.deleteLessonAttachment(
      attachmentId,
      user.teacherProfileId || user.id,
      isSecretariat,
    );
  }

  @Get('lessons/:lessonId/questions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Fetch all timestamped Q&A questions for a lesson' })
  async getLessonQuestions(@Param('lessonId') lessonId: string) {
    return this.coursesService.getLessonQuestions(lessonId);
  }

  @Post('lessons/:lessonId/questions')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Submit a timestamped question on a lesson video' })
  async createLessonQuestion(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.createLessonQuestion(lessonId, user, dto);
  }

  @Post('questions/:questionId/replies')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Add a reply to a student timestamped question' })
  async createQuestionReply(
    @Param('questionId') questionId: string,
    @Body() dto: CreateQuestionReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.createQuestionReply(questionId, user, dto);
  }

  @Patch('questions/:questionId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Update a student timestamped question (author or teacher/secretariat)' })
  async updateLessonQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.updateLessonQuestion(questionId, user, dto);
  }

  @Delete('questions/:questionId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete a student timestamped question (author or teacher/secretariat)' })
  async deleteLessonQuestion(
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.deleteLessonQuestion(questionId, user);
  }

  @Patch('questions/replies/:replyId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Update a question reply (author or teacher/secretariat)' })
  async updateQuestionReply(
    @Param('replyId') replyId: string,
    @Body() dto: UpdateQuestionReplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.updateQuestionReply(replyId, user, dto);
  }

  @Delete('questions/replies/:replyId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete a question reply (author or teacher/secretariat)' })
  async deleteQuestionReply(
    @Param('replyId') replyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.deleteQuestionReply(replyId, user);
  }

  @Post(':id/enroll')
  @Roles(UserRole.STUDENT, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Enroll authenticated student in a published course' })
  @ApiResponse({ status: 201, description: 'Enrollment and CourseAccess activated' })
  async enrollCourse(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.enrollCourse(courseId, user.studentProfileId || user.id);
  }

  @Post(':id/subscribe-request')
  @Roles(UserRole.STUDENT, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Submit course subscription application with Vodafone Cash transfer receipt' })
  @ApiResponse({ status: 201, description: 'Subscription request submitted for teacher review' })
  async requestCourseSubscription(
    @Param('id') courseId: string,
    @Body() dto: CourseSubscriptionRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.requestCourseSubscription(
      courseId,
      user.studentProfileId || user.id,
      dto,
    );
  }

  @Get(':id/pending-enrollments')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get list of pending course subscription requests with receipts' })
  async getPendingEnrollments(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.getPendingEnrollmentRequests(courseId, user);
  }

  @Post('enrollments/:enrollmentId/approve')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Approve a student subscription request and activate course access' })
  async approveSubscription(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.approveSubscriptionRequest(enrollmentId, user);
  }

  @Post('enrollments/:enrollmentId/reject')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Reject a student subscription request with reason' })
  async rejectSubscription(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: RejectSubscriptionRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.rejectSubscriptionRequest(enrollmentId, user, dto);
  }

  @Get(':id/subscription-status')
  @Roles(UserRole.STUDENT, UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Check student subscription status for a course' })
  async getSubscriptionStatus(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.getStudentCourseSubscriptionStatus(
      courseId,
      user.studentProfileId || user.id,
    );
  }

  @Get('lessons/:lessonId/viewer')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Secure Lesson Viewer with signed DRM video streaming token and resume state' })
  @ApiResponse({ status: 200, description: 'Lesson details with signed media playback token' })
  @ApiResponse({ status: 403, description: 'Access denied: active course entitlement required' })
  async getLessonViewer(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.getLessonViewer(lessonId, user);
  }

  @Get('lessons/:lessonId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Alias for Secure Lesson Viewer' })
  async getLessonViewerAlias(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.getLessonViewer(lessonId, user);
  }

  @Post('lessons/:lessonId/progress')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Real-time heartbeat to update lesson video playback position and completion' })
  async updateLessonProgress(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.updateLessonProgress(
      user,
      lessonId,
      dto,
    );
  }

  @Get('lessons/:lessonId/stream-auth')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Generate time-limited signed DRM streaming credentials and watermark verification' })
  @ApiResponse({ status: 200, description: 'Signed DRM stream payload returned' })
  @ApiResponse({ status: 403, description: 'Access denied: enrollment required' })
  async getLessonStreamAuth(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.getLessonStreamAuth(lessonId, user);
  }

  @Get(':id/enrollments')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'List all students enrolled in a course' })
  async getCourseEnrollments(
    @Param('id') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.getCourseEnrollments(
      courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
    );
  }

  @Post(':id/enroll-students')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Batch enroll student IDs into a course' })
  async enrollStudentsBatch(
    @Param('id') courseId: string,
    @Body() dto: EnrollStudentsBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.enrollStudentsBatch(
      courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Post(':id/create-and-enroll-student')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new student and enroll them in this course' })
  async createAndEnrollStudent(
    @Param('id') courseId: string,
    @Body() dto: CreateAndEnrollStudentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.createAndEnrollStudent(
      courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Post(':id/enroll-by-qr')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Enroll a student into this course by scanning their QR code' })
  async enrollByQrToken(
    @Param('id') courseId: string,
    @Body() dto: EnrollByQrDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.enrollByQrToken(
      courseId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Delete(':id/enrollments/:studentId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Revoke student enrollment from course' })
  async revokeStudentEnrollment(
    @Param('id') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.coursesService.revokeStudentEnrollment(
      courseId,
      studentId,
      user.teacherProfileId || user.id,
      isSecretariat,
    );
  }
}
