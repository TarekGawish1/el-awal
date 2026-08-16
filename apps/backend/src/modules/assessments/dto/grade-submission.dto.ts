import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManualQuestionGradeDto {
  @ApiProperty({
    description: 'Target question ID',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Score awarded to the essay question',
    example: 4.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  pointsEarned: number;

  @ApiPropertyOptional({
    description: 'Teacher feedback on this specific question',
    example: 'إجابة ممتازة وواضحة، ينقصها فقط الاستشهاد ببيت الشعر.',
  })
  @IsOptional()
  @IsString()
  teacherFeedback?: string;
}

export class GradeSubmissionDto {
  @ApiPropertyOptional({
    description: 'Overall teacher feedback note on the submission',
    example: 'مستوى ممتاز، واصل التقدم والمراجعة الدورية.',
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({
    type: [ManualQuestionGradeDto],
    description: 'Array of manual grades for essay/subjective questions',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualQuestionGradeDto)
  manualGrades: ManualQuestionGradeDto[];
}
