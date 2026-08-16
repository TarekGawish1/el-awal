import { IsNotEmpty, IsInt, Min, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty({
    description: 'Current playback or reading position in seconds',
    example: 345,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  lastPositionSeconds: number;

  @ApiPropertyOptional({
    description: 'Whether the lesson requirements have been completed (e.g. watched > 90% or passed quiz)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
