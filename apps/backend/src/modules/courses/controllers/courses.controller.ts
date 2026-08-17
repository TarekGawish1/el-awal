import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { CourseQueryDto } from '../dto/course-query.dto';
import { UpdateProgressDto } from '../dto/update-progress.dto';
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

  @Get('lessons/:lessonId')
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

  @Post('lessons/:lessonId/progress')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Real-time heartbeat to update lesson video playback position and completion' })
  async updateLessonProgress(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.updateLessonProgress(
      user.studentProfileId || user.id,
      lessonId,
      dto,
    );
  }
}
