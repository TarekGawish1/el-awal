import {
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

export class UpdateContentDto {
  @ApiPropertyOptional({ example: 'ملخص النحو - الوحدة الأولى المحدث', minLength: 3 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ example: 'ملف PDF يحتوي على ملخص شامل لدروس همزة القطع والوصل والمشتقات' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ContentType, example: ContentType.SUMMARY })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({ description: 'Cloudflare R2 object key' })
  @IsOptional()
  @IsString()
  fileKey?: string;

  @ApiPropertyOptional({ description: 'Public or presigned URL for file' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 5242880 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Original file name uploaded by user' })
  @IsOptional()
  @IsString()
  originalFileName?: string;

  @ApiPropertyOptional({ description: 'Academic physical group ID to attach asset to' })
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Grade level (e.g. الصف الثالث الإعدادي)' })
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Academic year (e.g. 2026-2027)' })
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ description: 'Academic semester / term (FIRST_TERM / SECOND_TERM)' })
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  academicTerm?: string;

  @ApiPropertyOptional({ description: 'Session topic or lesson title' })
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  sessionTopic?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() !== '' && value !== '__CUSTOM__' ? value.trim() : undefined))
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Course lesson ID to attach asset to' })
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsOptional()
  @IsUUID()
  lessonId?: string;
}
