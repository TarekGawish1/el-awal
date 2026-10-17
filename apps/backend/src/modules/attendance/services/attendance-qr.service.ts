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
import { AttendanceRepository } from '../repositories/attendance.repository';
import { AttendanceStatus, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class AttendanceQrService {
  private readonly logger = new Logger(AttendanceQrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
    @Optional() private readonly redisCache?: RedisCacheService,
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
          message: error.message.replace('CONFLICT_MANUAL_OVERRIDE: ', 'عذراً، '),
          studentName: student.user.fullName,
        });
      }
      throw error;
    }

    // 5. Emit domain event if this was the first successful scan
    if (!result.isDuplicate) {
      if (this.redisCache) {
        await this.redisCache.del(`student:dashboard:${student.id}`);
        await this.redisCache.del(`parent:overview:${student.id}`);
      }
      this.eventEmitter.emit('attendance.recorded', {
        sessionId: session.id,
        studentId: student.id,
        status: AttendanceStatus.PRESENT,
      });

      // Repeated lateness detection (3 consecutive times)
      if (session.startTime) {
        const rawRecordedAt = result.record?.recordedAt || (result.record as any)?.recorded_at || new Date();
        const recordedAtDate = rawRecordedAt instanceof Date ? rawRecordedAt : new Date(rawRecordedAt);
        const recordedAtInCairo = new Date(
          recordedAtDate.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
        );
        const [startH, startM] = session.startTime.split(':').map(Number);

        // Treat as late if more than 10 minutes past start time
        const isLate =
          recordedAtInCairo.getHours() > startH ||
          (recordedAtInCairo.getHours() === startH && recordedAtInCairo.getMinutes() > startM + 10);

        if (isLate) {
          const last3Records = await this.prisma.attendanceRecord.findMany({
            where: { studentId: student.id, status: AttendanceStatus.PRESENT },
            orderBy: { session: { sessionDate: 'desc' } },
            take: 3,
            include: { session: true },
          });

          let consecutiveLateCount = 0;
          for (const record of last3Records) {
            if (!record.session.startTime) break;
            const rawRec = record.recordedAt || (record as any).recorded_at || new Date();
            const recDate = rawRec instanceof Date ? rawRec : new Date(rawRec);
            const recTime = new Date(
              recDate.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
            );
            const [sH, sM] = record.session.startTime.split(':').map(Number);
            if (recTime.getHours() > sH || (recTime.getHours() === sH && recTime.getMinutes() > sM + 10)) {
              consecutiveLateCount++;
            } else {
              break;
            }
          }

          if (consecutiveLateCount >= 3) {
            this.eventEmitter.emit('student.repeated.lateness', {
              studentId: student.id,
              groupName: session.group.name,
            });
          }
        }
      }
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

    this.realtimeGateway?.notifyAttendanceChanged([user.id, session.group?.teacherId]);

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
}
