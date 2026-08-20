import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BootstrapQueryDto {
  @ApiPropertyOptional({
    description: 'Optional epoch millisecond timestamp for delta synchronization. If omitted, a full tenant snapshot is returned.',
    example: 1755710000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  since?: number;
}
