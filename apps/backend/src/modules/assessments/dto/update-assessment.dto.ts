import { IsOptional, IsString, MinLength, IsInt, Min, IsDateString, IsBoolean, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'Test duration limit in minutes',
    example: 45,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Submission cut-off date and time (ISO format)',
    example: '2026-09-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Whether the assessment is active and visible to students',
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Target online course ID',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string | null;
}
