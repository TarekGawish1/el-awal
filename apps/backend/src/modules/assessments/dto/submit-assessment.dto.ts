import { IsArray, ValidateNested, IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentAnswerItemDto {
  @ApiProperty({
    description: 'Target question UUID',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Student supplied answer choice or essay text',
    example: 'خبر كان منصوب',
  })
  @IsString()
  @IsNotEmpty()
  answerGiven: string;
}

export class SubmitAssessmentDto {
  @ApiProperty({
    type: [StudentAnswerItemDto],
    description: 'Array of student question answers',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAnswerItemDto)
  answers: StudentAnswerItemDto[];

  @ApiPropertyOptional({
    description: 'Optional student attachment URL (e.g. uploaded handwritten essay scan)',
    example: 'https://cdn.elawal.com/uploads/assignments/essay-scan.pdf',
  })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
