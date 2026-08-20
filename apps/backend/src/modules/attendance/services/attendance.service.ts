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

    // 3. Cohort Enrollment & Grade Level Check
    const directEnrollment = student.groupEnrollments.find(
      (e) => e.groupId === session.groupId,
    );

    const sessionGrade = session.group.gradeLevel?.trim();
    const studentGrade = student.gradeLevel?.trim();

    // Check primary group
    const primaryEnrollment = student.groupEnrollments[0];
    const primaryGroup = primaryEnrollment?.group;
    const studentGroupGrade = primaryGroup?.gradeLevel?.trim() || studentGrade;

    let crossGroupNote: string | undefined = undefined;

    if (!directEnrollment) {
      // Check if student belongs to the same grade level (الصف الدراسي)
      const isSameGrade =
        (sessionGrade && studentGrade && sessionGrade === studentGrade) ||
        (sessionGrade && studentGroupGrade && sessionGrade === studentGroupGrade);

      if (!isSameGrade) {
        throw new BadRequestException(
          `عذراً، الطالب [${student.user.fullName}] مسجل في [${studentGrade || studentGroupGrade || 'صف دراسي آخر'}] ولا يمكنه حضور حصة مخصصة لـ [${sessionGrade}].`,
        );
      }

      // Same grade level but different group!
      const sourceGroupName = primaryGroup?.name || 'مجموعة أخرى';

      if (!allowCrossGroup) {
        // Return a prompt object so the frontend can offer cross-group attendance confirmation
        return {
          isCrossGroupPrompt: true,
          isDuplicate: false,
          student: {
            id: student.id,
            fullName: student.user.fullName,
            studentCode: student.studentCode,
            gradeLevel: studentGrade || studentGroupGrade,
            phone: student.user.phone,
          },
          studentGroup: {
            id: primaryGroup?.id,
            name: sourceGroupName,
            gradeLevel: studentGroupGrade,
          },
          sessionGroup: {
            id: session.group.id,
            name: session.group.name,
            gradeLevel: sessionGrade,
          },
          message: `الطالب [${student.user.fullName}] غير مسجل في هذه المجموعة (${session.group.name})، بل في [${sourceGroupName}] بنفس الصف الدراسي (${sessionGrade}).`,
        };
      }

      crossGroupNote = `حضور استثنائي (تبديل ميعاد من ${sourceGroupName})`;
    }

    // 4. Atomic Record Creation (Handles race condition & idempotency)
    const result = await this.attendanceRepository.recordQrScan(
      session.id,
      student.id,
      user.id,
      crossGroupNote,
    );

    // If cross-group attendance, also automatically mark the equivalent session in student's own group
    if (!directEnrollment && primaryGroup?.id) {
      try {
        let equivalentSession: any = null;

        // 1. Match by exact or normalized topic title
        if (session.topic && session.topic.trim()) {
          equivalentSession = await this.prisma.lessonSession.findFirst({
            where: {
              groupId: primaryGroup.id,
              topic: {
                equals: session.topic.trim(),
                mode: 'insensitive',
              },
              isCancelled: false,
            },
            orderBy: {
              sessionDate: 'desc',
            },
          });
        }

        // 2. Fallback: match by closest session date within +/- 6 days in student's group
        if (!equivalentSession) {
          const sessionDate = new Date(session.sessionDate);
          const minDate = new Date(sessionDate);
          minDate.setDate(minDate.getDate() - 5);
          const maxDate = new Date(sessionDate);
          maxDate.setDate(maxDate.getDate() + 5);

          equivalentSession = await this.prisma.lessonSession.findFirst({
            where: {
              groupId: primaryGroup.id,
              sessionDate: {
                gte: minDate,
                lte: maxDate,
              },
              isCancelled: false,
            },
            orderBy: {
              sessionDate: 'asc',
            },
          });
        }

        if (equivalentSession && equivalentSession.id !== session.id) {
          const sessionDateFormatted = new Date(session.sessionDate).toLocaleDateString('ar-EG', {
            weekday: 'long',
            day: 'numeric',
            month: 'numeric',
          });
          const originalGroupNote = `حضور بديل بمجموعة (${session.group.name}) - ${sessionDateFormatted}`;

          await this.attendanceRepository.recordQrScan(
            equivalentSession.id,
            student.id,
            user.id,
            originalGroupNote,
          );

          this.logger.log(
            `[Cross-Group Attendance] Auto-marked equivalent session [${equivalentSession.id}] for student ${student.user.fullName} in original group [${primaryGroup.name}]`,
          );
        }
      } catch (equivErr) {
        this.logger.error('Failed to auto-mark equivalent group session:', equivErr);
      }
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
        gradeLevel: studentGrade,
      },
      attendance: result.record,
      sessionStats: {
        totalPresent,
        totalEnrolled: session.group._count.enrollments,
      },
      message: result.isDuplicate
        ? `⚠️ تم تسجيل حضور الطالب [${student.user.fullName}] لهذه الحصة مسبقاً ${recordedTimeStr ? `في تمام الساعة ${recordedTimeStr}` : ''}`
        : !directEnrollment
        ? `تم تسجيل حضور الطالب [${student.user.fullName}] كحضور استثنائي بنجاح (تبديل ميعاد)!`
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
      records: session.group.enrollments.map((e) => {
        const r = session.attendanceRecords.find((ar) => ar.studentId === e.studentId);
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
