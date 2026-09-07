import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty({ example: 'أحمد محمود', description: 'اسم الطالب' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  studentName: string;

  @ApiProperty({ example: 'MALE', description: 'الجنس', required: false, default: 'MALE' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: 'اللغة العربية', description: 'المادة الدراسية' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject: string;

  @ApiProperty({ example: '98%', description: 'الدرجة أو التقدير' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  score: string;

  @ApiProperty({ example: '2026-09-01', description: 'تاريخ الإصدار' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  issueDate: string;

  @ApiProperty({ example: '2026', description: 'العام الدراسي', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  year?: string;

  @ApiProperty({ example: 'SECONDARY', description: 'المرحلة الدراسية', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  stage?: string;

  @ApiProperty({ example: 'الصف الثالث الثانوي', description: 'الصف الدراسي', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  grade?: string;

  @ApiProperty({ example: 'أ. طارق جاويش', description: 'اسم المعلم', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  teacherName?: string;

  @ApiProperty({ example: 'https://...', description: 'رابط ملف الشهادة المرفوع مسبقاً', required: false })
  @IsString()
  @IsOptional()
  fileUrl?: string;
}
