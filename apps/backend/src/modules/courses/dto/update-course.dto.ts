import {
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus } from '@prisma/client';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'دورة المراجعة النهائية المحدثة' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ example: 'محتوى الدورة المحدث' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'اللغة العربية' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 'الصف الثالث الثانوي' })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ example: 'المرحلة الثانوية' })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({ example: 400.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'https://cdn.elawal.com/courses/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ enum: CourseStatus, example: CourseStatus.PUBLISHED })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
