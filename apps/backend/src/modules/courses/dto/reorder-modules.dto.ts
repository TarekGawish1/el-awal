import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
