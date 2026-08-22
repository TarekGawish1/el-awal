import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class BookletQueryDto {
  @ApiPropertyOptional({
    description: 'تصفية حسب المرحلة والصف الدراسي',
    example: 'الصف الأول الثانوي',
  })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'تصفية حسب المجموعة الدراسية',
    example: 'd9b2d63d-a233-4123-8478-827361829182',
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({
    description: 'العام الدراسي',
    example: '2026-2027',
  })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({
    description: 'الفصل الدراسي',
    example: 'FIRST_TERM',
  })
  @IsOptional()
  @IsString()
  academicTerm?: string;

  @ApiPropertyOptional({
    description: 'تصفية المذكرات النشطة فقط',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
