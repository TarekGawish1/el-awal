import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question number/sequence in the assessment',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  questionNumber: number;

  @ApiProperty({
    description: 'Question prompt text',
    example: 'ما هو إعراب كلمة "طالباً" في جملة: "كان محمدٌ طالباً مجتهداً"؟',
  })
  @IsString()
  @IsNotEmpty({ message: 'Question text is required' })
  questionText: string;

  @ApiProperty({
    enum: QuestionType,
    example: QuestionType.MULTIPLE_CHOICE,
  })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiPropertyOptional({
    description: 'Options array for multiple choice questions',
    example: ['اسم كان مرفوع', 'خبر كان منصوب', 'نعت مجرور', 'مفعول به'],
  })
  @IsOptional()
  @IsArray()
  optionsData?: string[];

  @ApiProperty({
    description: 'Correct answer string used for automated grading',
    example: 'خبر كان منصوب',
  })
  @IsString()
  @IsNotEmpty({ message: 'Correct answer is required' })
  correctAnswer: string;

  @ApiPropertyOptional({
    description: 'Explanation shown during post-submission review',
    example: 'كان فعل ماض ناقص ناسخ يرفع المبتدأ وينصب الخبر، فطالباً خبر كان منصوب وعلامة نصبه الفتحة.',
  })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Image URL for the question',
    example: 'https://cdn.el-awal.com/assessments/image.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Point value allocated to this question',
    example: 2.0,
    minimum: 0.5,
    default: 1.0,
  })
  @IsNumber()
  @Min(0.1)
  points: number;
}
