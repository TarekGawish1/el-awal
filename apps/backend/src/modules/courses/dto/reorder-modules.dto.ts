import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModuleOrderItem {
  @ApiProperty({ example: 'd933cc98-532e-4940-a1b6-ba121ff5a697' })
  @IsString()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderIndex: number;
}

export class ReorderModulesDto {
  @ApiProperty({ type: [ModuleOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleOrderItem)
  moduleOrders: ModuleOrderItem[];
}

export class LessonOrderItem {
  @ApiProperty({ example: 'd933cc98-532e-4940-a1b6-ba121ff5a697' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderIndex: number;

  @ApiPropertyOptional({
    description: 'Target module ID when moving a lesson to a different unit',
    example: 'f1e2d3c4-b5a6-9786-4532-1098fedcba09',
  })
  @IsOptional()
  @IsUUID()
  moduleId?: string;
}

export class ReorderLessonsDto {
  @ApiProperty({ type: [LessonOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderItem)
  lessonOrders: LessonOrderItem[];
}
