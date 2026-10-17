import {
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { BatchProgressSyncDto } from '../dto/batch-progress-sync.dto';
import { SyncAttendanceBatchDto } from '../dto/sync-attendance.dto';
import { SyncPaymentsBatchDto } from '../dto/sync-payments.dto';
import { SyncAssessmentsBatchDto } from '../dto/sync-assessments.dto';
import { SyncHomeworkBatchDto } from '../dto/sync-homework.dto';
import { UnifiedSyncBatchDto, SyncMutationItemDto } from '../dto/sync-batch.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

import { SyncTeacherSnapshotService } from './sync-teacher-snapshot.service';
import { SyncStudentSnapshotService } from './sync-student-snapshot.service';
import { SyncSnapshotService } from './sync-snapshot.service';
import { SyncAttendanceService } from './sync-attendance.service';
import { SyncPaymentsService } from './sync-payments.service';
import { SyncAssessmentsService } from './sync-assessments.service';
import { SyncHomeworkService } from './sync-homework.service';
import { SyncMutationsService } from './sync-mutations.service';
import { SyncStudentsService } from './sync-students.service';

export interface DomainSyncResult {
  syncedCount: number;
  duplicatesIgnored: number;
  failedCount: number;
  processedOperationIds: string[];
  conflicts: Array<{
    operationId: string;
    reason: string;
    entityId?: string;
    code?: string;
    details?: Record<string, string>;
  }>;
  idMappings?: Record<string, string>;
  processedPayments?: any[];
}

export interface BootstrapSnapshotResponse {
  snapshotVersion: string;
  timestamp: number;
  isDelta: boolean;
  role: string;
  data: {
    academicPeriod?: any;
    groups?: any[];
    students?: any[];
    schedules?: any[];
    sessions?: any[];
    payments?: any[];
    assessments?: any[];
    courses?: any[];
    booklets?: any[];
    attendance?: any[];
    attendanceHistory?: any[];
    children?: any[];
    homework?: any[];
  };
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  private readonly teacherSnapshotService: SyncTeacherSnapshotService;
  private readonly studentSnapshotService: SyncStudentSnapshotService;
  private readonly snapshotService: SyncSnapshotService;
  private readonly attendanceService: SyncAttendanceService;
  private readonly paymentsService: SyncPaymentsService;
  private readonly assessmentsService: SyncAssessmentsService;
  private readonly homeworkService: SyncHomeworkService;
  private readonly mutationsService: SyncMutationsService;
  private readonly studentsService: SyncStudentsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
    @Optional() teacherSnapshotService?: SyncTeacherSnapshotService,
    @Optional() studentSnapshotService?: SyncStudentSnapshotService,
    @Optional() snapshotService?: SyncSnapshotService,
    @Optional() attendanceService?: SyncAttendanceService,
    @Optional() paymentsService?: SyncPaymentsService,
    @Optional() assessmentsService?: SyncAssessmentsService,
    @Optional() homeworkService?: SyncHomeworkService,
    @Optional() mutationsService?: SyncMutationsService,
    @Optional() studentsService?: SyncStudentsService,
  ) {
    const teacherSnap = teacherSnapshotService ?? new SyncTeacherSnapshotService(this.prisma);
    const studentSnap = studentSnapshotService ?? new SyncStudentSnapshotService(this.prisma);
    this.teacherSnapshotService = teacherSnap;
    this.studentSnapshotService = studentSnap;
    this.snapshotService = snapshotService ?? new SyncSnapshotService(this.prisma, teacherSnap, studentSnap);
    this.attendanceService = attendanceService ?? new SyncAttendanceService(this.prisma, this.realtimeGateway);
    this.paymentsService = paymentsService ?? new SyncPaymentsService(this.prisma);
    this.assessmentsService = assessmentsService ?? new SyncAssessmentsService(this.prisma);
    this.homeworkService = homeworkService ?? new SyncHomeworkService(this.prisma, this.realtimeGateway);
    this.mutationsService = mutationsService ?? new SyncMutationsService(this.prisma, this.realtimeGateway);
    this.studentsService = studentsService ?? new SyncStudentsService(
      this.prisma,
      this.coursesService,
      this.attendanceService,
      this.paymentsService,
      this.assessmentsService,
      this.homeworkService,
      this.mutationsService,
    );
  }

  async getBootstrapSnapshot(
    user: AuthenticatedUser,
    since?: number,
  ): Promise<BootstrapSnapshotResponse> {
    return this.snapshotService.getBootstrapSnapshot(user, since);
  }

  async getSyncDiff(user: AuthenticatedUser, since?: string) {
    return this.snapshotService.getSyncDiff(user, since);
  }

  async processBatchProgress(studentId: string, dto: BatchProgressSyncDto) {
    return this.coursesService.applyMonotonicProgressBatch(
      studentId,
      dto.operations,
    );
  }

  async syncAttendanceBatch(
    user: AuthenticatedUser,
    dto: SyncAttendanceBatchDto,
  ): Promise<DomainSyncResult> {
    return this.attendanceService.syncAttendanceBatch(user, dto);
  }

  async syncPaymentsBatch(
    user: AuthenticatedUser,
    dto: SyncPaymentsBatchDto,
  ): Promise<DomainSyncResult> {
    return this.paymentsService.syncPaymentsBatch(user, dto);
  }

  async syncAssessmentsBatch(
    studentId: string,
    dto: SyncAssessmentsBatchDto,
  ): Promise<DomainSyncResult> {
    return this.assessmentsService.syncAssessmentsBatch(studentId, dto);
  }

  async syncUnifiedBatch(
    user: AuthenticatedUser,
    dto: UnifiedSyncBatchDto,
  ) {
    return this.studentsService.syncUnifiedBatch(user, dto);
  }

  async processMutationBatch(
    user: AuthenticatedUser,
    mutations: SyncMutationItemDto[] | any[],
  ): Promise<Array<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }>> {
    return this.mutationsService.processMutationBatch(user, mutations);
  }

  async syncHomeworkBatch(
    user: AuthenticatedUser,
    dto: SyncHomeworkBatchDto,
  ): Promise<DomainSyncResult> {
    return this.homeworkService.syncHomeworkBatch(user, dto);
  }
}
