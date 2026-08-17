import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupScheduleDto {
  @ApiProperty({ example: 0, description: '0 for Sunday, 1 for Monday, etc.' })
  @IsInt()
  @Min(0)
  dayOfWeek: number;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '16:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;
}

export class CreateGroupDto {
  @ApiProperty({ example: 'مجموعة الأحد والأربعاء - الصف الثالث الثانوي', minLength: 3 })
  @IsString()
  @IsNotEmpty({ message: 'Group name is required' })
  @MinLength(3, { message: 'Group name must be at least 3 characters' })
  name: string;

  @ApiProperty({ example: 'الصف الثالث الثانوي' })
  @IsString()
  @IsNotEmpty({ message: 'Grade level is required' })
  gradeLevel: string;

  @ApiPropertyOptional({ example: 'مجموعة مراجعات مكثفة وتدريبات بلاغة ونحو' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 45, default: 50, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;

  @ApiPropertyOptional({ example: 400.0, default: 0.0 })
  @IsOptional()
  @IsNumber()
  monthlyFee?: number;

  @ApiPropertyOptional({ type: [GroupScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupScheduleDto)
  schedules?: GroupScheduleDto[];
}
