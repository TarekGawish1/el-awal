import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignedUploadDto {
  @ApiProperty({
    description: 'Original file name including extension',
    example: 'arabic-grammar-summary.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the upload file',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content type is required' })
  contentType: string;

  @ApiPropertyOptional({
    description: 'File size in bytes (max 100MB)',
    example: 10485760,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
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
