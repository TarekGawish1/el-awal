import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested, IsString, IsNumber } from 'class-validator';
import { SyncAttendanceItemDto } from './sync-attendance.dto';
import { SyncPaymentItemDto } from './sync-payments.dto';
import { SyncProgressItemDto } from './batch-progress-sync.dto';
import { SyncAssessmentItemDto } from './sync-assessments.dto';
import { SyncHomeworkItemDto } from './sync-homework.dto';

export class SyncBatchGroupItemDto {
  @ApiPropertyOptional({
    enum: ['CREATE_GROUP', 'UPDATE_GROUP'],
    default: 'CREATE_GROUP',
    description: 'Operation kind. Existing groups are updated only when UPDATE_GROUP is supplied.',
  })
  @IsString()
  @IsOptional()
  type?: 'CREATE_GROUP' | 'UPDATE_GROUP';

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientTimestamp?: string;
}

export class SyncBatchStudentItemDto {
  @ApiPropertyOptional({
    enum: ['CREATE_STUDENT', 'UPDATE_STUDENT'],
    default: 'CREATE_STUDENT',
    description: 'Operation kind. Existing students are updated only when UPDATE_STUDENT is supplied.',
  })
  @IsString()
  @IsOptional()
  type?: 'CREATE_STUDENT' | 'UPDATE_STUDENT';

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientTimestamp?: string;
}

export class SyncMutationItemDto {
  @ApiPropertyOptional({ example: '018d39f4-6a8b-7000-8000-000000000099' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: 'RECORD_HOMEWORK_ONSITE' })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  payload: Record<string, any>;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  clientTimestamp?: number;
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

  @ApiPropertyOptional({ type: [SyncHomeworkItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncHomeworkItemDto)
  homework?: SyncHomeworkItemDto[];

  @ApiPropertyOptional({ type: [SyncMutationItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SyncMutationItemDto)
  mutations?: SyncMutationItemDto[];
}

