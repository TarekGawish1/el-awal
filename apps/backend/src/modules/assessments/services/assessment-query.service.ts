import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  UserRole,
  GroupEnrollmentStatus,
  CourseEnrollmentStatus,
} from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import {
  computeEffectiveDueDate,
  SessionForDeadline,
} from '../utils/effective-due-date.util';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class AssessmentQueryService {
  private readonly logger = new Logger(AssessmentQueryService.name);
  private readonly assessmentsListCache: MemoryCache;
  private readonly groupSessionsCache: MemoryCache;
  private readonly assessmentDetailsCache: MemoryCache<any>;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() assessmentsListCache?: MemoryCache,
    @Optional() groupSessionsCache?: MemoryCache,
    @Optional() assessmentDetailsCache?: MemoryCache<any>,
  ) {
    this.assessmentsListCache = assessmentsListCache ?? new MemoryCache(25, 200);
    this.groupSessionsCache = groupSessionsCache ?? new MemoryCache(60, 50);
    this.assessmentDetailsCache = assessmentDetailsCache ?? new MemoryCache<any>(45, 200);
  }

  async invalidatePortalCaches(studentId?: string | null) {
    if (!this.redisCache) return;
    try {
      if (studentId) {
        await Promise.all([
          this.redisCache.delPattern(`student:dashboard:${studentId}`),
          this.redisCache.delPattern(`parent:overview:${studentId}`),
          this.redisCache.delPattern(`parent:dashboard:*`),
        ]);
      } else {
        await Promise.all([
          this.redisCache.delPattern('student:dashboard:*'),
          this.redisCache.delPattern('parent:overview:*'),
          this.redisCache.delPattern('parent:dashboard:*'),
        ]);
      }
    } catch (error) {
      this.logger.warn(`Failed to invalidate portal caches: ${error}`);
    }
  }

  async getCachedAssessmentBase(assessmentId: string) {
    const cacheKey = `assessment:base:${assessmentId}`;
    return this.assessmentDetailsCache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.assessment.findUnique({
          where: { id: assessmentId },
          include: {
            teacher: {
              include: { user: { select: { fullName: true } } },
            },
            group: {
              include: {
                enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
              },
            },
            targetGroups: {
              include: {
                enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
              },
            },
            course: {
              include: {
                enrollments: { where: { status: CourseEnrollmentStatus.ACTIVE } },
              },
            },
            courseFinalQuizOf: {
              select: {
                id: true,
                enforceSequentialLessons: true,
                modules: {
                  include: {
                    unitQuiz: { select: { id: true, isOptional: true } },
                    lessons: { select: { id: true } },
                  },
                },
              },
            },
            unitQuizOf: {
              select: {
                id: true,
                courseId: true,
                course: {
                  select: {
                    enforceSequentialLessons: true,
                  },
                },
                lessons: { select: { id: true } },
              },
            },
            questions: {
              orderBy: { questionNumber: 'asc' },
            },
          },
        });
      },
      45,
    );
  }

  async getAssessments(query: AssessmentQueryDto, user: AuthenticatedUser) {
    const userKey = user.studentProfileId || user.parentProfileId || user.teacherProfileId || user.id;
    const cacheKey = `assessments:${user.role}:${userKey}:${JSON.stringify(query)}`;
    return this.assessmentsListCache.getOrSet(cacheKey, async () => {
      const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
      const decodedCursor = query.cursor
        ? CursorPaginationHelper.decodeCursor(query.cursor)
        : null;
      const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
        decodedCursor,
        'DESC',
      );

      const where: any = {
        ...(query.courseId ? { courseId: query.courseId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.isPublished !== undefined
          ? { isPublished: query.isPublished }
          : {}),
        ...(cursorFilter || {}),
      };

      if (query.groupId) {
        where.AND = where.AND || [];
        where.AND.push({
          OR: [
            { groupId: query.groupId },
            { targetGroups: { some: { id: query.groupId } } },
          ],
        });
      }

      let targetStudentId: string | null = null;

      if (user.role === UserRole.STUDENT) {
        targetStudentId = user.studentProfileId || user.id;
        where.isPublished = true;
        const studentId = targetStudentId;
        where.lessonId = null;
        where.courseId = null;
        where.OR = [
          { group: { enrollments: { some: { studentId, status: GroupEnrollmentStatus.ACTIVE } } } },
          { targetGroups: { some: { enrollments: { some: { studentId, status: GroupEnrollmentStatus.ACTIVE } } } } },
        ];
      } else if (user.role === UserRole.PARENT) {
        where.isPublished = true;
        const parentId = user.parentProfileId || user.id;

        if (query.studentId) {
          const link = await this.prisma.parentStudentLink.findFirst({
            where: { parentId, studentId: query.studentId },
          });
          if (link) {
            targetStudentId = query.studentId;
          }
        }

        if (targetStudentId) {
          where.OR = [
            { group: { enrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, studentId: targetStudentId } } } },
            { targetGroups: { some: { enrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, studentId: targetStudentId } } } } },
            { course: { enrollments: { some: { status: CourseEnrollmentStatus.ACTIVE, studentId: targetStudentId } } } },
          ];
        } else {
          where.OR = [
            { group: { enrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } },
            { targetGroups: { some: { enrollments: { some: { status: GroupEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } } },
            { course: { enrollments: { some: { status: CourseEnrollmentStatus.ACTIVE, student: { parentLinks: { some: { parentId } } } } } } },
          ];
        }
      } else if (user.role === UserRole.TEACHER) {
        const teacherId = user.teacherProfileId || user.id;
        where.teacherId = teacherId;
      }

      if (query.academicYear || query.academicTerm) {
        where.AND = where.AND || [];
        const periodConditions: any[] = [];

        periodConditions.push({
          group: {
            ...(query.academicYear ? { academicYear: query.academicYear } : {}),
            ...(query.academicTerm ? { academicTerm: query.academicTerm } : {}),
          },
        });

        periodConditions.push({
          targetGroups: {
            some: {
              ...(query.academicYear ? { academicYear: query.academicYear } : {}),
              ...(query.academicTerm ? { academicTerm: query.academicTerm } : {}),
            },
          },
        });

        periodConditions.push({
          course: {
            ...(query.academicYear ? { academicYear: query.academicYear } : {}),
            ...(query.academicTerm ? { academicTerm: query.academicTerm } : {}),
          },
        });

        where.AND.push({ OR: periodConditions });
      }

      const assessments = await this.prisma.assessment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          teacher: {
            select: { id: true, user: { select: { fullName: true } } },
          },
          group: { select: { id: true, name: true, academicYear: true, academicTerm: true } },
          targetGroups: { select: { id: true, name: true, academicYear: true, academicTerm: true } },
          course: { select: { id: true, title: true, academicYear: true, academicTerm: true } },
          _count: { select: { questions: true, submissions: true } },
          ...(targetStudentId
            ? {
                submissions: {
                  where: { studentId: targetStudentId },
                  select: {
                    id: true,
                    status: true,
                    scoreObtained: true,
                    submittedAt: true,
                  },
                },
              }
            : {}),
        },
      });

      if (user.role === UserRole.STUDENT || user.role === UserRole.PARENT) {
        await this.maybeApplyEffectiveDueDates(assessments as any[]);
      }

      return CursorPaginationHelper.formatResponse(assessments, limit);
    }, 25);
  }

  private async maybeApplyEffectiveDueDates(assessments: any[]) {
    const groupIds = [
      ...new Set(
        assessments
          .filter((a) => a?.type === 'ASSIGNMENT' && a.dueDate && (a.groupId || a.targetGroups?.[0]?.id))
          .map((a) => a.groupId || a.targetGroups?.[0]?.id),
      ),
    ];
    if (groupIds.length === 0) return;

    const cacheKey = `sessions:${groupIds.sort().join(',')}`;
    const sessions = await this.groupSessionsCache.getOrSet(cacheKey, async () => {
      return this.prisma.lessonSession.findMany({
        where: { groupId: { in: groupIds } },
        select: {
          groupId: true,
          sessionDate: true,
          startTime: true,
          endTime: true,
          isCancelled: true,
        },
        orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
      });
    }, 60);

    for (const a of assessments) {
      const gId = a?.groupId || a?.targetGroups?.[0]?.id;
      if (a?.type !== 'ASSIGNMENT' || !a.dueDate || !gId) continue;
      const groupSessions: SessionForDeadline[] = sessions.filter(
        (s) => s.groupId === gId,
      );
      a.dueDate = computeEffectiveDueDate(a.type, a.dueDate, groupSessions);
    }
  }

  async resolveEffectiveDueDate(
    assessment: { type: string; dueDate: Date | null; groupId?: string | null; targetGroups?: any[] },
  ): Promise<Date | null> {
    const effectiveGroupId = assessment.groupId || assessment.targetGroups?.[0]?.id;
    if (assessment.type !== 'ASSIGNMENT' || !assessment.dueDate || !effectiveGroupId) {
      return assessment.dueDate;
    }
    const sessions = await this.prisma.lessonSession.findMany({
      where: { groupId: effectiveGroupId },
      select: {
        sessionDate: true,
        startTime: true,
        endTime: true,
        isCancelled: true,
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });
    return computeEffectiveDueDate(assessment.type, assessment.dueDate, sessions);
  }
}
