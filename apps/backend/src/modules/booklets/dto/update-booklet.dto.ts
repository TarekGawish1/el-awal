import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsUUID,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateBookletDto {
  @ApiPropertyOptional({
    description: 'عنوان أو اسم المذكرة / الملزمة الدراسية',
    example: 'مذكرة الشرح والتدريبات - الباب الأول (محدثة)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'سعر المذكرة بالجنيه المصري',
    example: 90.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'سعر المذكرة يجب أن يكون رقماً صحيحاً أو عشرياً' })
  @Min(0, { message: 'سعر المذكرة لا يمكن أن يكون سالباً' })
  price?: number;

  @ApiPropertyOptional({
    description: 'المرحلة والصف الدراسي المستهدف',
    example: 'الصف الأول الثانوي',
  })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({
    description: 'معرف المجموعة الدراسية المخصصة (أو null لجميع المجموعات)',
    example: 'd9b2d63d-a233-4123-8478-827361829182',
  })
  @IsOptional()
  groupId?: string | null;

  @ApiPropertyOptional({
    description: 'عدد النسخ المطبوعة أو المتاحة في المخزن',
    example: 80,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'عدد النسخ لا يمكن أن يكون سالباً' })
  stockCount?: number | null;

  @ApiPropertyOptional({
    description: 'حالة تفعيل المذكرة وإتاحتها للبيع',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
