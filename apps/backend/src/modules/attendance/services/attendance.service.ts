import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { BatchAttendanceDto } from '../dto/batch-attendance.dto';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AttendanceStatus, RecordingMethod, GroupEnrollmentStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 7-Tier Verification Pipeline for QR Code Roll-call Check-in.
   */
  async processQrScan(sessionId: string, qrCodeToken: string, recordedById: string) {
    // 1. Session Verification
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: {
        group: {
          include: {
            _count: {
              select: { enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } } },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    // 2. Token Resolution
    const student = await this.prisma.studentProfile.findUnique({
      where: { qrCodeToken },
      include: { user: { select: { fullName: true, isActive: true } } },
    });

    if (!student || !student.user.isActive) {
      throw new BadRequestException('Invalid QR credential or inactive student account');
    }

    // 3. Cohort Enrollment Check
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: {
        groupId_studentId: {
          groupId: session.groupId,
          studentId: student.id,
        },
      },
    });

    if (!enrollment || enrollment.status !== GroupEnrollmentStatus.ACTIVE) {
      throw new BadRequestException(
        `Student [${student.user.fullName}] is not actively enrolled in group [${session.group.name}]`,
      );
    }

    // 4. Atomic Record Creation (Handles race condition & idempotency)
    const result = await this.attendanceRepository.recordQrScan(
      session.id,
      student.id,
      recordedById,
    );

    // 5. Emit domain event if this was the first successful scan
    if (!result.isDuplicate) {
      this.eventEmitter.emit('attendance.recorded', {
        sessionId: session.id,
        studentId: student.id,
        status: AttendanceStatus.PRESENT,
      });
    }

    // 6. Compute real-time session statistics
    const totalPresent = await this.prisma.attendanceRecord.count({
      where: { sessionId, status: AttendanceStatus.PRESENT },
    });

    return {
      isDuplicate: result.isDuplicate,
      student: {
        id: student.id,
        fullName: student.user.fullName,
        studentCode: student.studentCode,
      },
      attendance: result.record,
      sessionStats: {
        totalPresent,
        totalEnrolled: session.group._count.enrollments,
      },
    };
  }

  /**
   * Manual Roll-Call batch update within an atomic Prisma transaction.
   */
  async recordManualBatch(sessionId: string, dto: BatchAttendanceDto, recordedById: string) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    const updatedRecords = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.records) {
        const record = await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId,
              studentId: item.studentId,
            },
          },
          create: {
            sessionId,
            studentId: item.studentId,
            status: item.status,
            recordingMethod: RecordingMethod.MANUAL,
            recordedById,
            notes: item.notes,
            recordedAt: new Date(),
          },
          update: {
            status: item.status,
            recordingMethod: RecordingMethod.MANUAL,
            recordedById,
            notes: item.notes,
          },
        });

        updatedRecords.push(record);

        // If marked absent, emit event for guardian notification
        if (item.status === AttendanceStatus.ABSENT) {
          this.eventEmitter.emit('student.absence.recorded', {
            studentId: item.studentId,
            groupName: session.group.name,
            date: session.sessionDate,
          });
        }
      }
    });

    const [presentCount, absentCount, excusedCount, totalEnrolled] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.PRESENT } }),
      this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.ABSENT } }),
      this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.EXCUSED } }),
      this.prisma.groupEnrollment.count({
        where: { groupId: session.groupId, status: GroupEnrollmentStatus.ACTIVE },
      }),
    ]);

    return {
      sessionId,
      updatedCount: updatedRecords.length,
      sessionStats: {
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalExcused: excusedCount,
        totalEnrolled,
      },
    };
  }

  /**
   * Comprehensive session attendance KPI report.
   */
  async getSessionReport(sessionId: string) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: {
        group: {
          include: {
            enrollments: {
              where: { status: GroupEnrollmentStatus.ACTIVE },
              include: {
                student: {
                  include: {
                    user: { select: { id: true, fullName: true, phone: true } },
                  },
                },
              },
            },
          },
        },
        attendanceRecords: {
          include: {
            student: {
              include: {
                user: { select: { id: true, fullName: true, phone: true } },
              },
            },
            recordedBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    const totalEnrolled = session.group.enrollments.length;
    const presentCount = session.attendanceRecords.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = session.attendanceRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const excusedCount = session.attendanceRecords.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
    const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

    return {
      sessionId: session.id,
      sessionDate: session.sessionDate,
      topic: session.topic,
      groupId: session.groupId,
      groupName: session.group.name,
      metrics: {
        totalEnrolled,
        presentCount,
        absentCount,
        excusedCount,
        attendanceRatePercentage: attendanceRate,
      },
      records: session.attendanceRecords.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentCode: r.student.studentCode,
        fullName: r.student.user.fullName,
        phone: r.student.user.phone,
        status: r.status,
        recordingMethod: r.recordingMethod,
        recordedAt: r.recordedAt,
        recordedBy: r.recordedBy.fullName,
        notes: r.notes,
      })),
    };
  }

  /**
   * Keyset paginated history for a single student.
   */
  async getStudentHistory(studentId: string, pagination: CursorPaginationDto, status?: AttendanceStatus) {
    return this.attendanceRepository.getStudentAttendanceHistory(
      studentId,
      {
        cursor: pagination.cursor,
        limit: pagination.limit,
        direction: pagination.direction,
      },
      status,
    );
  }
}
