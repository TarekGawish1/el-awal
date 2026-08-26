import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question content or explanation request',
    example: 'هل يجوز تقديم خبر كان على اسمها في هذه الحالة؟',
  })
  @IsString()
  @IsNotEmpty({ message: 'نص السؤال مطلوب' })
  content: string;

  @ApiPropertyOptional({
    description: 'Video timestamp in seconds at which question was asked',
    example: 145,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  videoTimestamp?: number;
}

export class CreateQuestionReplyDto {
  @ApiProperty({
    description: 'Teacher / assistant / student reply content',
    example: 'نعم يجوز تقديم الخبر إذا كان شبه جملة واسمها نكرة.',
  })
  @IsString()
  @IsNotEmpty({ message: 'نص الرد مطلوب' })
  content: string;
}
