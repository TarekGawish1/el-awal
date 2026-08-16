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
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
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
  async getAssessments(@Query() query: AssessmentQueryDto) {
    return this.assessmentsService.getAssessments(query);
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

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit student answers for synchronous auto-grading (Single attempt enforced)' })
  @ApiResponse({ status: 200, description: 'Submission auto-graded or staged for manual review' })
  @ApiResponse({ status: 409, description: 'Assessment already submitted' })
  async submitAssessment(
    @Param('id') id: string,
    @Body() dto: SubmitAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.submitAssessment(
      id,
      user.studentProfileId || user.id,
      dto,
    );
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
}
