import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole, GroupEnrollmentStatus } from '@prisma/client';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async assertGroupAccess(
    groupId: string,
    user: AuthenticatedUser,
    requireTeacherOwnership = false,
  ) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    if (user.role === UserRole.SECRETARIAT) {
      return group;
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (group.teacherId !== teacherId && group.teacherId !== user.id) {
        throw new ForbiddenException('You do not own this academic group');
      }
      return group;
    }

    if (requireTeacherOwnership) {
      throw new ForbiddenException('Only the group teacher or secretariat can perform this action');
    }

    if (user.role === UserRole.STUDENT) {
      const studentId = user.studentProfileId || user.id;
      const enrollment = await this.prisma.groupEnrollment.findUnique({
        where: {
          groupId_studentId: {
            groupId,
            studentId,
          },
        },
      });
      if (!enrollment || enrollment.status !== GroupEnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('You are not enrolled in this group');
      }
      return group;
    }

    if (user.role === UserRole.PARENT) {
      const parentId = user.parentProfileId || user.id;
      const childEnrollment = await this.prisma.groupEnrollment.findFirst({
        where: {
          groupId,
          status: GroupEnrollmentStatus.ACTIVE,
          student: {
            parentLinks: {
              some: { parentId },
            },
          },
        },
      });
      if (!childEnrollment) {
        throw new ForbiddenException('None of your linked children are enrolled in this group');
      }
      return group;
    }

    throw new ForbiddenException('Unauthorized access');
  }

  /**
   * Creates a recurring weekly timetable rule for an academic group.
   */
  async createSchedule(dto: CreateScheduleDto, user: AuthenticatedUser) {
    await this.assertGroupAccess(dto.groupId, user, true);

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
    await this.assertGroupAccess(groupId, user, false);

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

    await this.assertGroupAccess(schedule.groupId, user, true);

    return this.prisma.lessonSchedule.delete({
      where: { id: scheduleId },
    });
  }

  /**
   * Generates physical LessonSession instances from recurring schedules across a date window.
   */
  async generateSessionsFromSchedule(
    groupId: string,
    dto: GenerateSessionsDto,
    user: AuthenticatedUser,
  ) {
    const group = await this.assertGroupAccess(groupId, user, true);

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
      throw new BadRequestException(`Group [${group.name}] has no recurring schedules defined`);
    }

    const createdSessions = [];

    await this.prisma.$transaction(async (tx) => {
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay(); // 0 = Sunday .. 6 = Saturday
        const matchingSchedules = groupWithSchedules.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

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
