import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitHomeworkDto {
  @ApiProperty({
    description: 'Physical lesson session the homework belongs to',
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Cloudflare R2 object key of the uploaded homework answer',
    example: 'uploads/homework-submissions/1723820000-answer.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileKey: string;

  @ApiProperty({
    description: 'Public or presigned URL of the uploaded homework answer',
    example: 'https://cdn.elawal.com/uploads/homework-submissions/1723820000-answer.pdf',
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional({
    description: 'Optional student note to the teacher',
    example: 'رجاء مراجعة حل التمرين الرابع',
  })
  @IsOptional()
  @IsString()
  studentNotes?: string;
}
