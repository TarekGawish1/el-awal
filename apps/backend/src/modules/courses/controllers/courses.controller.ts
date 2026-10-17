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
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../../../core/interceptors/fastify-file.interceptor';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
import { ReorderModulesDto, ReorderLessonsDto } from '../dto/reorder-modules.dto';
import {
  EnrollStudentsBatchDto,
  CreateAndEnrollStudentDto,
  EnrollByQrDto,
  CourseSubscriptionRequestDto,
  RejectSubscriptionRequestDto,
} from '../dto/enrollment.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { Public } from '../../../core/security/decorators/public.decorator';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Online Courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  private teacherCtx(user: AuthenticatedUser) {
    return {
      tId: user.teacherProfileId || user.id,
      isSec: user.role === UserRole.SECRETARIAT,
    };
  }

  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'Public catalog of published courses with Keyset pagination and filters' })
  getCatalog(@Query() query: CourseQueryDto) {
    return this.coursesService.getPublishedCatalog(query);
  }

  @Public()
  @Get(':id/public')
  @ApiOperation({ summary: 'Public course outline, modules, and preview lessons' })
  getPublicCourse(@Param('id') id: string) {
    return this.coursesService.getPublicCourseDetails(id);
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all courses created by the authenticated teacher' })
  getTeacherCourses(@CurrentUser() user: AuthenticatedUser) {
    const { tId } = this.teacherCtx(user);
    return this.coursesService.getTeacherCourses(tId);
  }

  @Get('teacher/subscriptions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all pending requests and active students across teacher courses' })
  getTeacherSubscriptions(@CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getTeacherSubscriptions(user);
  }

  @Post('lessons/upload-video-credentials')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Generate direct Bunny Stream video upload authorization credentials' })
  generateVideoUploadCredentials(@Body('title') title: string) {
    return this.coursesService.generateDirectVideoUploadCredentials(title || 'New Course Lesson');
  }

  @Post('lessons/upload-video-stream')
  @UseInterceptors(FastifyFileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Direct video upload to Bunny Stream via server proxy fallback' })
  uploadVideoStream(@UploadedFile() file: Express.Multer.File, @Body('title') title?: string, @Body('videoId') videoId?: string) {
    if (!file) throw new BadRequestException('ملف الفيديو مطلوب للرفع');
    if (file.size === 0) throw new BadRequestException('ملف الفيديو فارغ (0 بايت). يرجى اختيار ملف فيديو صالح وإعادة الرفع.');
    return this.coursesService.uploadVideoDirect(file, title, videoId);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new online course (Draft) scoped to authenticated instructor' })
  createCourse(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId } = this.teacherCtx(user);
    return this.coursesService.createCourse(tId, dto);
  }

  @Get('my-courses')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all enrolled online courses for the authenticated student with progress %' })
  getMyCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getMyCourses(user.studentProfileId || user.id);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get course outline, modules, and ordered lesson list' })
  getCourseDetails(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getCourseDetails(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update course metadata or publish status (Ownership protected)' })
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.updateCourse(id, tId, isSec, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete or archive a course' })
  deleteCourse(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.deleteCourse(id, tId, isSec);
  }

  @Post(':id/group-access')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Batch grant course access to students in specified physical AcademicGroups' })
  grantGroupAccess(@Param('id') courseId: string, @Body() dto: GrantGroupAccessDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.grantGroupAccess(courseId, tId, isSec, dto);
  }

  @Post('modules/reorder')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Bulk reorder modules in a course' })
  reorderModules(@Body() dto: ReorderModulesDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.reorderModules(dto.courseId, tId, isSec, dto);
  }

  @Post('lessons/reorder')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Bulk reorder lessons within/across modules in a course' })
  reorderLessons(@Body() dto: ReorderLessonsDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.reorderLessons(dto.courseId, tId, isSec, dto);
  }

  @Post(':id/modules')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Add a new module/chapter to course outline' })
  createModule(@Param('id') courseId: string, @Body() dto: CreateModuleDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.createModule(courseId, tId, isSec, dto);
  }

  @Patch('modules/:moduleId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update module title, description, or linked unit quiz' })
  updateModule(@Param('moduleId') moduleId: string, @Body() dto: UpdateModuleDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.updateModule(moduleId, tId, isSec, dto);
  }

  @Delete('modules/:moduleId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete a module and all its lessons' })
  deleteModule(@Param('moduleId') moduleId: string, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.deleteModule(moduleId, tId, isSec);
  }

  @Post('modules/:moduleId/lessons')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Add a new lesson to a course module with media identifiers' })
  createLesson(@Param('moduleId') moduleId: string, @Body() dto: CreateLessonDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.createLesson(moduleId, tId, isSec, dto);
  }

  @Patch('lessons/:lessonId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update lesson metadata, rich summary, or linked quiz' })
  updateLesson(@Param('lessonId') lessonId: string, @Body() dto: UpdateLessonDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.updateLesson(lessonId, tId, isSec, dto);
  }

  @Delete('lessons/:lessonId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete a lesson' })
  deleteLesson(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.deleteLesson(lessonId, tId, isSec);
  }

  @Post('lessons/:lessonId/attachments')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Upload and link PDF summaries / worksheets to a lesson' })
  addLessonAttachment(@Param('lessonId') lessonId: string, @Body() dto: CreateAttachmentDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.addLessonAttachment(lessonId, tId, isSec, dto);
  }

  @Delete('lessons/attachments/:attachmentId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Remove a lesson attachment' })
  deleteLessonAttachment(@Param('attachmentId') attachmentId: string, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.deleteLessonAttachment(attachmentId, tId, isSec);
  }

  @Get('lessons/:lessonId/questions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Fetch all timestamped Q&A questions for a lesson' })
  getLessonQuestions(@Param('lessonId') lessonId: string) {
    return this.coursesService.getLessonQuestions(lessonId);
  }

  @Post('lessons/:lessonId/questions')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Submit a timestamped question on a lesson video' })
  createLessonQuestion(@Param('lessonId') lessonId: string, @Body() dto: CreateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.createLessonQuestion(lessonId, user, dto);
  }

  @Post('questions/:questionId/replies')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Add a reply to a student timestamped question' })
  createQuestionReply(@Param('questionId') questionId: string, @Body() dto: CreateQuestionReplyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.createQuestionReply(questionId, user, dto);
  }

  @Patch('questions/:questionId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Update a student timestamped question (author or teacher/secretariat)' })
  updateLessonQuestion(@Param('questionId') questionId: string, @Body() dto: UpdateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.updateLessonQuestion(questionId, user, dto);
  }

  @Delete('questions/:questionId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete a student timestamped question (author or teacher/secretariat)' })
  deleteLessonQuestion(@Param('questionId') questionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.deleteLessonQuestion(questionId, user);
  }

  @Patch('questions/replies/:replyId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Update a question reply (author or teacher/secretariat)' })
  updateQuestionReply(@Param('replyId') replyId: string, @Body() dto: UpdateQuestionReplyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.updateQuestionReply(replyId, user, dto);
  }

  @Delete('questions/replies/:replyId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete a question reply (author or teacher/secretariat)' })
  deleteQuestionReply(@Param('replyId') replyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.deleteQuestionReply(replyId, user);
  }

  @Post(':id/enroll')
  @Roles(UserRole.STUDENT, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Enroll authenticated student in a published course' })
  enrollCourse(@Param('id') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.enrollCourse(courseId, user.studentProfileId || user.id);
  }

  @Post(':id/subscribe-request')
  @Roles(UserRole.STUDENT, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Submit course subscription application with Vodafone Cash transfer receipt' })
  requestCourseSubscription(@Param('id') courseId: string, @Body() dto: CourseSubscriptionRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.requestCourseSubscription(courseId, user.studentProfileId || user.id, dto);
  }

  @Get(':id/pending-enrollments')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get list of pending course subscription requests with receipts' })
  getPendingEnrollments(@Param('id') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getPendingEnrollmentRequests(courseId, user);
  }

  @Post('enrollments/:enrollmentId/approve')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Approve a student subscription request and activate course access' })
  approveSubscription(@Param('enrollmentId') enrollmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.approveSubscriptionRequest(enrollmentId, user);
  }

  @Post('enrollments/:enrollmentId/reject')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Reject a student subscription request with reason' })
  rejectSubscription(@Param('enrollmentId') enrollmentId: string, @Body() dto: RejectSubscriptionRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.rejectSubscriptionRequest(enrollmentId, user, dto);
  }

  @Post('enrollments/:enrollmentId/cancel')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Cancel active course enrollment and suspend access' })
  cancelSubscription(@Param('enrollmentId') enrollmentId: string, @CurrentUser() user: AuthenticatedUser, @Body('reason') reason?: string) {
    return this.coursesService.cancelStudentSubscription(enrollmentId, user, reason);
  }

  @Get(':id/subscription-status')
  @Roles(UserRole.STUDENT, UserRole.SECRETARIAT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Check student subscription status for a course' })
  getSubscriptionStatus(@Param('id') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getStudentCourseSubscriptionStatus(courseId, user.studentProfileId || user.id);
  }

  @Get('lessons/:lessonId/viewer')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Secure Lesson Viewer with signed DRM video streaming token and resume state' })
  getLessonViewer(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getLessonViewer(lessonId, user);
  }

  @Get('lessons/:lessonId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Alias for Secure Lesson Viewer' })
  getLessonViewerAlias(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getLessonViewer(lessonId, user);
  }

  @Post('lessons/:lessonId/progress')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Real-time heartbeat to update lesson video playback position and completion' })
  updateLessonProgress(@Param('lessonId') lessonId: string, @Body() dto: UpdateProgressDto, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.updateLessonProgress(user, lessonId, dto);
  }

  @Get('lessons/:lessonId/stream-auth')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Generate time-limited signed DRM streaming credentials and watermark verification' })
  getLessonStreamAuth(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getLessonStreamAuth(lessonId, user);
  }

  @Get('lessons/:lessonId/stream-ticket')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Generate cryptographically signed short-lived Bunny Stream embed ticket' })
  getLessonStreamTicket(@Param('lessonId') lessonId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getLessonStreamTicket(lessonId, user);
  }

  @Get(':id/enrollments')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'List all students enrolled in a course' })
  getCourseEnrollments(@Param('id') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.getCourseEnrollments(courseId, tId, isSec);
  }

  @Post(':id/enroll-students')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Batch enroll student IDs into a course' })
  enrollStudentsBatch(@Param('id') courseId: string, @Body() dto: EnrollStudentsBatchDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.enrollStudentsBatch(courseId, tId, isSec, dto);
  }

  @Post(':id/create-and-enroll-student')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new student and enroll them in this course' })
  createAndEnrollStudent(@Param('id') courseId: string, @Body() dto: CreateAndEnrollStudentDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.createAndEnrollStudent(courseId, tId, isSec, dto);
  }

  @Post(':id/enroll-by-qr')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Enroll a student into this course by scanning their QR code' })
  enrollByQrToken(@Param('id') courseId: string, @Body() dto: EnrollByQrDto, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.enrollByQrToken(courseId, tId, isSec, dto);
  }

  @Delete(':id/enrollments/:studentId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Revoke student enrollment from course' })
  revokeStudentEnrollment(@Param('id') courseId: string, @Param('studentId') studentId: string, @CurrentUser() user: AuthenticatedUser) {
    const { tId, isSec } = this.teacherCtx(user);
    return this.coursesService.revokeStudentEnrollment(courseId, studentId, tId, isSec);
  }
}

