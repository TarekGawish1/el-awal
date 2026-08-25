import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MatrixLedgerQueryDto {
  @ApiPropertyOptional({ example: 'الصف الأول الثانوي' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ example: '2026-2027:FIRST_TERM' })
  @IsOptional()
  @IsString()
  academicPeriodId?: string;

  @ApiPropertyOptional({ example: '2026-2027' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ example: 'FIRST_TERM' })
  @IsOptional()
  @IsIn(['FIRST_TERM', 'SECOND_TERM'])
  academicTerm?: string;

  @ApiPropertyOptional({ example: 'group-id' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ example: 'SECONDARY' })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ example: 'أحمد' })
  @IsOptional()
  @IsString()
  search?: string;
}
