import { IsOptional, IsUUID, IsEnum, IsBoolean, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentType } from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

export class AssessmentQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by physical group ID' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Filter by online course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ enum: AssessmentType, description: 'Filter by type (ASSIGNMENT | EXAM)' })
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional({ description: 'Filter by publication status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Filter by academic year (e.g. 2026-2027)' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ description: 'Filter by academic term (FIRST_TERM | SECOND_TERM)' })
  @IsOptional()
  @IsString()
  academicTerm?: string;
}
