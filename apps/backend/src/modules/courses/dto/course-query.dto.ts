import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

export class CourseQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by grade level', example: 'الصف الثالث الثانوي' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Filter by academic stage', example: 'المرحلة الثانوية' })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({ description: 'Filter by subject', example: 'اللغة العربية' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Text search matching course title or description' })
  @IsOptional()
  @IsString()
  search?: string;
}
