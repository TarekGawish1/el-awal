import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentType, ExamTimingType } from '@prisma/client';
import { CreateQuestionDto } from './create-question.dto';

export enum AssessmentCourseLinkScope {
  COURSE = 'COURSE',
  UNIT = 'UNIT',
  LESSON = 'LESSON',
}

export class CreateAssessmentDto {
  @ApiPropertyOptional({
    description: 'Client-generated UUIDv7 for offline idempotency',
    example: '018d39f4-6a8b-7000-8000-000000000000',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'Assessment title',
    example: 'اختبار النحو والبلاغة الشامل - الوحدة الأولى',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({
    description: 'Assessment description and student guidelines',
    example: 'اختبار شامل مدته 45 دقيقة يحتوي على أسئلة اختيار من متعدد وسؤال مقالي.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: AssessmentType,
    example: AssessmentType.EXAM,
  })
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional({
    enum: AssessmentType,
    description: 'Logical assessment type. HOMEWORK is stored as the legacy ASSIGNMENT type for existing clients.',
  })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;

  @ApiPropertyOptional({
    enum: ExamTimingType,
    description: 'Timing mode: FIXED_SESSION (synchronized) or FLEXIBLE_WINDOW (individual duration)',
    example: ExamTimingType.FIXED_SESSION,
  })
  @IsOptional()
  @IsEnum(ExamTimingType)
  timingType?: ExamTimingType;

  @ApiProperty({
    description: 'Total exam maximum score',
    example: 20.0,
    minimum: 1.0,
  })
  @IsNumber()
  @Min(1.0)
  totalScore: number;

  @ApiPropertyOptional({
    description: 'Minimum passing score threshold',
    example: 10.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingScore?: number;

  @ApiPropertyOptional({
    description: 'Test duration limit in minutes',
    example: 45,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Start date and time (ISO format)',
    example: '2026-09-30T22:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End date and time (ISO format)',
    example: '2026-09-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Start date and time alias (ISO format)',
    example: '2026-09-30T22:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Submission cut-off date and time (ISO format)',
    example: '2026-09-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Assessment deadline (alias for dueDate)',
    example: '2026-09-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({
    description: 'Target physical classroom group ID',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Target physical classroom group IDs (for multi-group assessments)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetGroupIds?: string[];

  @ApiPropertyOptional({
    description: 'Target online course ID',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Target lesson ID',
  })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({
    enum: AssessmentCourseLinkScope,
    description: 'Automatically link the created exam as the course or unit exam',
  })
  @IsOptional()
  @IsEnum(AssessmentCourseLinkScope)
  courseLinkScope?: AssessmentCourseLinkScope;

  @ApiPropertyOptional({
    description: 'Target course module ID when courseLinkScope is UNIT',
  })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({
    description: 'Educational Stage',
    example: 'المرحلة الإعدادية',
  })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({
    description: 'Grade Level',
    example: 'الصف الثالث الإعدادي',
  })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'Whether the assessment is active and visible to students',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Whether students may take this assessment more than once (retakes). When false, only a single attempt is allowed.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowMultipleAttempts?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this assessment is optional for students. Optional assessments do not block progression to subsequent lessons or units.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({
    description: 'Whether students must achieve the passing score to progress to the next lesson or unit',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requirePassingScore?: boolean;

  @ApiProperty({
    type: [CreateQuestionDto],
    description: 'Array of assessment questions',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
