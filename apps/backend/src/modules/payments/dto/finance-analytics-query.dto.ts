import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

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
}
