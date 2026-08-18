import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty({ example: 'ملخص النحو - الوحدة الأولى', minLength: 3 })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 'ملف PDF يحتوي على ملخص شامل لدروس همزة القطع والوصل والمشتقات' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ContentType, example: ContentType.SUMMARY })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({ description: 'Cloudflare R2 object key', example: 'uploads/courses/1723820000-summary.pdf' })
  @IsString()
  @IsNotEmpty({ message: 'File key is required' })
  fileKey: string;

  @ApiProperty({ description: 'Public or presigned URL for file', example: 'https://cdn.elawal.com/uploads/courses/1723820000-summary.pdf' })
  @IsString()
  @IsNotEmpty({ message: 'File URL is required' })
  fileUrl: string;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 5242880 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Academic physical group ID to attach asset to' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Grade level (e.g. الصف الثالث الإعدادي)' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Academic year (e.g. 2025-2026)' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ description: 'Academic semester / term (FIRST_TERM / SECOND_TERM)' })
  @IsOptional()
  @IsString()
  academicTerm?: string;

  @ApiPropertyOptional({ description: 'Session topic or lesson title' })
  @IsOptional()
  @IsString()
  sessionTopic?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Course lesson ID to attach asset to' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;
}
