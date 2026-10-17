import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { assertGroupAccess } from '../helpers/schedule-access.helper';
import { doTimeIntervalsOverlap } from '../helpers/schedule-time.helper';

@Injectable()
export class ScheduleTimetableService {
  private readonly logger = new Logger(ScheduleTimetableService.name);
  private readonly publicSchedulesCache = new MemoryCache(120, 10);
  private readonly autoEnsureCache = new MemoryCache<boolean>(300, 50);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  async invalidateScheduleCaches() {
    this.publicSchedulesCache.clear();
    this.autoEnsureCache.clear();
    if (this.redisCache) {
      try {
        await Promise.all([
          this.redisCache.delPattern('schedules:*'),
          this.redisCache.delPattern('groups:*'),
          this.redisCache.delPattern('student:dashboard:*'),
          this.redisCache.delPattern('parent:overview:*'),
          this.redisCache.delPattern('parent:dashboard:*'),
        ]);
      } catch (err) {
        this.logger.warn(`Failed to invalidate schedule caches: ${err}`);
      }
    }
  }

  /**
   * Creates a recurring weekly timetable rule for an academic group with collision validation.
   */
  async createSchedule(dto: CreateScheduleDto, user: AuthenticatedUser) {
    await assertGroupAccess(this.prisma, dto.groupId, user, true);

    const teacherId = user.teacherProfileId || user.id;
    const existingSchedules = await this.prisma.lessonSchedule.findMany({
      where: {
        group: {
          OR: [
            { teacherId },
            { teacher: { id: teacherId } },
            { teacher: { user: { id: user.id } } },
          ],
        },
        dayOfWeek: dto.dayOfWeek,
      },
      include: {
        group: { select: { name: true, gradeLevel: true } },
      },
    });

    for (const s of existingSchedules) {
      if (
        doTimeIntervalsOverlap(
          dto.startTime,
          dto.endTime,
          s.startTime,
          s.endTime,
        )
      ) {
        const groupLabel =
          s.group?.gradeLevel || s.group?.name || 'مجموعة أخرى';
        throw new BadRequestException(
          `يوجد تعارض في المواعيد الأسبوعية: لديك بالفعل موعد لمجموعة [${groupLabel}] في نفس التوقيت (${s.startTime} - ${s.endTime || ''})`,
        );
      }
    }

    await this.invalidateScheduleCaches();
    return this.prisma.lessonSchedule.create({
      data: {
        groupId: dto.groupId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        location: dto.location,
      },
    });
  }

  /**
   * Lists all weekly recurring schedules for an academic group.
   */
  async getGroupSchedules(groupId: string, user: AuthenticatedUser) {
    await assertGroupAccess(this.prisma, groupId, user, false);

    const cacheKey = `schedules:group:${groupId}`;
    if (this.redisCache) {
      return this.redisCache.getOrSet(
        cacheKey,
        async () => {
          return this.prisma.lessonSchedule.findMany({
            where: { groupId },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          });
        },
        600,
      );
    }

    return this.prisma.lessonSchedule.findMany({
      where: { groupId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Deletes a recurring timetable rule.
   */
  async deleteSchedule(scheduleId: string, user: AuthenticatedUser) {
    const schedule = await this.prisma.lessonSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Lesson schedule [${scheduleId}] not found`);
    }

    await assertGroupAccess(this.prisma, schedule.groupId, user, true);

    await this.invalidateScheduleCaches();
    return this.prisma.lessonSchedule.delete({
      where: { id: scheduleId },
    });
  }

  /**
   * Returns public schedules aggregated across all active groups.
   */
  async getPublicCenterSchedules() {
    const cacheKey = 'schedules:public_center';
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.publicSchedulesCache.getOrSet(
      'public_center_schedules',
      async () => {
        const groups = await this.prisma.academicGroup.findMany({
          where: {
            isActive: true,
          },
          include: {
            schedules: {
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            },
          },
        });

        const dayMap = [
          'الأحد',
          'الإثنين',
          'الثلاثاء',
          'الأربعاء',
          'الخميس',
          'الجمعة',
          'السبت',
        ];

        return groups
          .filter((g) => g.schedules.length > 0)
          .map((group) => {
            const locationSchedules: Record<
              string,
              { days: Set<string>; time: string }
            > = {};

            group.schedules.forEach((schedule) => {
              const loc = schedule.location || 'سنتر';
              if (!locationSchedules[loc]) {
                locationSchedules[loc] = {
                  days: new Set<string>(),
                  time: schedule.startTime,
                };
              }
              locationSchedules[loc].days.add(dayMap[schedule.dayOfWeek]);
            });

            const formattedSchedules = Object.keys(locationSchedules).map(
              (loc) => {
                const daysArray = Array.from(locationSchedules[loc].days);
                let daysStr = daysArray.join(' و ');
                if (daysArray.length > 2) {
                  daysStr =
                    daysArray.slice(0, -1).join(' و ') +
                    ' و ' +
                    daysArray.slice(-1);
                }
                return {
                  center: loc,
                  days: daysStr,
                  time: locationSchedules[loc].time,
                };
              },
            );

            return {
              groupId: group.id,
              groupName: group.name,
              gradeLevel: group.gradeLevel,
              schedules: formattedSchedules,
            };
          });
      },
    );

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, result, 86400);
    }

    return result;
  }
}
