import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ description: 'Academic Group ID', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  @IsUUID()
  @IsNotEmpty({ message: 'Group ID is required' })
  groupId: string;

  @ApiProperty({
    description: 'Day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)',
    example: 0,
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: 'Start time in 24-hour format HH:MM', example: '17:00' })
  @IsString()
  @IsNotEmpty({ message: 'Start time is required' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Start time must be in format HH:MM' })
  startTime: string;

  @ApiProperty({ description: 'End time in 24-hour format HH:MM', example: '19:00' })
  @IsString()
  @IsNotEmpty({ message: 'End time is required' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'End time must be in format HH:MM' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Room or classroom location', example: 'قاعة 1 - المقر الرئيسي' })
  @IsOptional()
  @IsString()
  location?: string;
}
