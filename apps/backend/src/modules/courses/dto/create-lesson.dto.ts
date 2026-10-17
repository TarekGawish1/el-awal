import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsIn,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAttachmentDto } from './lesson-attachment.dto';

export class CreateLessonDto {
  @ApiProperty({
    description: 'Lesson title',
    example: 'الدرس الأول: همزة القطع وألف الوصل',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty({ message: 'Lesson title is required' })
  @MinLength(3, { message: 'Lesson title must be at least 3 characters' })
  title: string;

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
    default: 'VIDEO',
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
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({
    description: 'Alias for isFreePreview',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

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
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined && val !== '')
  @IsString()
  lessonQuizId?: string | null;

  @ApiPropertyOptional({
    description: 'Alias for lessonQuizId sent by lesson editor (quizId)',
    example: 'd933cc98-532e-4940-a1b6-ba121ff5a697',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined && val !== '')
  @IsString()
  quizId?: string | null;

  @ApiPropertyOptional({
    description: 'Linked lesson homework / assignment assessment ID (homeworkId)',
    example: 'e822bb87-421d-4830-90a5-ab010ee4a586',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined && val !== '')
  @IsString()
  homeworkId?: string | null;

  @ApiPropertyOptional({
    description: 'Alias for homeworkId (lessonHomeworkId)',
    example: 'e822bb87-421d-4830-90a5-ab010ee4a586',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined && val !== '')
  @IsString()
  lessonHomeworkId?: string | null;

  @ApiPropertyOptional({
    description: 'Whether students can retake the quiz multiple times',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  allowMultipleAttempts?: boolean;

  @ApiPropertyOptional({
    description: 'Whether students can retake the homework multiple times',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  allowHomeworkMultipleAttempts?: boolean;

  @ApiPropertyOptional({
    description: 'Whether passing score is required to unlock subsequent content',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requirePassingScore?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the quiz is optional',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isQuizOptional?: boolean;

  @ApiPropertyOptional({
    description: 'Whether passing score is required for the quiz',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isQuizPassRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the homework is optional',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isHomeworkOptional?: boolean;

  @ApiPropertyOptional({
    description: 'Whether passing score is required for the homework',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isHomeworkPassRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Initial lesson attachments to create atomically with the lesson',
    type: () => [CreateAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentDto)
  attachments?: CreateAttachmentDto[];
}
