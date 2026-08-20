import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus, RecordingMethod } from '@prisma/client';

export class SyncAttendanceItemDto {
  @ApiProperty({ description: 'Client-generated UUIDv7 operation ID for idempotency' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Target lesson session UUID' })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Scanned student QR token' })
  @IsString()
  @IsOptional()
  qrCodeToken?: string;

  @ApiPropertyOptional({ description: 'Student profile UUID if direct manual entry' })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiProperty({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ enum: RecordingMethod, default: RecordingMethod.QR_SCAN })
  @IsEnum(RecordingMethod)
  recordingMethod: RecordingMethod;

  @ApiProperty({ description: 'Client timestamp in epoch ms when recorded offline' })
  @IsNumber()
  clientTimestamp: number;

  @ApiPropertyOptional({ description: 'Allow recording for student enrolled in different group' })
  @IsOptional()
  allowCrossGroup?: boolean;

  @ApiPropertyOptional({ description: 'Notes or reason for absence' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class SyncAttendanceBatchDto {
  @ApiProperty({ type: [SyncAttendanceItemDto], description: 'Array of offline attendance operations to reconcile' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncAttendanceItemDto)
  operations: SyncAttendanceItemDto[];
}
