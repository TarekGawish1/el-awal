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
import { AttendanceStatus, RecordingMethod, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

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
  async processQrScan(
    sessionId: string,
    qrCodeToken: string,
    user: AuthenticatedUser,
    allowCrossGroup = false,
  ) {
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

    // Authorization: If user is teacher, ensure teacher owns the group
    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (session.group.teacherId !== teacherId && session.group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own the academic group for this session');
      }
    }

    // 2. Token Resolution (supports QR token, studentCode, or UUID)
    const trimmedToken = qrCodeToken?.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedToken);

    const student = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          { qrCodeToken: trimmedToken },
          { studentCode: trimmedToken },
          ...(isUuid ? [{ id: trimmedToken }] : []),
        ],
      },
      include: {
        user: { select: { fullName: true, isActive: true, phone: true } },
        groupEnrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE },
          include: { group: true },
        },
      },
    });

    if (!student || !student.user.isActive) {
      throw new BadRequestException('رمز الـ QR غير صالح أو أن حساب الطالب غير مفعّل.');
    }

    // 3. Cohort Enrollment Check (Strict to selected session group)
    const directEnrollment = student.groupEnrollments.find(
      (e) => e.groupId === session.groupId,
    );

    if (!directEnrollment) {
      if (!allowCrossGroup) {
        const registeredGroup = student.groupEnrollments[0]?.group?.name;
        const extraInfo = registeredGroup ? ` (مسجل في: ${registeredGroup})` : '';

        throw new BadRequestException({
          statusCode: 400,
          error: 'STUDENT_NOT_ENROLLED',
          message: `عذراً، الطالب [${student.user.fullName}] غير مقيد في هذه المجموعة الدراسية (${session.group.name})${extraInfo}.`,
          studentName: student.user.fullName,
          studentId: student.id,
          studentCode: student.studentCode,
          gradeLevel: student.gradeLevel,
          enrolledGroups: student.groupEnrollments.map((e) => e.group?.name).filter(Boolean),
          originalGroupId: student.groupEnrollments[0]?.groupId || null,
          originalGroupName: registeredGroup || null,
        });
      }
    }

    // 4. Atomic Record Creation (Handles race condition & idempotency)
    const notes = !directEnrollment
      ? `حضور استثنائي / تعويض (المجموعة الأصلية: ${student.groupEnrollments[0]?.group?.name || 'أخرى'})`
      : undefined;

    let result;
    try {
      result = await this.attendanceRepository.recordQrScan(
        session.id,
        student.id,
        user.id,
        notes,
      );
    } catch (error: any) {
      if (error.message.includes('CONFLICT_MANUAL_OVERRIDE')) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'MANUAL_OVERRIDE_EXISTS',
          message: error.message.replace('CONFLICT_MANUAL_OVERRIDE: ', 'عذراً، '), // Return a friendly error message to the client
          studentName: student.user.fullName,
        });
      }
      throw error;
    }

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

    const recordedTimeStr = result.record.recordedAt
      ? new Date(result.record.recordedAt).toLocaleTimeString('ar-EG', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return {
      isDuplicate: result.isDuplicate,
      isCrossGroupSuccess: !directEnrollment,
      student: {
        id: student.id,
        fullName: student.user.fullName,
        studentCode: student.studentCode,
        gradeLevel: student.gradeLevel,
      },
      studentGroup: student.groupEnrollments[0]?.group
        ? {
            id: student.groupEnrollments[0].groupId,
            name: student.groupEnrollments[0].group.name,
            gradeLevel: student.groupEnrollments[0].group.gradeLevel,
          }
        : undefined,
      sessionGroup: {
        id: session.groupId,
        name: session.group.name,
        gradeLevel: session.group.gradeLevel,
      },
      attendance: result.record,
      sessionStats: {
        totalPresent,
        totalEnrolled: session.group._count.enrollments,
      },
      message: result.isDuplicate
        ? `⚠️ تم تسجيل حضور الطالب [${student.user.fullName}] لهذه الحصة مسبقاً ${recordedTimeStr ? `في تمام الساعة ${recordedTimeStr}` : ''}`
        : !directEnrollment
        ? `تم تسجيل حضور استثنائي للطالب [${student.user.fullName}] بنجاح (تعويض حصة)`
        : `تم تسجيل حضور الطالب [${student.user.fullName}] بنجاح`,
    };
  }

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
            recordedById: user.id,
            notes: item.notes,
            recordedAt: new Date(),
          },
          update: {
            status: item.status,
            recordingMethod: RecordingMethod.MANUAL,
            recordedById: user.id,
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
  async getSessionReport(sessionId: string, user: AuthenticatedUser) {
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
        homeworkRecords: {
          select: {
            id: true,
            assessmentId: true,
            studentId: true,
            sessionId: true,
            status: true,
            checkedByRole: true,
            recordedMethod: true,
            score: true,
            feedback: true,
            clientTimestamp: true,
          },
        },
      },
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

    const totalEnrolled = session.group.enrollments.length;
    const presentCount = session.attendanceRecords.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = session.attendanceRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const excusedCount = session.attendanceRecords.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
    const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;
    const homeworkCheckedCount = session.homeworkRecords?.filter((h) => h.status === 'CHECKED_ONSITE').length || 0;

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
        homeworkCheckedCount,
      },
      homeworkRecords: session.homeworkRecords || [],
      records: session.group.enrollments.map((e) => {
        const r = session.attendanceRecords.find((ar) => ar.studentId === e.studentId);
        const hw = session.homeworkRecords?.find((hr) => hr.studentId === e.studentId);
        return {
          id: r?.id || `unrecorded-${e.studentId}`,
          studentId: e.studentId,
          studentCode: e.student.studentCode,
          fullName: e.student.user.fullName,
          phone: e.student.user.phone,
          status: r?.status || null,
          recordingMethod: r?.recordingMethod || null,
          recordedAt: r?.recordedAt || null,
          recordedBy: r?.recordedBy?.fullName || null,
          notes: r?.notes || null,
          homeworkStatus: hw?.status || 'NOT_SUBMITTED',
          isHomeworkSubmitted: !!hw && (hw.status === 'CHECKED_ONSITE' || hw.status === 'SUBMITTED_ONLINE'),
          homeworkScore: hw?.score ? Number(hw.score) : null,
          homeworkFeedback: hw?.feedback || null,
          homeworkCheckedAt: hw?.clientTimestamp || null,
        };
      }),
    };
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
    if (user) {
      if (user.role === UserRole.STUDENT) {
        const myStudentId = user.studentProfileId || user.id;
        if (myStudentId !== studentId) {
          throw new ForbiddenException(
            'Students can only access their own attendance history',
          );
        }
      } else if (user.role === UserRole.PARENT) {
        const parentId = user.parentProfileId || user.id;
        const link = await this.prisma.parentStudentLink.findUnique({
          where: {
            parentId_studentId: {
              parentId,
              studentId,
            },
          },
        });
        if (!link) {
          throw new ForbiddenException(
            'Guardians can only view linked children attendance history',
          );
        }
      }
    }

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
