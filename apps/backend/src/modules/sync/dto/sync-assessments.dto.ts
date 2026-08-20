import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SyncStudentAnswerDto {
  @ApiProperty({ description: 'Question UUID' })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'Selected option or written essay text' })
  @IsString()
  @IsNotEmpty()
  selectedAnswer: string;
}

export class SyncAssessmentItemDto {
  @ApiProperty({ description: 'Client-generated UUIDv7 operation ID' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Assessment UUID' })
  @IsUUID()
  @IsNotEmpty()
  assessmentId: string;

  @ApiProperty({ type: [SyncStudentAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncStudentAnswerDto)
  answers: SyncStudentAnswerDto[];

  @ApiPropertyOptional({ description: 'Attachment URL if applicable' })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiProperty({ description: 'Client start timestamp in epoch ms' })
  @IsNumber()
  @IsOptional()
  startedAt?: number;

  @ApiProperty({ description: 'Client submission timestamp in epoch ms' })
  @IsNumber()
  clientTimestamp: number;
}

export class SyncAssessmentsBatchDto {
  @ApiProperty({ type: [SyncAssessmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncAssessmentItemDto)
  operations: SyncAssessmentItemDto[];
}
