import {
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLessonDto {
  @ApiPropertyOptional({
    description: 'Lesson title',
    example: 'الدرس الأول: همزة القطع وألف الوصل (محدث)',
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    description: 'Lesson description or learning objectives',
    example: 'التعرف على مواضع همزة القطع وألف الوصل في الأسماء والأفعال والحروف.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lesson sequence index within the module',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Type of curriculum item',
    enum: ['VIDEO', 'DOCUMENT', 'QUIZ'],
    example: 'VIDEO',
  })
  @IsOptional()
  @IsIn(['VIDEO', 'DOCUMENT', 'QUIZ'])
  lessonType?: string;

  @ApiPropertyOptional({
    description: 'Bunny Stream Video GUID for video streaming',
    example: '9f8a7b6c-5d4e-3f2a-1b0c-9e8d7c6b5a4f',
  })
  @IsOptional()
  @IsString()
  bunnyVideoId?: string;

  @ApiPropertyOptional({
    description: 'Cloudflare R2 storage key or download link for PDF/documents',
    example: 'courses/arabic/summaries/lesson-01.pdf',
  })
  @IsOptional()
  @IsString()
  contentUrl?: string;

  @ApiPropertyOptional({
    description: 'Estimated video duration in seconds',
    example: 1800,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  videoDurationSeconds?: number;

  @ApiPropertyOptional({
    description: 'Whether non-enrolled students can access this lesson as a free preview sample',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({
    description: 'Detailed study notes / markdown summary of the lesson',
    example: '### ملخص درس كان وأخواتها\n- ترفع المبتدأ ويسمى اسمها\n- تنصب الخبر ويسمى خبرها',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Linked lesson interactive quiz / checkpoint assessment ID',
    example: 'd933cc98-532e-4940-a1b6-ba121ff5a697',
  })
  @IsOptional()
  @IsString()
  lessonQuizId?: string | null;
}
