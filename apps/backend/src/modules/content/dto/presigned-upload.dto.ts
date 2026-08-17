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

  @ApiProperty({
    description: 'MIME type of the upload file (Strict allowlist enforced)',
    example: 'application/pdf',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsString()
  @IsNotEmpty({ message: 'Content type is required' })
  @IsIn(ALLOWED_MIME_TYPES as unknown as string[], {
    message: 'Unsupported MIME type. Allowed types: PDF, JPG, PNG, WEBP, MP3, MP4, DOC, DOCX',
  })
  contentType: string;

  @ApiPropertyOptional({
    description: 'File size in bytes (max 100MB)',
    example: 10485760,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104857600, { message: 'File size exceeds maximum limit of 100MB' })
  fileSizeBytes?: number;

  @ApiPropertyOptional({
    description: 'Target storage directory partition',
    enum: ['courses', 'assignments', 'summaries', 'avatars'],
    example: 'courses',
    default: 'courses',
  })
  @IsOptional()
  @IsIn(['courses', 'assignments', 'summaries', 'avatars'])
  folder?: string;
}
