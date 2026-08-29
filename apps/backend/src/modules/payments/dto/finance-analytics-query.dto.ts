import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FinanceAnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2026-2027:FIRST_TERM' })
  @IsOptional() @IsString()
  academicPeriodId?: string;

  @ApiPropertyOptional({ example: '2026-2027' })
  @IsOptional() @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ example: 'FIRST_TERM' })
  @IsOptional() @IsIn(['FIRST_TERM', 'SECOND_TERM'])
  academicTerm?: string;

  @ApiPropertyOptional({ example: 'SECONDARY', enum: ['PRIMARY', 'PREPARATORY', 'SECONDARY', 'ALL'] })
  @IsOptional() @IsIn(['PRIMARY', 'PREPARATORY', 'SECONDARY', 'ALL'])
  stage?: string;

  @ApiPropertyOptional({ example: 'الصف الأول الثانوي' })
  @IsOptional() @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ example: 'group-id' })
  @IsOptional() @IsString()
  groupId?: string;

  @ApiPropertyOptional({ example: 9, description: 'Scope the analytics to a single month of the term instead of the whole term' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12)
  periodMonth?: number;
}
