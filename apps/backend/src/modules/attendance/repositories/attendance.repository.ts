import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceRecord, AttendanceStatus } from '@prisma/client';
import { CursorPaginationHelper, CursorPaginationParams, PaginatedResult } from '../../../common/pagination/cursor-pagination.helper';

export interface QrScanResult {
  record: AttendanceRecord;
  isDuplicate: boolean;
}

@Injectable()
export class AttendanceRepository {
  private readonly logger = new Logger(AttendanceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records student attendance via QR scan atomically.
   * Concurrency Guard: Uses PostgreSQL ON CONFLICT DO NOTHING to prevent race conditions during rapid door bursts.
   * Idempotency Invariant: Repeated scans return the existing record with `isDuplicate = true`.
   */
  async recordQrScan(
    sessionId: string,
    studentId: string,
    recordedById: string,
    notes?: string,
  ): Promise<QrScanResult> {
    const insertedRows = await this.prisma.$queryRaw<AttendanceRecord[]>`
      INSERT INTO "attendance_records" (
        "id",
        "session_id",
        "student_id",
        "status",
        "recording_method",
        "recorded_by_id",
        "notes",
        "recorded_at"
      ) VALUES (
        gen_random_uuid(),
        ${sessionId}::uuid,
        ${studentId}::uuid,
        'PRESENT'::"attendance_status",
        'QR_SCAN'::"recording_method",
        ${recordedById}::uuid,
        ${notes || null},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("session_id", "student_id") DO NOTHING
      RETURNING *;
    `;

    if (insertedRows && insertedRows.length > 0) {
      return {
        record: insertedRows[0],
        isDuplicate: false,
      };
    }

    const existingRecord = await this.prisma.attendanceRecord.findUniqueOrThrow({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
    });

    // Conflict Resolution: If a manual override exists, the QR scan must NOT silently claim success.
    if (existingRecord.status !== 'PRESENT' && existingRecord.recordingMethod === 'MANUAL') {
      throw new Error(`CONFLICT_MANUAL_OVERRIDE: Student was manually marked ${existingRecord.status}`);
    }

    this.logger.debug(
      `Idempotent QR Scan: student ${studentId} was already marked ${existingRecord.status} for session ${sessionId}`,
    );

    return {
      record: existingRecord,
      isDuplicate: true,
    };
  }

  /**
   * Retrieves paginated student attendance history using Keyset Cursor Pagination.
   */
  async getStudentAttendanceHistory(
    studentId: string,
    params: CursorPaginationParams,
    statusFilter?: AttendanceStatus,
  ): Promise<PaginatedResult<AttendanceRecord>> {
    const limit = CursorPaginationHelper.sanitizeLimit(params.limit);
    const decodedCursor = params.cursor ? CursorPaginationHelper.decodeCursor(params.cursor) : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(cursorFilter || {}),
      },
      orderBy: [
        { recordedAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1,
      include: {
        session: {
          select: {
            sessionDate: true,
            topic: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return CursorPaginationHelper.formatResponse(
      records.map((r) => ({ ...r, createdAt: r.recordedAt })),
      limit,
    );
  }
}
