import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

export class PresignedUploadDto {
  @ApiProperty({
    description: 'Original file name including extension',
    example: 'arabic-grammar-summary.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  fileName: string;

  @ApiPropertyOptional({
    description: 'MIME type of the upload file (Strict allowlist enforced)',
    example: 'application/pdf',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Alias for contentType',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes (max 100MB for R2)',
    example: 10485760,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104857600, { message: 'File size exceeds maximum limit of 100MB' })
  fileSizeBytes?: number;

  @ApiPropertyOptional({
    description: 'Target storage directory partition',
    example: 'courses',
    default: 'courses',
  })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class PresignedVideoUploadDto {
  @ApiProperty({
    description: 'Video title or lesson topic for Bunny Stream',
    example: 'شرح الوحدة الأولى - النحو',
  })
  @IsString()
  @IsNotEmpty({ message: 'Video title is required' })
  title: string;
}
