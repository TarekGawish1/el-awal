import { IsOptional, IsString, MinLength, IsInt, Min, IsDateString, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentType, ExamTimingType } from '@prisma/client';

export class UpdateAssessmentDto {
  @ApiPropertyOptional({
    description: 'Assessment title',
    example: 'اختبار النحو والبلاغة الشامل - الوحدة الأولى',
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    description: 'Assessment description and student guidelines',
    example: 'اختبار شامل مدته 45 دقيقة يحتوي على أسئلة اختيار من متعدد وسؤال مقالي.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ExamTimingType,
    description: 'Timing mode: FIXED_SESSION (synchronized) or FLEXIBLE_WINDOW (individual duration)',
    example: ExamTimingType.FIXED_SESSION,
  })
  @IsOptional()
  @IsEnum(ExamTimingType)
  timingType?: ExamTimingType;

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

  @ApiPropertyOptional({ enum: AssessmentType })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;

  @ApiPropertyOptional({
    description: 'Whether the assessment is active and visible to students',
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Whether students may take this assessment more than once (retakes). When false, only a single attempt is allowed.',
  })
  @IsOptional()
  @IsBoolean()
  allowMultipleAttempts?: boolean;

  @ApiPropertyOptional({
    description: 'Target online course ID',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string | null;

  @ApiPropertyOptional({
    description: 'Target online course lesson ID',
  })
  @IsOptional()
  @IsUUID()
  lessonId?: string | null;
}
