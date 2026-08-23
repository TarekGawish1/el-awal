import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttachmentDto {
  @ApiProperty({
    description: 'Attachment title',
    example: 'ملخص الدرس PDF - القوانين والتطبيقات',
  })
  @IsString()
  @IsNotEmpty({ message: 'Attachment title is required' })
  title: string;

  @ApiProperty({
    description: 'Direct file URL or Cloudflare R2 public URL',
    example: 'https://assets.elawal.com/courses/attachments/lesson-01-summary.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'File URL is required' })
  fileUrl: string;

  @ApiProperty({
    description: 'Cloudflare R2 Object Key',
    example: 'courses/attachments/lesson-01-summary.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'File key is required' })
  fileKey: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1048576,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'MIME type of attachment',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  fileType?: string;
}
