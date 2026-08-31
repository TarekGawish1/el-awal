import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardOverviewQueryDto {
  @ApiPropertyOptional({ example: '2026-2027' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ example: 'FIRST_TERM' })
  @IsOptional()
  @IsString()
  academicTerm?: string;

  @ApiPropertyOptional({ example: 'ALL' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ example: 'week' })
  @IsOptional()
  @IsString()
  dateRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'home' })
  @IsOptional()
  @IsString()
  layout?: string;
}
