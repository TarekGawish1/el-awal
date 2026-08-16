import { IsNotEmpty, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSessionsDto {
  @ApiProperty({ description: 'Start date of generation window (ISO format)', example: '2026-09-01' })
  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: string;

  @ApiProperty({ description: 'End date of generation window (ISO format)', example: '2026-09-30' })
  @IsDateString()
  @IsNotEmpty({ message: 'End date is required' })
  endDate: string;

  @ApiPropertyOptional({ description: 'Default topic prefix for generated sessions', example: 'حصة دراسية' })
  @IsOptional()
  @IsString()
  topicPrefix?: string;
}
