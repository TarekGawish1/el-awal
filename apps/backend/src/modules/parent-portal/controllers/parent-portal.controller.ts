import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ParentPortalService } from '../services/parent-portal.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Parent Guardian Portal')
@ApiBearerAuth()
@Controller('parent-portal')
export class ParentPortalController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('students')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'List all children/students linked to the authenticated parent' })
  async getLinkedStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.parentPortalService.getLinkedStudents(
      user.parentProfileId || user.id,
    );
  }

  @Get('students/:studentId/overview')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Consolidated real-time KPI card overview (Attendance %, Exam averages, Billing alerts)' })
  @ApiResponse({ status: 200, description: 'Child KPI metrics summary' })
  @ApiResponse({ status: 403, description: 'Guardianship link verification failed' })
  async getStudentOverview(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parentPortalService.getStudentOverview(
      user.parentProfileId || user.id,
      studentId,
    );
  }

  @Get('students/:studentId/attendance')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Keyset cursor-paginated physical classroom attendance history for child' })
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @Query() query: CursorPaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parentPortalService.getStudentAttendance(
      user.parentProfileId || user.id,
      studentId,
      query,
    );
  }

  @Get('students/:studentId/assessments')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'List graded exam/assignment submissions and instructor feedback for child' })
  async getStudentAssessments(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parentPortalService.getStudentAssessments(
      user.parentProfileId || user.id,
      studentId,
    );
  }

  @Get('students/:studentId/courses')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Online course enrollment and lesson completion progress for child' })
  async getStudentCourses(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parentPortalService.getStudentCourses(
      user.parentProfileId || user.id,
      studentId,
    );
  }
}
