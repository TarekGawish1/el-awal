import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParentPortalService } from '../services/parent-portal.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Parent Portal')
@ApiBearerAuth()
@Controller('parent-portal')
export class ParentPortalController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('students')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get all children/students linked to authenticated parent' })
  async getLinkedStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.parentPortalService.getLinkedStudents(user.parentProfileId || user.id);
  }

  @Get('students/:studentId/summary')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Get consolidated academic summary, attendance and grades for linked child' })
  async getStudentSummary(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parentPortalService.getStudentAcademicSummary(
      user.parentProfileId || user.id,
      studentId,
    );
  }
}
