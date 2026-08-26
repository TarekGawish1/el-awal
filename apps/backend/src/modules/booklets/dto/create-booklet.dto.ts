import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBookletDto {
  @ApiProperty({
    description: 'عنوان أو اسم المذكرة / الملزمة الدراسية',
    example: 'مذكرة الشرح والتدريبات - الباب الأول',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'عنوان المذكرة مطلوب' })
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'سعر المذكرة بالجنيه المصري',
    example: 85.0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'سعر المذكرة يجب أن يكون رقماً صحيحاً أو عشرياً' })
  @Min(0, { message: 'سعر المذكرة لا يمكن أن يكون سالباً' })
  price: number;

  @ApiProperty({
    description: 'المرحلة والصف الدراسي المستهدف',
    example: 'الصف الأول الثانوي',
  })
  @IsString()
  @IsNotEmpty({ message: 'الصف الدراسي مطلوب' })
  gradeLevel: string;

  @ApiPropertyOptional({
    description: 'معرف المجموعة الدراسية المخصصة (اختياري - يترك فارغاً لجميع المجموعات)',
    example: 'd9b2d63d-a233-4123-8478-827361829182',
  })
  @IsOptional()
  @IsUUID('4', { message: 'معرف المجموعة يجب أن يكون بصيغة UUID صالحة' })
  groupId?: string;

  @ApiPropertyOptional({
    description: 'عدد النسخ المطبوعة أو المتاحة في المخزن (اختياري)',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'عدد النسخ لا يمكن أن يكون سالباً' })
  stockCount?: number;

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
}
