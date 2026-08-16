import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService, CreateAssessmentDto } from '../services/assessments.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Assessments & Exams')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create assignment or examination' })
  async createAssessment(
    @Body() dto: Omit<CreateAssessmentDto, 'teacherId'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.createAssessment({
      ...dto,
      teacherId: user.teacherProfileId || user.id,
    });
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get assessment details and questions' })
  async getAssessmentById(@Param('id') id: string) {
    return this.assessmentsService.getAssessmentById(id);
  }
}
