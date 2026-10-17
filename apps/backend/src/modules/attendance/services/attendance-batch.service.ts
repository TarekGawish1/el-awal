import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import { BatchAttendanceDto } from '../dto/batch-attendance.dto';
import { AttendanceStatus, RecordingMethod, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class AttendanceBatchService {
  private readonly logger = new Logger(AttendanceBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Manual Roll-Call batch update within an atomic Prisma transaction.
   */
  async recordManualBatch(sessionId: string, dto: BatchAttendanceDto, user: AuthenticatedUser) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    // Authorization: Verify group ownership for teacher
    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own the academic group for this session');
      }
    }

    // Verify all students are actively enrolled in the session group before upserting
    const studentIds = dto.records.map((r) => r.studentId);
    const activeEnrollments = await this.prisma.groupEnrollment.findMany({
      where: {
        groupId: session.groupId,
        studentId: { in: studentIds },
        status: GroupEnrollmentStatus.ACTIVE,
      },
      select: { studentId: true },
    });

    const enrolledSet = new Set(activeEnrollments.map((e) => e.studentId));
    const nonEnrolled = studentIds.filter((id) => !enrolledSet.has(id));
    if (nonEnrolled.length > 0) {
      throw new BadRequestException(
        `Cannot record attendance for non-enrolled students: ${nonEnrolled.join(', ')}`,
      );
    }

    const targetStudentIds = Array.from(
      new Set([...studentIds, ...(dto.removedStudentIds || [])]),
    );

    const existingRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        sessionId,
        studentId: { in: targetStudentIds },
      },
      select: {
        studentId: true,
        status: true,
      },
    });
    const previousStatusMap = new Map(existingRecords.map((r) => [r.studentId, r.status]));

    const absentStudentIds = dto.records
      .filter((r) => r.status === AttendanceStatus.ABSENT)
      .map((r) => r.studentId);

    await this.prisma.$transaction(async (tx) => {
      // 1. Bulk delete existing records for the targeted students
      if (studentIds.length > 0) {
        await tx.attendanceRecord.deleteMany({
          where: {
            sessionId,
            studentId: { in: studentIds },
          },
        });

        // 2. Bulk insert all new attendance records in a single query
        await tx.attendanceRecord.createMany({
          data: dto.records.map((item) => ({
            sessionId,
            studentId: item.studentId,
            status: item.status,
            recordingMethod: RecordingMethod.MANUAL,
            recordedById: user.id,
            notes: item.notes,
            recordedAt: new Date(),
          })),
        });
      }

      // 3. Bulk remove homework records for newly absent students
      if (absentStudentIds.length > 0 && typeof tx.homeworkRecord?.deleteMany === 'function') {
        await tx.homeworkRecord.deleteMany({
          where: {
            sessionId,
            studentId: { in: absentStudentIds },
          },
        });
      }

      // 4. Bulk delete for removedStudentIds if specified
      if (dto.removedStudentIds && dto.removedStudentIds.length > 0) {
        await tx.attendanceRecord.deleteMany({
          where: {
            sessionId,
            studentId: { in: dto.removedStudentIds },
          },
        });

        if (typeof tx.homeworkRecord?.deleteMany === 'function') {
          await tx.homeworkRecord.deleteMany({
            where: {
              sessionId,
              studentId: { in: dto.removedStudentIds },
            },
          });
        }
      }
    });

    // 5. Emit domain notification events asynchronously without holding the DB transaction
    for (const item of dto.records) {
      const prevStatus = previousStatusMap.get(item.studentId);
      if (item.status === AttendanceStatus.ABSENT && prevStatus !== AttendanceStatus.ABSENT) {
        this.eventEmitter.emit('student.absence.recorded', {
          studentId: item.studentId,
          groupName: session.group.name,
          date: session.sessionDate,
          sessionId,
        });
      } else if (item.status !== AttendanceStatus.ABSENT && prevStatus === AttendanceStatus.ABSENT) {
        this.eventEmitter.emit('student.absence.corrected', {
          studentId: item.studentId,
          groupName: session.group.name,
          date: session.sessionDate,
          sessionId,
        });
      }
    }

    if (dto.removedStudentIds && dto.removedStudentIds.length > 0) {
      for (const removedId of dto.removedStudentIds) {
        if (previousStatusMap.get(removedId) === AttendanceStatus.ABSENT) {
          this.eventEmitter.emit('student.absence.corrected', {
            studentId: removedId,
            groupName: session.group.name,
            date: session.sessionDate,
            sessionId,
          });
        }
      }
    }

    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let totalEnrolled = 0;

    if (typeof this.prisma.attendanceRecord?.groupBy === 'function') {
      try {
        const [attendanceGroups, enrolled] = await Promise.all([
          this.prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: { sessionId },
            _count: { _all: true },
          }),
          this.prisma.groupEnrollment.count({
            where: { groupId: session.groupId, status: GroupEnrollmentStatus.ACTIVE },
          }),
        ]);
        totalEnrolled = enrolled;
        for (const ag of attendanceGroups) {
          const c = (ag as any)._count?._all ?? (ag as any)._count ?? 0;
          if (ag.status === AttendanceStatus.PRESENT) presentCount = c;
          else if (ag.status === AttendanceStatus.ABSENT) absentCount = c;
          else if (ag.status === AttendanceStatus.EXCUSED) excusedCount = c;
        }
      } catch {
        // Fallback for mock environments
        const [p, a, e, enrolled] = await Promise.all([
          this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.PRESENT } }),
          this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.ABSENT } }),
          this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.EXCUSED } }),
          this.prisma.groupEnrollment.count({
            where: { groupId: session.groupId, status: GroupEnrollmentStatus.ACTIVE },
          }),
        ]);
        presentCount = p;
        absentCount = a;
        excusedCount = e;
        totalEnrolled = enrolled;
      }
    } else {
      const [p, a, e, enrolled] = await Promise.all([
        this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.PRESENT } }),
        this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.ABSENT } }),
        this.prisma.attendanceRecord.count({ where: { sessionId, status: AttendanceStatus.EXCUSED } }),
        this.prisma.groupEnrollment.count({
          where: { groupId: session.groupId, status: GroupEnrollmentStatus.ACTIVE },
        }),
      ]);
      presentCount = p;
      absentCount = a;
      excusedCount = e;
      totalEnrolled = enrolled;
    }

    this.realtimeGateway?.notifyAttendanceChanged([user.id, session.group?.teacherId]);

    if (this.redisCache && targetStudentIds.length > 0) {
      const cacheDeletions = targetStudentIds.flatMap((sid) => [
        this.redisCache!.del(`student:dashboard:${sid}`),
        this.redisCache!.del(`parent:overview:${sid}`),
      ]);
      await Promise.allSettled(cacheDeletions);
    }

    return {
      sessionId,
      updatedCount: dto.records.length,
      sessionStats: {
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalExcused: excusedCount,
        totalEnrolled,
      },
    };
  }

  /**
   * Removes an attendance record for a student in a lesson session (resets to unrecorded).
   */
  async removeAttendanceRecord(sessionId: string, studentId: string, user: AuthenticatedUser) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own the academic group for this session');
      }
    }

    const existingRecord = await this.prisma.attendanceRecord.findFirst({
      where: {
        sessionId,
        studentId,
      },
      select: {
        status: true,
      },
    });

    await this.prisma.attendanceRecord.deleteMany({
      where: {
        sessionId,
        studentId,
      },
    });

    if (typeof this.prisma.homeworkRecord?.deleteMany === 'function') {
      await this.prisma.homeworkRecord.deleteMany({
        where: {
          sessionId,
          studentId,
        },
      });
    }

    // If the removed record was marked ABSENT, emit absence correction alert
    if (existingRecord?.status === AttendanceStatus.ABSENT) {
      this.eventEmitter.emit('student.absence.corrected', {
        studentId,
        groupName: session.group?.name,
        date: session.sessionDate,
        sessionId,
      });
    }

    this.realtimeGateway?.notifyAttendanceChanged([user.id, session.group?.teacherId]);

    return {
      success: true,
      sessionId,
      studentId,
      message: 'Attendance record removed successfully',
    };
  }

  /**
   * Removes a homework record for a student in a lesson session (resets to unassessed).
   */
  async removeHomeworkRecord(sessionId: string, studentId: string, user: AuthenticatedUser) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own the academic group for this session');
      }
    }

    if (typeof this.prisma.homeworkRecord?.deleteMany === 'function') {
      await this.prisma.homeworkRecord.deleteMany({
        where: {
          sessionId,
          studentId,
        },
      });
    }

    return {
      success: true,
      sessionId,
      studentId,
      message: 'Homework record removed successfully',
    };
  }
}
