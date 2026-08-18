import { Controller, Get, Put, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TeachersService } from '../services/teachers.service';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { UpdateAcademicPeriodDto } from '../dto/update-academic-period.dto';
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
  constructor(private readonly teachersService: TeachersService) {}

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
}

