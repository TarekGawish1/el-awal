import {
  Injectable,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { assertGroupAccess } from '../helpers/schedule-access.helper';
import {
  hashKeyToBigInt,
  getSemesterDateWindow,
} from '../helpers/schedule-time.helper';
import { ScheduleTimetableService } from './schedule-timetable.service';

@Injectable()
export class ScheduleGeneratorService {
  private readonly logger = new Logger(ScheduleGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timetableService: ScheduleTimetableService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  getSemesterDateWindow(
    academicYear?: string,
    academicTerm?: string,
  ): { startDate: Date; endDate: Date } {
    return getSemesterDateWindow(academicYear, academicTerm);
  }

  /**
   * Generates physical LessonSession instances from recurring schedules across a date window.
   */
  async generateSessionsFromSchedule(
    groupId: string,
    dto: GenerateSessionsDto,
    user: AuthenticatedUser,
  ) {
    const group = await assertGroupAccess(this.prisma, groupId, user, true);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const groupWithSchedules = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: { schedules: true },
    });

    if (!groupWithSchedules || groupWithSchedules.schedules.length === 0) {
      throw new BadRequestException(
        `Group [${group.name}] has no recurring schedules defined`,
      );
    }

    const createdSessions: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      const existingSessions = await tx.lessonSession.findMany({
        where: {
          groupId,
          sessionDate: {
            gte: new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())),
            lte: new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)),
          },
        },
        select: { sessionDate: true, startTime: true },
      });

      const existingSet = new Set(
        existingSessions.map((s) => `${s.sessionDate.toISOString().split('T')[0]}_${s.startTime}`),
      );

      const sessionsToCreate: any[] = [];
      const current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        const matchingSchedules = groupWithSchedules.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

        for (const schedule of matchingSchedules) {
          const sessionDateOnly = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
          const dateStr = sessionDateOnly.toISOString().split('T')[0];
          const key = `${dateStr}_${schedule.startTime}`;

          if (!existingSet.has(key)) {
            existingSet.add(key);
            const topic = `${dto.topicPrefix || 'حصة'} - ${dateStr}`;
            sessionsToCreate.push({
              groupId,
              scheduleId: schedule.id,
              sessionDate: sessionDateOnly,
              startTime: schedule.startTime,
              endTime: schedule.endTime || null,
              topic,
            });
          }
        }
        current.setDate(current.getDate() + 1);
      }

      if (sessionsToCreate.length > 0) {
        await tx.lessonSession.createMany({
          data: sessionsToCreate,
          skipDuplicates: true,
        });
        const newlyCreated = await tx.lessonSession.findMany({
          where: {
            groupId,
            sessionDate: {
              gte: new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())),
              lte: new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)),
            },
          },
          orderBy: { sessionDate: 'asc' },
        });
        createdSessions.push(...newlyCreated);
      }
    });

    this.logger.log(`Generated ${createdSessions.length} sessions for group [${groupId}]`);
    await this.timetableService.invalidateScheduleCaches();

    return {
      groupId,
      groupName: group.name,
      totalGenerated: createdSessions.length,
      sessions: createdSessions,
    };
  }

  /**
   * Auto-ensures physical LessonSession records exist for all recurring schedules across the semester.
   */
  async autoEnsureSemesterSessionsForGroups(
    groupsWithSchedules: Array<{
      id: string;
      name: string;
      academicYear?: string | null;
      academicTerm?: string | null;
      schedules: Array<{
        id: string;
        dayOfWeek: number;
        startTime: string;
        endTime?: string | null;
      }>;
    }>,
    targetYear?: string,
    targetTerm?: string,
  ) {
    if (!groupsWithSchedules || groupsWithSchedules.length === 0) return;

    const eligibleGroups = groupsWithSchedules.filter((g) => g.schedules && g.schedules.length > 0);
    if (eligibleGroups.length === 0) return;

    const groupIds = eligibleGroups.map((g) => g.id);
    const lockKeyStr = 'auto_ensure_' + groupIds.slice().sort().join(':');
    const lockKey = hashKeyToBigInt(lockKeyStr);

    const executeSweep = async (tx: any) => {
      if (typeof tx.$queryRaw === 'function') {
        try {
          const lockResult = await tx.$queryRaw<Array<{ locked: boolean }>>`
            SELECT pg_try_advisory_xact_lock(${lockKey}) AS locked
          `;
          if (lockResult && lockResult.length > 0 && lockResult[0].locked === false) {
            this.logger.debug(
              `Concurrent auto-ensure sweep skipped for groups [${groupIds.join(', ')}] - advisory lock held by another process`,
            );
            return;
          }
        } catch (lockErr: any) {
          this.logger.warn(`Advisory lock check bypassed: ${lockErr?.message}`);
        }
      }

      const existingSessions = await tx.lessonSession.findMany({
        where: { groupId: { in: groupIds } },
        select: { groupId: true, sessionDate: true, startTime: true },
      });

      const existingSessionsByGroup = new Map<string, Set<string>>();
      for (const s of existingSessions) {
        let set = existingSessionsByGroup.get(s.groupId);
        if (!set) {
          set = new Set<string>();
          existingSessionsByGroup.set(s.groupId, set);
        }
        const dStr = s.sessionDate.toISOString().split('T')[0];
        set.add(`${dStr}_${s.startTime || ''}`);
      }

      const allSessionsToCreate: Array<{
        groupId: string;
        scheduleId: string;
        sessionDate: Date;
        startTime: string;
        endTime: string | null;
        topic: string;
      }> = [];

      for (const group of eligibleGroups) {
        const year = group.academicYear || targetYear || '2026-2027';
        const term = group.academicTerm || targetTerm || 'FIRST_TERM';
        const { startDate, endDate } = this.getSemesterDateWindow(year, term);

        const existingSet = existingSessionsByGroup.get(group.id) || new Set<string>();

        const current = new Date(startDate);
        while (current <= endDate) {
          const dayOfWeek = current.getUTCDay();
          const matchingSchedules = group.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

          for (const schedule of matchingSchedules) {
            const sessionDateOnly = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));
            const dateStr = sessionDateOnly.toISOString().split('T')[0];
            const key = `${dateStr}_${schedule.startTime || ''}`;

            if (!existingSet.has(key)) {
              existingSet.add(key);
              allSessionsToCreate.push({
                groupId: group.id,
                scheduleId: schedule.id,
                sessionDate: sessionDateOnly,
                startTime: schedule.startTime,
                endTime: schedule.endTime || null,
                topic: `حصة - ${dateStr}`,
              });
            }
          }
          current.setUTCDate(current.getUTCDate() + 1);
        }
      }

      if (allSessionsToCreate.length > 0) {
        await tx.lessonSession.createMany({
          data: allSessionsToCreate,
          skipDuplicates: true,
        });
        this.logger.log(`Auto-populated ${allSessionsToCreate.length} semester sessions for ${eligibleGroups.length} groups`);
      }
    };

    if (typeof this.prisma.$transaction === 'function') {
      await this.prisma.$transaction(executeSweep);
    } else {
      await executeSweep(this.prisma);
    }
  }

  /**
   * Retrieves today's physical sessions and auto-generates any missing recurring sessions.
   */
  async getTodaySessionsWithAutoGenerate(
    user: AuthenticatedUser,
    academicStage?: string,
    gradeLevel?: string,
    academicYear?: string,
    academicTerm?: string,
  ) {
    const cacheKey = `schedules:today:${user.id}:${academicYear || 'all'}:${academicTerm || 'all'}:${gradeLevel || 'all'}:${academicStage || 'all'}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const today = new Date();
    const sessionDateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dayOfWeek = today.getDay();

    const whereGroup: any = { isActive: true };

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      whereGroup.OR = [{ teacherId }, { teacher: { id: teacherId } }];

      if (!academicYear || !academicTerm) {
        const profile = await this.prisma.teacherProfile.findUnique({
          where: { id: teacherId },
          select: { activeAcademicYear: true, activeAcademicTerm: true },
        });
        if (!academicYear && profile?.activeAcademicYear) {
          academicYear = profile.activeAcademicYear;
        }
        if (!academicTerm && profile?.activeAcademicTerm) {
          academicTerm = profile.activeAcademicTerm;
        }
      }
    }

    if (gradeLevel) whereGroup.gradeLevel = gradeLevel;
    if (academicYear) whereGroup.academicYear = academicYear;
    if (academicTerm) whereGroup.academicTerm = academicTerm;

    const whereRecurringGroup = {
      ...whereGroup,
      schedules: {
        some: { dayOfWeek },
      },
    };

    const groupsWithSchedules = await this.prisma.academicGroup.findMany({
      where: whereRecurringGroup,
      include: {
        schedules: {
          where: { dayOfWeek },
        },
      },
    });

    if (groupsWithSchedules.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const groupIds = groupsWithSchedules.map((g) => g.id);
        const existingSessions = await tx.lessonSession.findMany({
          where: {
            groupId: { in: groupIds },
            sessionDate: sessionDateOnly,
          },
          select: { groupId: true, startTime: true },
        });

        const existingSet = new Set(
          existingSessions.map((s) => `${s.groupId}_${s.startTime}`),
        );

        const sessionsToCreate: any[] = [];
        const dateStr = sessionDateOnly.toISOString().split('T')[0];
        const topic = `حصة ${dateStr}`;

        for (const group of groupsWithSchedules) {
          for (const schedule of group.schedules) {
            const key = `${group.id}_${schedule.startTime}`;
            if (!existingSet.has(key)) {
              existingSet.add(key);
              sessionsToCreate.push({
                groupId: group.id,
                scheduleId: schedule.id,
                sessionDate: sessionDateOnly,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                topic,
              });
            }
          }
        }

        if (sessionsToCreate.length > 0) {
          await tx.lessonSession.createMany({
            data: sessionsToCreate,
            skipDuplicates: true,
          });
        }
      });
    }

    const todaySessions = await this.prisma.lessonSession.findMany({
      where: {
        group: whereGroup,
        sessionDate: sessionDateOnly,
        isCancelled: false,
      },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true, academicYear: true, academicTerm: true } },
        _count: { select: { attendanceRecords: true, educationalContents: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, todaySessions, 120);
    }

    return todaySessions;
  }
}
