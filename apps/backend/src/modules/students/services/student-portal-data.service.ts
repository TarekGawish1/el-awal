import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { StudentGroupQueryDto } from '../dto/student-group-query.dto';
import {
  GroupEnrollmentStatus,
  PaymentStatus,
  PaymentType,
  AttendanceStatus,
  CourseEnrollmentStatus,
} from '@prisma/client';
import { StudentGroupHubService } from './student-group-hub.service';
import {
  formatCourseSummaries,
  formatDashboardPayload,
} from '../helpers/student-dashboard.helper';

@Injectable()
export class StudentPortalDataService {
  private readonly logger = new Logger(StudentPortalDataService.name);
  private readonly groupHubService: StudentGroupHubService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() groupHubService?: StudentGroupHubService,
  ) {
    this.groupHubService =
      groupHubService ??
      new StudentGroupHubService(this.prisma, this.storageService, this.redisCache);
  }

  async getMyGroup(user: AuthenticatedUser, query?: StudentGroupQueryDto) {
    return this.groupHubService.getMyGroup(user, query);
  }

  async getMyGroupSessions(
    user: AuthenticatedUser,
    query?: StudentGroupQueryDto,
  ) {
    return this.groupHubService.getMyGroupSessions(user, query);
  }

  async getStudentDashboardOverview(user: AuthenticatedUser) {
    const studentId = user.studentProfileId || user.id;
    const cacheKey = `student:dashboard:${studentId}`;

    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        groupEnrollments: {
          where: { status: { in: [GroupEnrollmentStatus.ACTIVE, 'PENDING'] } },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                gradeLevel: true,
                monthlyFee: true,
                schedules: {
                  orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                  select: {
                    id: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                    location: true,
                  },
                },
              },
            },
          },
          orderBy: { enrolledAt: 'asc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const actualStudentId = student.id;
    const activeEnrollment = student.groupEnrollments.find(
      (ge) => ge.status === GroupEnrollmentStatus.ACTIVE,
    );
    const primaryGroup = activeEnrollment?.group || null;
    const groupId = primaryGroup?.id;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalAttendance,
      attendedCount,
      currentMonthPayment,
      courseEnrollments,
      upcomingSession,
      rawExams,
      latestAssignment,
    ] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: { studentId: actualStudentId },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          studentId: actualStudentId,
          status: AttendanceStatus.PRESENT,
        },
      }),
      this.prisma.studentPaymentRecord.findFirst({
        where: {
          studentId: actualStudentId,
          periodYear: currentYear,
          periodMonth: currentMonth,
          paymentType: PaymentType.TUITION,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courseEnrollment.findMany({
        where: {
          studentId: actualStudentId,
          status: CourseEnrollmentStatus.ACTIVE,
        },
        include: {
          course: {
            include: {
              teacher: { include: { user: { select: { fullName: true } } } },
              modules: {
                include: {
                  lessons: { select: { id: true } },
                },
              },
            },
          },
        },
      }),
      groupId
        ? this.prisma.lessonSession.findFirst({
            where: {
              groupId,
              sessionDate: { gte: today },
            },
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            include: {
              schedule: { select: { id: true, location: true } },
              group: { select: { name: true } },
            },
          })
        : null,
      groupId
        ? this.prisma.assessment.findMany({
            where: {
              isPublished: true,
              type: 'EXAM',
              courseId: null,
              lessonId: null,
              OR: [{ groupId }, { targetGroups: { some: { id: groupId } } }],
            },
            include: {
              group: { select: { id: true, name: true } },
              targetGroups: { select: { id: true, name: true } },
              submissions: {
                where: { studentId: actualStudentId },
                select: { id: true, status: true, scoreObtained: true },
              },
              _count: { select: { questions: true } },
            },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
            take: 10,
          })
        : [],
      groupId
        ? this.prisma.assessment.findFirst({
            where: {
              isPublished: true,
              type: 'ASSIGNMENT',
              courseId: null,
              lessonId: null,
              OR: [{ groupId }, { targetGroups: { some: { id: groupId } } }],
            },
            include: {
              group: { select: { id: true, name: true } },
              submissions: {
                where: { studentId: actualStudentId },
                orderBy: { attemptNumber: 'desc' },
                take: 1,
                select: {
                  status: true,
                  scoreObtained: true,
                  submittedAt: true,
                },
              },
              _count: { select: { questions: true } },
            },
            orderBy: { createdAt: 'desc' },
          })
        : null,
    ]);

    const attendanceRatePercentage =
      totalAttendance > 0
        ? Math.round((attendedCount / totalAttendance) * 100)
        : 100;

    const enrolledCourseIds = courseEnrollments.map((ce) => ce.courseId);
    const completedCountsByCourse = new Map<string, number>();
    for (const cid of enrolledCourseIds) {
      completedCountsByCourse.set(cid, 0);
    }

    if (
      enrolledCourseIds.length > 0 &&
      typeof this.prisma.courseProgress?.groupBy === 'function'
    ) {
      try {
        const counts = await this.prisma.courseProgress.groupBy({
          by: ['courseId'],
          where: {
            studentId: actualStudentId,
            courseId: { in: enrolledCourseIds },
            isCompleted: true,
          },
          _count: { _all: true },
        });
        for (const row of counts) {
          if (row.courseId) {
            completedCountsByCourse.set(
              row.courseId,
              (row as any)._count?._all ?? (row as any)._count ?? 0,
            );
          }
        }
      } catch {
        try {
          if (typeof this.prisma.courseProgress?.findMany === 'function') {
            const list = await this.prisma.courseProgress.findMany({
              where: {
                studentId: actualStudentId,
                courseId: { in: enrolledCourseIds },
                isCompleted: true,
              },
              select: { courseId: true },
            });
            for (const item of list) {
              if (item.courseId) {
                completedCountsByCourse.set(
                  item.courseId,
                  (completedCountsByCourse.get(item.courseId) || 0) + 1,
                );
              }
            }
          }
        } catch {
          // Retain default 0 counts
        }
      }
    }

    const courseSummaries = formatCourseSummaries(
      courseEnrollments,
      completedCountsByCourse,
    );

    let nextSession: any = null;
    if (upcomingSession) {
      nextSession = {
        id: upcomingSession.id,
        topic: upcomingSession.topic,
        sessionDate: upcomingSession.sessionDate,
        startTime: upcomingSession.startTime,
        endTime: upcomingSession.endTime,
        location: upcomingSession.schedule?.location || 'مقر السنتر',
        groupName: upcomingSession.group?.name || primaryGroup?.name,
        schedule: upcomingSession.schedule,
      };
    }

    const nowMs = Date.now();
    const upcomingExams = (rawExams || [])
      .filter((e) => {
        if (!e.dueDate) return true;
        return new Date(e.dueDate).getTime() >= nowMs;
      })
      .map((e) => ({
        id: e.id,
        title: e.title,
        totalScore: Number(e.totalScore || 0),
        dueDate: e.dueDate,
        group: e.group || e.targetGroups?.[0] || null,
        targetGroups: e.targetGroups,
        _count: { submissions: e.submissions?.length || 0 },
        submissions: e.submissions,
      }));

    let latestHomework: any = null;
    if (latestAssignment) {
      const sub = latestAssignment.submissions?.[0] || null;
      latestHomework = {
        assessmentId: latestAssignment.id,
        id: latestAssignment.id,
        title: latestAssignment.title,
        description: latestAssignment.description,
        dueDate: latestAssignment.dueDate,
        totalScore: Number(latestAssignment.totalScore || 0),
        questionsCount: latestAssignment._count?.questions || 0,
        groupName:
          latestAssignment.group?.name ||
          primaryGroup?.name ||
          'المجموعة الدراسية',
        sessionDate: latestAssignment.createdAt,
        topic: latestAssignment.title,
        submission: sub
          ? {
              status: sub.status,
              scoreObtained:
                sub.scoreObtained != null ? Number(sub.scoreObtained) : null,
              submittedAt: sub.submittedAt,
            }
          : null,
      };
    }

    const payload = formatDashboardPayload({
      student,
      primaryGroup,
      courseSummaries,
      upcomingExams,
      attendanceRatePercentage,
      totalAttendance,
      attendedCount,
      currentYear,
      currentMonth,
      currentMonthPayment,
      nextSession,
      latestHomework,
    });

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, payload, 300);
    }

    return payload;
  }

  async invalidateStudentDashboardCache(studentId: string) {
    if (this.redisCache) {
      await this.redisCache.del(`student:dashboard:${studentId}`);
      await this.redisCache.delPattern(`parent:overview:*`);
    }
  }
}
