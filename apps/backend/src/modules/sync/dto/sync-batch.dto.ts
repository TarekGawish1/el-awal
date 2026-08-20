import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { SyncAttendanceItemDto } from './sync-attendance.dto';
import { SyncPaymentItemDto } from './sync-payments.dto';
import { SyncProgressItemDto } from './batch-progress-sync.dto';
import { SyncAssessmentItemDto } from './sync-assessments.dto';

export class UnifiedSyncBatchDto {
  @ApiPropertyOptional({ type: [SyncAttendanceItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncAttendanceItemDto)
  attendance?: SyncAttendanceItemDto[];

  @ApiPropertyOptional({ type: [SyncPaymentItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncPaymentItemDto)
  payments?: SyncPaymentItemDto[];

  @ApiPropertyOptional({ type: [SyncProgressItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncProgressItemDto)
  progress?: SyncProgressItemDto[];

  @ApiPropertyOptional({ type: [SyncAssessmentItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncAssessmentItemDto)
  assessments?: SyncAssessmentItemDto[];
}
