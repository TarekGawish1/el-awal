import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a recurring weekly timetable rule for an academic group.
   */
  async createSchedule(dto: CreateScheduleDto) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${dto.groupId}] not found`);
    }

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
  async getGroupSchedules(groupId: string) {
    return this.prisma.lessonSchedule.findMany({
      where: { groupId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Deletes a recurring timetable rule.
   */
  async deleteSchedule(scheduleId: string) {
    const schedule = await this.prisma.lessonSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Lesson schedule [${scheduleId}] not found`);
    }

    return this.prisma.lessonSchedule.delete({
      where: { id: scheduleId },
    });
  }

  /**
   * Generates physical LessonSession instances from recurring schedules across a date window.
   */
  async generateSessionsFromSchedule(groupId: string, dto: GenerateSessionsDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: { schedules: true },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    if (group.schedules.length === 0) {
      throw new BadRequestException(`Group [${group.name}] has no recurring schedules defined`);
    }

    const createdSessions = [];

    await this.prisma.$transaction(async (tx) => {
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay(); // 0 = Sunday .. 6 = Saturday
        const matchingSchedules = group.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

        for (const schedule of matchingSchedules) {
          const sessionDateOnly = new Date(
            Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()),
          );

          // Check if session already exists for this group, date, and start time
          const existing = await tx.lessonSession.findFirst({
            where: {
              groupId,
              sessionDate: sessionDateOnly,
              startTime: schedule.startTime,
            },
          });

          if (!existing) {
            const dateStr = sessionDateOnly.toISOString().split('T')[0];
            const topic = `${dto.topicPrefix || 'حصة'} - ${dateStr}`;

            const session = await tx.lessonSession.create({
              data: {
                groupId,
                scheduleId: schedule.id,
                sessionDate: sessionDateOnly,
                startTime: schedule.startTime,
                topic,
              },
            });
            createdSessions.push(session);
          }
        }

        current.setDate(current.getDate() + 1);
      }
    });

    this.logger.log(`Generated ${createdSessions.length} sessions for group [${groupId}]`);

    return {
      groupId,
      groupName: group.name,
      generatedCount: createdSessions.length,
      sessions: createdSessions,
    };
  }
}
