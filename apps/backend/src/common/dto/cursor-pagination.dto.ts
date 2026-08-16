import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Opaque base64 cursor string for Keyset pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return (1-100, default: 20)',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Traversal direction',
    enum: ['forward', 'backward'],
    default: 'forward',
  })
  @IsOptional()
  @IsIn(['forward', 'backward'])
  direction?: 'forward' | 'backward' = 'forward';
}
