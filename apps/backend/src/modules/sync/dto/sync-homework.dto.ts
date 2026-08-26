import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { HomeworkSubmissionStatus, RecordingMethod } from '@prisma/client';

export class SyncHomeworkItemDto {
  @ApiProperty({
    description: 'Unique client-generated idempotent operation identifier',
    example: 'd9b2d63d-a233-4f9e-a0f5-e0f6c2f0f4a1',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Assessment identifier (homework assignment)',
    example: 'd9b2d63d-a233-4f9e-a0f5-e0f6c2f0f4a2',
  })
  @IsUUID()
  assessmentId: string;

  @ApiPropertyOptional({
    description: 'Target student profile ID (UUID)',
    example: 'd9b2d63d-a233-4f9e-a0f5-e0f6c2f0f4a3',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({
    description: 'Alternative raw QR Code token scanned from physical student card',
    example: 'QR-STU-2026-0001',
  })
  @IsOptional()
  @IsString()
  qrCodeToken?: string;

  @ApiProperty({
    description: 'Lesson session identifier',
    example: 'd9b2d63d-a233-4f9e-a0f5-e0f6c2f0f4a4',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    enum: HomeworkSubmissionStatus,
    description: 'Delivery and verification status',
    example: HomeworkSubmissionStatus.CHECKED_ONSITE,
  })
  @IsEnum(HomeworkSubmissionStatus)
  status: HomeworkSubmissionStatus;

  @ApiProperty({
    enum: RecordingMethod,
    description: 'How the homework was inspected and recorded',
    example: RecordingMethod.QR_SCAN,
  })
  @IsEnum(RecordingMethod)
  recordedMethod: RecordingMethod;

  @ApiPropertyOptional({
    description: 'Optional numeric score granted by teacher (e.g. 10.0)',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional({
    description: 'Optional feedback or notes from teacher/secretariat',
    example: 'حل ممتاز ومكتمل بالكامل في الكشكول',
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({
    description: 'Unix timestamp in milliseconds recorded on client device',
    example: 1724673600000,
  })
  @IsNumber()
  clientTimestamp: number;
}

export class SyncHomeworkBatchDto {
  @ApiProperty({
    type: [SyncHomeworkItemDto],
    description: 'Array of onsite homework operations recorded offline',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncHomeworkItemDto)
  operations: SyncHomeworkItemDto[];
}
