import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { TestimonialStatus } from '@prisma/client';

export class CreateManualTestimonialDto {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'أحمد' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ maxLength: 50, example: 'الصف الثالث الثانوي' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gradeLevel?: string;

  @ApiProperty({ minLength: 10, maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  content: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ enum: TestimonialStatus, default: TestimonialStatus.APPROVED })
  @IsOptional()
  @IsEnum(TestimonialStatus)
  status?: TestimonialStatus;
}
