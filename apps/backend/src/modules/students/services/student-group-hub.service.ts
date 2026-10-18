import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { StudentGroupQueryDto } from '../dto/student-group-query.dto';
import {
  GroupEnrollmentStatus,
  PaymentStatus,
  PaymentType,
} from '@prisma/client';
import {
  computeEffectiveDueDate,
  SessionForDeadline,
} from '../../assessments/utils/effective-due-date.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class StudentGroupHubService {
  private readonly logger = new Logger(StudentGroupHubService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  resolveStudentId(user: AuthenticatedUser): string {
    return user.studentProfileId || user.id;
  }

  resolveCalendarPeriod(query?: StudentGroupQueryDto) {
    const now = new Date();
    return {
      month: query?.month || now.getUTCMonth() + 1,
      year: query?.year || now.getUTCFullYear(),
    };
  }

  async getActiveStudentGroup(user: AuthenticatedUser) {
    const studentId = this.resolveStudentId(user);
    const cacheKey = `student:active_group:${studentId}`;

    const fetcher = async () => {
      const enrollment = await this.prisma.groupEnrollment.findFirst({
        where: {
          studentId,
          status: GroupEnrollmentStatus.ACTIVE,
          group: { isActive: true },
        },
        orderBy: { enrolledAt: 'asc' },
        include: {
          group: {
            include: {
              schedules: {
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
              },
              teacher: {
                include: { user: { select: { id: true, fullName: true } } },
              },
            },
          },
        },
      });

      if (!enrollment) {
        throw new NotFoundException(
          'The student is not enrolled in an active academic group',
        );
      }

      return enrollment;
    };

    if (this.redisCache) {
      return this.redisCache.getOrSet(cacheKey, fetcher, 60);
    }
    return fetcher();
  }

  async getMyGroup(user: AuthenticatedUser, query?: StudentGroupQueryDto) {
    const studentId = this.resolveStudentId(user);
    const { month, year } = this.resolveCalendarPeriod(query);
    const cacheKey = `student:my_group:${studentId}:${month}:${year}`;

    const fetcher = async () => {
      const enrollment = await this.getActiveStudentGroup(user);
      const group = enrollment.group;
      const payment = await this.prisma.studentPaymentRecord.findFirst({
        where: {
          studentId: enrollment.studentId,
          groupId: group.id,
          periodMonth: month,
          periodYear: year,
          paymentType: PaymentType.TUITION,
        },
        orderBy: { createdAt: 'desc' },
      });

      const amountExpected = Number(payment?.amountExpected ?? group.monthlyFee);
      const amountPaid = Number(payment?.amountPaid ?? 0);
      const isPaid =
        payment?.paymentStatus === PaymentStatus.PAID &&
        amountPaid >= amountExpected;

      return {
        group: {
          id: group.id,
          name: group.name,
          gradeLevel: group.gradeLevel,
          academicYear: group.academicYear,
          academicTerm: group.academicTerm,
          description: group.description,
          monthlyFee: Number(group.monthlyFee),
          schedules: group.schedules,
        },
        enrolledAt: enrollment.enrolledAt,
        teacher: {
          id: group.teacher.id,
          fullName: group.teacher.user.fullName,
          specialty: group.teacher.specialty,
          bio: group.teacher.bio,
        },
        subscription: {
          year,
          month,
          amountExpected,
          amountPaid,
          paymentStatus: payment?.paymentStatus || PaymentStatus.PENDING,
          isPaid,
        },
      };
    };

    if (this.redisCache) {
      return this.redisCache.getOrSet(cacheKey, fetcher, 60);
    }
    return fetcher();
  }

  async getMyGroupSessions(
    user: AuthenticatedUser,
    query?: StudentGroupQueryDto,
  ) {
    const studentId = this.resolveStudentId(user);
    const { month, year } = this.resolveCalendarPeriod(query);
    const cacheKey = `student:my_group_sessions:${studentId}:${month}:${year}`;

    const fetcher = async () => {
      const enrollment = await this.getActiveStudentGroup(user);
      const sId = enrollment.studentId;
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0));
      const groupId = enrollment.groupId;

      const [sessions, assessments] = await Promise.all([
      this.prisma.lessonSession.findMany({
        where: { groupId, sessionDate: { gte: startDate, lte: endDate } },
        orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
        include: {
          schedule: { select: { id: true, location: true } },
          attendanceRecords: {
            where: { studentId },
            select: {
              status: true,
              recordingMethod: true,
              recordedAt: true,
              notes: true,
            },
            take: 1,
          },
          educationalContents: {
            select: {
              id: true,
              title: true,
              description: true,
              contentType: true,
              fileUrl: true,
              fileKey: true,
              fileSize: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.assessment.findMany({
        where: {
          isPublished: true,
          OR: [{ groupId }, { targetGroups: { some: { id: groupId } } }],
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          totalScore: true,
          dueDate: true,
          createdAt: true,
          submissions: {
            where: { studentId },
            orderBy: { attemptNumber: 'desc' },
            select: {
              status: true,
              scoreObtained: true,
              attemptNumber: true,
              fileKey: true,
              attachmentUrl: true,
              studentNotes: true,
              submittedAt: true,
              teacherFeedback: true,
            },
          },
        },
      }),
    ]);

    const getDateKey = (value: Date | string | null | undefined) =>
      value ? new Date(value).toISOString().slice(0, 10) : null;

    const deadlineSessions: SessionForDeadline[] = sessions.map((s) => ({
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      isCancelled: s.isCancelled,
    }));

    const enrolledAt = enrollment.enrolledAt;

    return Promise.all(
      sessions.map(async (session) => {
        const sessionDateKey = getDateKey(session.sessionDate);
        const enrolledAtKey = getDateKey(enrolledAt);
        let sessionEndTime = new Date(session.sessionDate);
        if (session.endTime) {
          const [h, m] = session.endTime.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            sessionEndTime = new Date(session.sessionDate);
            sessionEndTime.setUTCHours(h, m, 0, 0);
          }
        }

        const isPreEnrollment = Boolean(
          enrolledAt &&
            ((sessionDateKey &&
              enrolledAtKey &&
              sessionDateKey < enrolledAtKey) ||
              (sessionDateKey === enrolledAtKey &&
                sessionEndTime.getTime() < new Date(enrolledAt).getTime())),
        );

        const attendance = isPreEnrollment
          ? null
          : session.attendanceRecords[0] || null;

        let assessment = assessments.find((item) => {
          if (session.topic && item.title && item.title.includes(session.topic))
            return true;
          if (sessionDateKey && item.title && item.title.includes(sessionDateKey))
            return true;
          if (getDateKey(item.createdAt) === sessionDateKey) return true;
          if (getDateKey(item.dueDate) === sessionDateKey) return true;
          return false;
        });
        const submission = assessment?.submissions[0];
        const effectiveDueDate = assessment
          ? computeEffectiveDueDate(
              assessment.type,
              assessment.dueDate as Date | null,
              deadlineSessions,
            )
          : null;
        assessment = assessment
          ? { ...assessment, dueDate: effectiveDueDate }
          : assessment;
        const educationalContents = await Promise.all(
          session.educationalContents.map(async (content) => ({
            ...content,
            fileSize:
              content.fileSize === null ? null : Number(content.fileSize),
            downloadUrl:
              this.storageService && !content.fileUrl.startsWith('/uploads/')
                ? await this.storageService.generatePresignedDownloadUrl(
                    content.fileKey,
                  )
                : content.fileUrl,
          })),
        );

        return {
          id: session.id,
          groupId: session.groupId,
          scheduleId: session.scheduleId,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          endTime: session.endTime,
          topic: session.topic,
          isCancelled: session.isCancelled,
          cancellationReason: session.cancellationReason,
          location: session.schedule?.location || null,
          isPreEnrollment,
          studentEnrolledAt: enrolledAt,
          attendance,
          assessment: assessment
            ? {
                id: assessment.id,
                title: assessment.title,
                description: assessment.description,
                type: (assessment as any).type,
                totalScore: Number(assessment.totalScore),
                dueDate: effectiveDueDate,
                submission: submission
                  ? {
                      status: submission.status,
                      scoreObtained:
                        submission.scoreObtained === null
                          ? null
                          : Number(submission.scoreObtained),
                    }
                  : null,
              }
            : null,
          educationalContents,
        };
      }),
    );
    };

    if (this.redisCache) {
      return this.redisCache.getOrSet(cacheKey, fetcher, 60);
    }
    return fetcher();
  }
}
