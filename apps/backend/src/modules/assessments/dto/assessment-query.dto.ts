import { IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
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
}
