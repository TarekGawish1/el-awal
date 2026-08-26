import { IsNotEmpty, IsString, MinLength, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModuleDto {
  @ApiProperty({
    description: 'Module/Chapter title',
    example: 'الوحدة الأولى: قواعد النحو والإعراب الأساسية',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty({ message: 'Module title is required' })
  @MinLength(3, { message: 'Module title must be at least 3 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Brief chapter overview',
    example: 'تتضمن شروحات مفصلة وتطبيقات عملية على كان وأخواتها وكاد وأخواتها.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Module sorting sequence index within the course',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Linked unit / chapter comprehensive quiz ID',
    example: 'd933cc98-532e-4940-a1b6-ba121ff5a697',
  })
  @IsOptional()
  @IsString()
  unitQuizId?: string;
}
