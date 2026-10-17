import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { assertGroupAccess } from '../helpers/schedule-access.helper';
import { doTimeIntervalsOverlap } from '../helpers/schedule-time.helper';
import { ScheduleTimetableService } from './schedule-timetable.service';

@Injectable()
export class ScheduleSessionCrudService {
  private readonly logger = new Logger(ScheduleSessionCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timetableService: ScheduleTimetableService,
  ) {}

  /**
   * Creates or updates a physical LessonSession for an academic group with collision validation.
   */
  async createSingleSession(dto: CreateSessionDto, user: AuthenticatedUser) {
    await assertGroupAccess(this.prisma, dto.groupId, user, true);

    const sessionDateOnly = new Date(
      dto.sessionDate.includes('T') ? dto.sessionDate.split('T')[0] : dto.sessionDate,
    );

    // Find if there is an active (non-cancelled) session for this group at this exact date and time.
    const existing = await this.prisma.lessonSession.findFirst({
      where: {
        groupId: dto.groupId,
        sessionDate: sessionDateOnly,
        startTime: dto.startTime || null,
        isCancelled: false,
      },
    });

    // Prevent adding more than one session for the same group on the same day.
    if (!dto.isCancelled) {
      const sameDaySession = await this.prisma.lessonSession.findFirst({
        where: {
          groupId: dto.groupId,
          sessionDate: sessionDateOnly,
          isCancelled: false,
          ...(existing ? { id: { not: existing.id } } : {}),
        },
        select: { id: true, topic: true, startTime: true },
      });

      if (sameDaySession) {
        throw new BadRequestException(
          `لا يمكن إضافة أكثر من حصة لنفس المجموعة في نفس اليوم: توجد بالفعل حصة (${sameDaySession.topic}) تبدأ الساعة (${sameDaySession.startTime || ''})`,
        );
      }
    }

    // Check for collisions with other non-cancelled sessions for this teacher on this day
    if (dto.startTime && !dto.isCancelled) {
      const teacherId = user.teacherProfileId || user.id;
      const daySessions = await this.prisma.lessonSession.findMany({
        where: {
          group: {
            OR: [
              { teacherId },
              { teacher: { id: teacherId } },
              { teacher: { user: { id: user.id } } },
            ],
          },
          sessionDate: sessionDateOnly,
          isCancelled: false,
          ...(existing ? { id: { not: existing.id } } : {}),
        },
        include: {
          group: { select: { name: true, gradeLevel: true } },
        },
      });

      for (const otherSession of daySessions) {
        if (
          doTimeIntervalsOverlap(
            dto.startTime,
            dto.endTime,
            otherSession.startTime,
            otherSession.endTime,
          )
        ) {
          const groupLabel = otherSession.group?.gradeLevel || otherSession.group?.name || 'مجموعة أخرى';
          const timeLabel = otherSession.startTime || '';
          throw new BadRequestException(
            `يوجد تعارض زمني: لديك بالفعل حصة مجدولة (${otherSession.topic}) لـ [${groupLabel}] تبدأ الساعة (${timeLabel}) في نفس هذا اليوم`,
          );
        }
      }
    }

    if (existing) {
      const updated = await this.prisma.lessonSession.update({
        where: { id: existing.id },
        data: {
          topic: dto.topic,
          endTime: dto.endTime !== undefined ? dto.endTime : existing.endTime,
          scheduleId: dto.scheduleId !== undefined ? dto.scheduleId : existing.scheduleId,
          isCancelled: dto.isCancelled !== undefined ? dto.isCancelled : false,
          cancellationReason:
            dto.isCancelled ? (dto.cancellationReason || existing.cancellationReason) : null,
        },
        include: {
          group: { select: { id: true, name: true, gradeLevel: true, academicYear: true, academicTerm: true } },
          _count: { select: { attendanceRecords: true, educationalContents: true } },
        },
      });
      await this.timetableService.invalidateScheduleCaches();
      return updated;
    }

    const created = await this.prisma.lessonSession.create({
      data: {
        id: dto.id || undefined,
        groupId: dto.groupId,
        sessionDate: sessionDateOnly,
        startTime: dto.startTime || null,
        endTime: dto.endTime || null,
        topic: dto.topic,
        scheduleId: dto.scheduleId || null,
        isCancelled: dto.isCancelled || false,
        cancellationReason: dto.cancellationReason || null,
      },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true, academicYear: true, academicTerm: true } },
        _count: { select: { attendanceRecords: true, educationalContents: true } },
      },
    });

    await this.timetableService.invalidateScheduleCaches();
    return created;
  }

  /**
   * Updates an existing physical lesson session with collision validation.
   */
  async updateSession(sessionId: string, dto: UpdateSessionDto, user: AuthenticatedUser) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    await assertGroupAccess(this.prisma, session.groupId, user, true);

    if (dto.groupId && dto.groupId !== session.groupId) {
      await assertGroupAccess(this.prisma, dto.groupId, user, true);
    }

    const sessionDateOnly = dto.sessionDate
      ? new Date(dto.sessionDate.includes('T') ? dto.sessionDate.split('T')[0] : dto.sessionDate)
      : session.sessionDate;

    const targetStartTime = dto.startTime !== undefined ? dto.startTime : session.startTime;
    const targetEndTime = dto.endTime !== undefined ? dto.endTime : session.endTime;
    const targetIsCancelled = dto.isCancelled !== undefined ? dto.isCancelled : session.isCancelled;
    const targetGroupId = dto.groupId || session.groupId;

    // Prevent moving/keeping a session on a day where the same group already has another session.
    if (!targetIsCancelled) {
      const sameDaySession = await this.prisma.lessonSession.findFirst({
        where: {
          groupId: targetGroupId,
          sessionDate: sessionDateOnly,
          isCancelled: false,
          id: { not: sessionId },
        },
        select: { id: true, topic: true, startTime: true },
      });

      if (sameDaySession) {
        throw new BadRequestException(
          `لا يمكن تعديل الحصة: توجد بالفعل حصة أخرى (${sameDaySession.topic}) لنفس المجموعة في نفس اليوم تبدأ الساعة (${sameDaySession.startTime || ''})`,
        );
      }
    }

    // Check for collisions if active and moving or updating times
    if (targetStartTime && !targetIsCancelled) {
      const teacherId = user.teacherProfileId || user.id;
      const daySessions = await this.prisma.lessonSession.findMany({
        where: {
          group: {
            OR: [
              { teacherId },
              { teacher: { id: teacherId } },
              { teacher: { user: { id: user.id } } },
            ],
          },
          sessionDate: sessionDateOnly,
          isCancelled: false,
          id: { not: sessionId },
        },
        include: {
          group: { select: { name: true, gradeLevel: true } },
        },
      });

      for (const otherSession of daySessions) {
        if (
          doTimeIntervalsOverlap(
            targetStartTime,
            targetEndTime,
            otherSession.startTime,
            otherSession.endTime,
          )
        ) {
          const groupLabel = otherSession.group?.gradeLevel || otherSession.group?.name || 'مجموعة أخرى';
          const timeLabel = otherSession.startTime || '';
          throw new BadRequestException(
            `يوجد تعارض زمني: لديك بالفعل حصة مجدولة (${otherSession.topic}) لـ [${groupLabel}] تبدأ الساعة (${timeLabel}) في نفس هذا اليوم`,
          );
        }
      }
    }

    const updated = await this.prisma.lessonSession.update({
      where: { id: sessionId },
      data: {
        topic: dto.topic !== undefined ? dto.topic : session.topic,
        sessionDate: sessionDateOnly,
        startTime: dto.startTime !== undefined ? dto.startTime : session.startTime,
        endTime: dto.endTime !== undefined ? dto.endTime : session.endTime,
        groupId: dto.groupId || session.groupId,
        isCancelled: dto.isCancelled !== undefined ? dto.isCancelled : session.isCancelled,
        cancellationReason:
          dto.cancellationReason !== undefined
            ? dto.cancellationReason
            : dto.isCancelled === false
            ? null
            : session.cancellationReason,
      },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true, academicYear: true, academicTerm: true } },
        _count: { select: { attendanceRecords: true, educationalContents: true } },
      },
    });

    await this.timetableService.invalidateScheduleCaches();
    return updated;
  }

  /**
   * Deletes a physical lesson session.
   * Only allows deleting ad-hoc sessions added from the calendar (scheduleId === null).
   */
  async deleteSession(sessionId: string, user: AuthenticatedUser) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    await assertGroupAccess(this.prisma, session.groupId, user, true);

    if (session.scheduleId) {
      throw new BadRequestException(
        'لا يمكن حذف الحصص الأساسية المجدولة للمجموعة، يمكنك فقط إلغاء الحصة لهذا اليوم بدلاً من حذفها',
      );
    }

    const deleted = await this.prisma.lessonSession.delete({
      where: { id: sessionId },
    });

    await this.timetableService.invalidateScheduleCaches();
    return deleted;
  }
}
