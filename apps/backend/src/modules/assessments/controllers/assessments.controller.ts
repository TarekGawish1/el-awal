import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from '../services/assessments.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { SubmitHomeworkDto } from '../dto/submit-homework.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Academic Assessments & Auto-Grading')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create assignment or examination with question bank' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  @ApiResponse({ status: 400, description: 'Sum of question points does not match total score' })
  async createAssessment(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.assessmentsService.createAssessment(
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'List assessments with Keyset pagination and course/group filters' })
  async getAssessments(
    @Query() query: AssessmentQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.getAssessments(query, user);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get assessment details and questions (Zero-Leak answer redaction for students)' })
  async getAssessmentById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.getAssessmentById(id, user);
  }

  @Get(':id/my-status')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get the authenticated student submission status and attempt policy for an assessment' })
  @ApiResponse({ status: 200, description: 'Submission status, best/latest score, percentage and attempt policy' })
  async getMyAssessmentStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.getMyAssessmentStatus(id, user);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Submit student answers for synchronous auto-grading (attempt policy enforced)' })
  @ApiResponse({ status: 200, description: 'Submission auto-graded or staged for manual review' })
  @ApiResponse({ status: 400, description: 'SINGLE_ATTEMPT_ONLY: the only allowed attempt was already used' })
  async submitAssessment(
    @Param('id') id: string,
    @Body() dto: SubmitAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.submitAssessment(
      id,
      user,
      dto,
    );
  }

  @Post(':id/submit-homework')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Submit a homework answer file (PDF/image) for a physical group session assessment' })
  @ApiResponse({ status: 200, description: 'Homework answer submitted and session homework state updated' })
  async submitHomework(
    @Param('id') id: string,
    @Body() dto: SubmitHomeworkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.submitHomework(id, user, dto);
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Teacher manual grading for essay/subjective questions' })
  @ApiResponse({ status: 200, description: 'Submission graded and final score recomputed' })
  async gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.assessmentsService.gradeSubmission(
      submissionId,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }

  @Get(':id/submissions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'List all student submissions for an assessment' })
  async getAssessmentSubmissions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.assessmentsService.getAssessmentSubmissions(
      id,
      user.teacherProfileId || user.id,
      isSecretariat,
    );
  }

  @Get('submissions/:submissionId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get submission details including answers for manual grading' })
  async getSubmissionById(
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.assessmentsService.getSubmissionById(
      submissionId,
      user.teacherProfileId || user.id,
      isSecretariat,
    );
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update assessment metadata and publishing status' })
  async updateAssessment(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const isSecretariat = user.role === UserRole.SECRETARIAT;
    return this.assessmentsService.updateAssessment(
      id,
      user.teacherProfileId || user.id,
      isSecretariat,
      dto,
    );
  }
}
