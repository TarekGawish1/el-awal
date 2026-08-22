import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested, IsString, IsNumber } from 'class-validator';
import { SyncAttendanceItemDto } from './sync-attendance.dto';
import { SyncPaymentItemDto } from './sync-payments.dto';
import { SyncProgressItemDto } from './batch-progress-sync.dto';
import { SyncAssessmentItemDto } from './sync-assessments.dto';

export class SyncBatchGroupItemDto {
  @ApiPropertyOptional({ example: '018d39f4-6a8b-7000-8000-000000000001' })
  @IsString()
  clientTempId: string;

  @ApiPropertyOptional({ example: 'مجموعة الفيزياء 1' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'الصف الأول الثانوي' })
  @IsString()
  gradeLevel: string;

  @ApiPropertyOptional({ example: '2026-2027' })
  @IsString()
  @IsOptional()
  academicYear?: string;

  @ApiPropertyOptional({ example: 'FIRST_TERM' })
  @IsString()
  @IsOptional()
  academicTerm?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  maxCapacity?: number;

  @ApiPropertyOptional({ example: 350 })
  @IsNumber()
  @IsOptional()
  monthlyFee?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  schedules?: any[];
}

export class SyncBatchStudentItemDto {
  @ApiPropertyOptional({ example: '018d39f4-6a8b-7000-8000-000000000002' })
  @IsString()
  clientTempId: string;

  @ApiPropertyOptional({ example: 'أحمد محمود علي' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'أحمد محمود علي' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '+201012345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'ahmed@elawal.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Password123!' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'الصف الأول الثانوي' })
  @IsString()
  gradeLevel: string;

  @ApiPropertyOptional({ example: 'المرحلة الثانوية' })
  @IsString()
  @IsOptional()
  academicStage?: string;

  @ApiPropertyOptional({ example: '2026-2027' })
  @IsString()
  @IsOptional()
  academicYear?: string;

  @ApiPropertyOptional({ example: 'FIRST_TERM' })
  @IsString()
  @IsOptional()
  academicTerm?: string;

  @ApiPropertyOptional({ example: 'محمود علي' })
  @IsString()
  @IsOptional()
  parentName?: string;

  @ApiPropertyOptional({ example: '+201212345678' })
  @IsString()
  @IsOptional()
  parentPhone?: string;

  @ApiPropertyOptional({ example: 'الأب' })
  @IsString()
  @IsOptional()
  parentRelationship?: string;

  @ApiPropertyOptional({ example: '018d39f4-6a8b-7000-8000-000000000001' })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ example: '018d39f4-6a8b-7000-8000-000000000001' })
  @IsString()
  @IsOptional()
  initialGroupId?: string;
}

export class UnifiedSyncBatchDto {
  @ApiPropertyOptional({ type: [SyncBatchGroupItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncBatchGroupItemDto)
  groups?: SyncBatchGroupItemDto[];

  @ApiPropertyOptional({ type: [SyncBatchStudentItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncBatchStudentItemDto)
  students?: SyncBatchStudentItemDto[];

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
