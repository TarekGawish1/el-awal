import { IsArray, ValidateNested, IsUUID, IsInt, Min, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SyncOperationItemDto {
  @ApiProperty({ description: 'Client-generated UUIDv4 for idempotency deduplication' })
  @IsUUID()
  @IsNotEmpty()
  clientOperationId: string;

  @ApiProperty({ description: 'Course ID' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ description: 'Lesson ID' })
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @ApiProperty({ description: 'Last playback position in seconds', minimum: 0 })
  @IsInt()
  @Min(0)
  positionSeconds: number;

  @ApiProperty({ description: 'Whether lesson has reached completed milestone' })
  @IsBoolean()
  isCompleted: boolean;
}

export class BatchProgressSyncDto {
  @ApiProperty({ type: [SyncOperationItemDto], description: 'Array of staged offline progress operations' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationItemDto)
  operations: SyncOperationItemDto[];
}
