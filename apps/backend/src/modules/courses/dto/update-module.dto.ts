import { IsString, MinLength, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateModuleDto {
  @ApiPropertyOptional({
    description: 'Module/Chapter title',
    example: 'الوحدة الأولى: قواعد النحو والإعراب المحدثة',
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    description: 'Brief chapter overview',
    example: 'تتضمن شروحات مفصلة وتطبيقات عملية على كان وأخواتها.',
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
  unitQuizId?: string | null;
}
