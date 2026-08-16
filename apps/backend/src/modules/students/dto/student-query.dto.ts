import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentAcademicStatus } from '@prisma/client';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

export class StudentQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Text search matching student name, phone or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by grade level', example: 'الصف الثالث الثانوي' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'Filter by academic stage', example: 'المرحلة الثانوية' })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({ description: 'Filter by enrolled physical group ID' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ enum: StudentAcademicStatus, description: 'Filter by academic status' })
  @IsOptional()
  @IsEnum(StudentAcademicStatus)
  academicStatus?: StudentAcademicStatus;
}
