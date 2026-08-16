import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService, CreateCourseDto } from '../services/courses.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { Public } from '../../../core/security/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Online Courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'Get published course catalog with optional grade level filter' })
  async getCatalog(@Query('gradeLevel') gradeLevel?: string) {
    return this.coursesService.getPublishedCatalog(gradeLevel);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new online course (Draft)' })
  async createCourse(
    @Body() dto: Omit<CreateCourseDto, 'teacherId'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.createCourse({
      ...dto,
      teacherId: user.teacherProfileId || user.id,
    });
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get course outline, modules, and lessons by course ID' })
  async getCourseDetails(@Param('id') id: string) {
    return this.coursesService.getCourseDetails(id);
  }
}
