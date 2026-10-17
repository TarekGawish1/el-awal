import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { BatchAttendanceDto } from '../dto/batch-attendance.dto';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AttendanceStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { AttendanceQrService } from './attendance-qr.service';
import { AttendanceBatchService } from './attendance-batch.service';
import { AttendanceQueriesService } from './attendance-queries.service';

@Injectable()
export class AttendanceService {
  private readonly qrService: AttendanceQrService;
  private readonly batchService: AttendanceBatchService;
  private readonly queriesService: AttendanceQueriesService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() qrService?: AttendanceQrService,
    @Optional() batchService?: AttendanceBatchService,
    @Optional() queriesService?: AttendanceQueriesService,
  ) {
    this.qrService =
      qrService ??
      new AttendanceQrService(
        this.prisma,
        this.attendanceRepository,
        this.eventEmitter,
        this.realtimeGateway,
        this.redisCache,
      );
    this.batchService =
      batchService ??
      new AttendanceBatchService(
        this.prisma,
        this.eventEmitter,
        this.realtimeGateway,
        this.redisCache,
      );
    this.queriesService =
      queriesService ??
      new AttendanceQueriesService(
        this.prisma,
        this.attendanceRepository,
        this.redisCache,
      );
  }

  /**
   * 7-Tier Verification Pipeline for QR Code Roll-call Check-in.
   */
  async processQrScan(
    sessionId: string,
    qrCodeToken: string,
    user: AuthenticatedUser,
    allowCrossGroup = false,
  ) {
    return this.qrService.processQrScan(sessionId, qrCodeToken, user, allowCrossGroup);
  }

  /**
   * Manual Roll-Call batch update within an atomic Prisma transaction.
   */
  async recordManualBatch(sessionId: string, dto: BatchAttendanceDto, user: AuthenticatedUser) {
    return this.batchService.recordManualBatch(sessionId, dto, user);
  }

  /**
   * Comprehensive session attendance KPI report.
   */
  async getSessionReport(sessionId: string, user: AuthenticatedUser) {
    return this.queriesService.getSessionReport(sessionId, user);
  }

  /**
   * Keyset paginated history for a single student with ownership and guardianship enforcement.
   */
  async getStudentHistory(
    studentId: string,
    pagination: CursorPaginationDto,
    status?: AttendanceStatus,
    user?: AuthenticatedUser,
  ) {
    return this.queriesService.getStudentHistory(studentId, pagination, status, user);
  }

  /**
   * Removes an attendance record for a student in a lesson session (resets to unrecorded).
   */
  async removeAttendanceRecord(sessionId: string, studentId: string, user: AuthenticatedUser) {
    return this.batchService.removeAttendanceRecord(sessionId, studentId, user);
  }

  /**
   * Removes a homework record for a student in a lesson session (resets to unassessed).
   */
  async removeHomeworkRecord(sessionId: string, studentId: string, user: AuthenticatedUser) {
    return this.batchService.removeHomeworkRecord(sessionId, studentId, user);
  }
}
