import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'Academic Group ID', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  @IsUUID()
  @IsNotEmpty({ message: 'معرف المجموعة مطلوب' })
  groupId: string;

  @ApiProperty({ description: 'Session Date (YYYY-MM-DD)', example: '2026-08-20' })
  @IsDateString({}, { message: 'تاريخ الحصة غير صالح' })
  @IsNotEmpty({ message: 'تاريخ الحصة مطلوب' })
  sessionDate: string;

  @ApiPropertyOptional({ description: 'Start time in format HH:MM', example: '16:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in format HH:MM', example: '18:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ description: 'Lesson Topic or Name', example: 'الحصة 1: المحاضرة التأسيسية واسم الفاعل' })
  @IsString()
  @IsNotEmpty({ message: 'عنوان وموضوع الحصة مطلوب' })
  topic: string;

  @ApiPropertyOptional({ description: 'Associated recurring schedule ID' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;
}
