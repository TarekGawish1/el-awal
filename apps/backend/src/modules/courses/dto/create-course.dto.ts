import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'دورة المراجعة النهائية في اللغة العربية - الثانوية العامة',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty({ message: 'Course title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed course syllabus and overview',
    example: 'دورة تدريبية مكثفة تغطي جميع وحدات النحو، البلاغة، الأدب، والنصوص المتحررة مع اختبارات تفاعلية.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Academic subject name',
    example: 'اللغة العربية',
    default: 'اللغة العربية',
  })
  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  subject: string;

  @ApiProperty({
    description: 'Target grade level',
    example: 'الصف الثالث الثانوي',
  })
  @IsString()
  @IsNotEmpty({ message: 'Grade level is required' })
  gradeLevel: string;

  @ApiPropertyOptional({
    description: 'Academic stage (e.g. المرحلة الثانوية)',
    example: 'المرحلة الثانوية',
  })
  @IsOptional()
  @IsString()
  academicStage?: string;

  @ApiPropertyOptional({
    description: 'Enrollment purchase price in EGP',
    example: 350.0,
    default: 0.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Cover image asset URL',
    example: 'https://cdn.elawal.com/courses/arabic-final-review.jpg',
  })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}
