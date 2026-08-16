import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceItemDto {
  @ApiProperty({ description: 'Student ID (UUID)', example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Optional attendance note or excuse reason', example: 'حاضر في الموعد' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchAttendanceDto {
  @ApiProperty({ type: [AttendanceItemDto], description: 'List of student attendance status records' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  records: AttendanceItemDto[];
}
