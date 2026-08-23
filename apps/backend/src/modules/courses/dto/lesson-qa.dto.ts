import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question content or explanation request',
    example: 'هل يجوز تقديم خبر كان على اسمها في هذه الحالة؟',
  })
  @IsString()
  @IsNotEmpty({ message: 'Question content is required' })
  content: string;

  @ApiPropertyOptional({
    description: 'Video timestamp in seconds at which question was asked',
    example: 145,
  })
  @IsOptional()
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
  @IsNotEmpty({ message: 'Reply content is required' })
  content: string;
}
