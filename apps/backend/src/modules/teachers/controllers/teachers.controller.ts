import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeachersService } from '../services/teachers.service';
import { StudentsService } from '../../students/services/students.service';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { UpdateAcademicPeriodDto } from '../dto/update-academic-period.dto';
import { ResetStudentPasswordDto } from '../../students/dto/reset-student-password.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly studentsService: StudentsService,
  ) {}

  @Get('dashboard/overview')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Consolidated teacher dashboard aggregated metrics, KPIs, and alerts',
  })
  @ApiResponse({ status: 200, description: 'Teacher dashboard overview data' })
  async getDashboardOverview(
    @Query() query: DashboardOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.teachersService.getDashboardOverview(teacherId, query);
  }

  @Get('academic-period')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Get the active academic year and term for current teacher from database',
  })
  @ApiResponse({ status: 200, description: 'Active academic period' })
  async getAcademicPeriod(@CurrentUser() user: AuthenticatedUser) {
    const teacherId = user.teacherProfileId || user.id;
    return this.teachersService.getAcademicPeriod(teacherId);
  }

  @Put('academic-period')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Update and persist the active academic year and term in database',
  })
  @ApiResponse({ status: 200, description: 'Updated academic period' })
  async updateAcademicPeriod(
    @Body() dto: UpdateAcademicPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.teachersService.updateAcademicPeriod(teacherId, dto);
  }

  @Get('students/:studentId/credentials')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Retrieve student credentials and active temporary access PIN',
  })
  async getStudentCredentials(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentsService.getStudentCredentials(studentId, user);
  }

  @Post('students/:studentId/reset-password')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Reset student password and optionally send WhatsApp notification to student and parent',
  })
  async resetStudentPassword(
    @Param('studentId') studentId: string,
    @Body() dto: ResetStudentPasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentsService.resetStudentPassword(studentId, dto, user);
  }

  @Get('saved-locations')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Get saved center locations for the teacher',
  })
  @ApiResponse({ status: 200, description: 'List of saved location names' })
  async getSavedLocations(@CurrentUser() user: AuthenticatedUser) {
    const teacherId = user.teacherProfileId || user.id;
    return this.teachersService.getSavedLocations(teacherId);
  }

  @Put('saved-locations')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Update the list of saved center locations',
  })
  @ApiResponse({ status: 200, description: 'Updated list of saved location names' })
  async updateSavedLocations(
    @Body() dto: { locations: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.teachersService.updateSavedLocations(teacherId, dto.locations);
  }
}

