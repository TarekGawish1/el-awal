import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AttendanceRepository } from '../repositories/attendance.repository';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { AttendanceStatus, GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { getSessionEndUtcDate } from '../utils/attendance.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class AttendanceQueriesService {
  private readonly logger = new Logger(AttendanceQueriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceRepository: AttendanceRepository,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

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

    const sessionEndTime = getSessionEndUtcDate(
      session.sessionDate,
      session.startTime,
      session.endTime,
    );

    // Only students who were enrolled BEFORE the session ended are eligible.
    // Students who enrolled after the session finished are never considered absent.
    const eligibleEnrollments = session.group.enrollments.filter(
      (e) => !e.enrolledAt || (sessionEndTime ? new Date(e.enrolledAt).getTime() <= sessionEndTime.getTime() : true),
    );

    const totalEnrolled = eligibleEnrollments.length;
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
      records: eligibleEnrollments.map((e) => {
        const r = session.attendanceRecords.find((ar) => ar.studentId === e.studentId);
        const hw = session.homeworkRecords?.find((hr) => hr.studentId === e.studentId);
        return {
          id: r?.id || `unrecorded-${e.studentId}`,
          studentId: e.studentId,
          studentCode: e.student.studentCode,
          qrCodeToken: e.student.qrCodeToken || '',
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
      } else if (user.role === UserRole.TEACHER) {
        const teacherId = user.teacherProfileId || user.id;
        const enrolledInTeacherGroup = await this.prisma.groupEnrollment.findFirst({
          where: {
            studentId,
            status: GroupEnrollmentStatus.ACTIVE,
            group: {
              OR: [
                { teacherId },
                { teacher: { id: teacherId } },
              ],
            },
          },
        });
        if (!enrolledInTeacherGroup) {
          throw new ForbiddenException(
            'Teachers can only view attendance history for students actively enrolled in their academic groups',
          );
        }
      } else if (user.role === UserRole.SECRETARIAT) {
        let teacherId = user.id;
        const assistantLink = await this.prisma.teacherAssistant.findFirst({
          where: { assistantId: user.id, status: 'ACTIVE' },
          select: { teacherId: true },
        });
        if (assistantLink) {
          teacherId = assistantLink.teacherId;
        }
        const enrolledInTeacherGroup = await this.prisma.groupEnrollment.findFirst({
          where: {
            studentId,
            status: GroupEnrollmentStatus.ACTIVE,
            group: {
              OR: [
                { teacherId },
                { teacher: { id: teacherId } },
              ],
            },
          },
        });
        if (!enrolledInTeacherGroup) {
          throw new ForbiddenException(
            'Secretariat can only view attendance history for students enrolled in linked teacher academic groups',
          );
        }
      }
    }

    const cacheKey = `attendance:student:${studentId}:${pagination.cursor || 'first'}:${pagination.limit || 20}:${status || 'all'}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.attendanceRepository.getStudentAttendanceHistory(
      studentId,
      {
        cursor: pagination.cursor,
        limit: pagination.limit,
        direction: pagination.direction,
      },
      status,
    );

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, result, 300);
    }

    return result;
  }
}
