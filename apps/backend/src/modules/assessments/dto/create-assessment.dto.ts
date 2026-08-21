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
import { AssessmentType } from '@prisma/client';
import { CreateQuestionDto } from './create-question.dto';

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
  type: AssessmentType;

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
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Submission cut-off date and time (ISO format)',
    example: '2026-09-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

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

  @ApiProperty({
    type: [CreateQuestionDto],
    description: 'Array of assessment questions',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
