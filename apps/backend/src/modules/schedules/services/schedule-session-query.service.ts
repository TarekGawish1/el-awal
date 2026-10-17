import {
  Injectable,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { assertGroupAccess } from '../helpers/schedule-access.helper';
import { ScheduleGeneratorService } from './schedule-generator.service';

@Injectable()
export class ScheduleSessionQueryService {
  private readonly logger = new Logger(ScheduleSessionQueryService.name);
  private readonly autoEnsureCache = new MemoryCache<boolean>(300, 50);

  constructor(
    private readonly prisma: PrismaService,
    private readonly generatorService: ScheduleGeneratorService,
  ) {}

  /**
   * Retrieves all physical LessonSession records for an academic group.
   */
  async getGroupSessions(groupId: string, user: AuthenticatedUser) {
    await assertGroupAccess(this.prisma, groupId, user, false);

    return this.prisma.lessonSession.findMany({
      where: { groupId },
      orderBy: [{ sessionDate: 'desc' }, { startTime: 'desc' }],
      include: {
        group: { select: { id: true, name: true, gradeLevel: true, academicYear: true, academicTerm: true } },
        schedule: { select: { id: true, location: true } },
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
        _count: {
          select: { attendanceRecords: true, educationalContents: true },
        },
      },
    });
  }

  /**
   * Retrieves teacher's physical lesson sessions with comprehensive filtering (timeline, calendar, past, upcoming).
   * Automatically synchronizes and populates recurring group sessions across the semester.
   */
  async getTeacherSessions(
    user: AuthenticatedUser,
    params?: {
      groupId?: string;
      gradeLevel?: string;
      academicYear?: string;
      academicTerm?: string;
      startDate?: string;
      endDate?: string;
      timeframe?: 'PAST' | 'TODAY' | 'UPCOMING' | 'ALL';
      search?: string;
    },
  ) {
    let effectiveTeacherProfileId = user.teacherProfileId;
    if (user.role === UserRole.SECRETARIAT) {
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: user.id, status: 'ACTIVE' },
        select: { teacherId: true },
      });
      if (link) {
        effectiveTeacherProfileId = link.teacherId;
      } else {
        throw new ForbiddenException('لا يوجد ارتباط نشط كمعاون مع أي معلم');
      }
    } else if (!effectiveTeacherProfileId) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { OR: [{ id: user.id }, { user: { id: user.id } }] },
        select: { id: true },
      });
      effectiveTeacherProfileId = teacher?.id || user.id;
    }

    const teacherWhereCondition = {
      OR: [
        { teacherId: effectiveTeacherProfileId },
        { teacher: { id: effectiveTeacherProfileId } },
        { teacher: { user: { id: effectiveTeacherProfileId } } },
      ],
    };

    const {
      groupId,
      gradeLevel,
      academicYear,
      academicTerm,
      startDate,
      endDate,
      timeframe = 'ALL',
      search,
    } = params || {};

    // Auto-ensure semester sessions are created for teacher's active groups (throttled to 5 mins via in-memory cache)
    const ensureCacheKey = `ensure_${effectiveTeacherProfileId || user.id}_${groupId || 'ALL'}_${academicYear || 'ALL'}_${academicTerm || 'ALL'}`;
    if (!this.autoEnsureCache.get(ensureCacheKey)) {
      try {
        const teacherGroups = await this.prisma.academicGroup.findMany({
          where: {
            isActive: true,
            ...teacherWhereCondition,
            ...(groupId && groupId !== 'ALL' ? { id: groupId } : {}),
            ...(gradeLevel && gradeLevel !== 'ALL' ? { gradeLevel } : {}),
            ...(academicYear && academicYear !== 'ALL' ? { academicYear } : {}),
            ...(academicTerm && academicTerm !== 'ALL' ? { academicTerm } : {}),
          },
          include: {
            schedules: true,
          },
        });

        if (teacherGroups.length > 0) {
          await this.generatorService.autoEnsureSemesterSessionsForGroups(teacherGroups, academicYear, academicTerm);
        }
        this.autoEnsureCache.set(ensureCacheKey, true);
      } catch (err: any) {
        this.logger.warn(`Could not auto-ensure semester sessions: ${err?.message}`);
      }
    }

    const where: any = {
      group: {
        ...teacherWhereCondition,
      },
    };

    if (groupId && groupId !== 'ALL') {
      where.groupId = groupId;
    }
    if (gradeLevel && gradeLevel !== 'ALL') {
      where.group.gradeLevel = gradeLevel;
    }
    if (academicYear && academicYear !== 'ALL') {
      where.group.academicYear = academicYear;
    }
    if (academicTerm && academicTerm !== 'ALL') {
      where.group.academicTerm = academicTerm;
    }
    if (search && search.trim()) {
      where.OR = [
        { topic: { contains: search.trim(), mode: 'insensitive' } },
        { group: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const today = new Date();
    const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    if (timeframe === 'TODAY') {
      where.sessionDate = todayDate;
    } else if (timeframe === 'PAST') {
      where.sessionDate = { lt: todayDate };
    } else if (timeframe === 'UPCOMING') {
      where.sessionDate = { gte: todayDate };
    } else if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) where.sessionDate.lte = new Date(endDate);
    }

    const orderBy =
      timeframe === 'PAST'
        ? [{ sessionDate: 'desc' as const }, { startTime: 'desc' as const }]
        : [{ sessionDate: 'asc' as const }, { startTime: 'asc' as const }];

    return this.prisma.lessonSession.findMany({
      where,
      orderBy,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            academicYear: true,
            academicTerm: true,
          },
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
        _count: {
          select: {
            attendanceRecords: true,
            educationalContents: true,
          },
        },
      },
    });
  }

  /**
   * Returns distinct session topics stored in the database for the teacher.
   */
  async getTeacherSessionTopics(user: AuthenticatedUser, gradeLevel?: string, groupId?: string) {
    const teacherId = user.teacherProfileId || user.id;

    const where: any = {
      group: {
        OR: [{ teacherId }, { teacher: { id: teacherId } }],
      },
      topic: { not: null },
    };

    if (groupId && groupId !== 'ALL') where.groupId = groupId;
    if (gradeLevel && gradeLevel !== 'ALL') where.group.gradeLevel = gradeLevel;

    const sessions = await this.prisma.lessonSession.findMany({
      where,
      select: { topic: true },
      distinct: ['topic'],
      orderBy: { topic: 'asc' },
    });

    const contentTopics = await this.prisma.educationalContent.findMany({
      where: {
        teacherId,
        sessionTopic: { not: null },
        ...(gradeLevel && gradeLevel !== 'ALL' ? { gradeLevel } : {}),
        ...(groupId && groupId !== 'ALL' ? { groupId } : {}),
      },
      select: { sessionTopic: true },
      distinct: ['sessionTopic'],
    });

    const set = new Set<string>();
    sessions.forEach((s) => s.topic && set.add(s.topic.trim()));
    contentTopics.forEach((c) => c.sessionTopic && set.add(c.sessionTopic.trim()));

    return Array.from(set).filter(Boolean);
  }
}
