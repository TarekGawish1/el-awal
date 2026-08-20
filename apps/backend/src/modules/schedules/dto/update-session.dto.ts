import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Session Date (YYYY-MM-DD)', example: '2026-08-20' })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ الحصة غير صالح' })
  sessionDate?: string;

  @ApiPropertyOptional({ description: 'Start time in format HH:MM', example: '16:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in format HH:MM', example: '18:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Lesson Topic or Title', example: 'الحصة 1: المحاضرة التأسيسية واسم الفاعل' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Academic Group ID' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Mark session as canceled for this day', example: true })
  @IsOptional()
  isCancelled?: boolean;

  @ApiPropertyOptional({ description: 'Reason for session cancellation', example: 'ظرف طارئ للمعلم أو عطلة رسمية' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
