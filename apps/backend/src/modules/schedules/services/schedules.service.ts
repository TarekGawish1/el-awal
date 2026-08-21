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
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
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

  private parseTimeToMinutes(timeStr?: string | null): number | null {
    if (!timeStr) return null;
    const clean = timeStr.trim();
    if (clean.includes('م') || clean.includes('ص')) {
      const match = clean.match(/(\d{1,2}):(\d{2})\s*(م|ص)?/);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const isPM = match[3] === 'م';
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return h * 60 + m;
    }
    const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const meridian = match[3]?.toUpperCase();
    if (meridian === 'PM' && h < 12) h += 12;
    if (meridian === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  private doTimeIntervalsOverlap(
    startA?: string | null,
    endA?: string | null,
    startB?: string | null,
    endB?: string | null,
  ): boolean {
    const sA = this.parseTimeToMinutes(startA);
    const sB = this.parseTimeToMinutes(startB);
    if (sA === null || sB === null) return false;

    let eA = this.parseTimeToMinutes(endA);
    let eB = this.parseTimeToMinutes(endB);
    if (eA === null || eA <= sA) eA = sA + 90;
    if (eB === null || eB <= sB) eB = sB + 90;

    return sA < eB && sB < eA;
  }

  /**
   * Creates a recurring weekly timetable rule for an academic group with collision validation.
   */
  async createSchedule(dto: CreateScheduleDto, user: AuthenticatedUser) {
    await this.assertGroupAccess(dto.groupId, user, true);

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
      if (this.doTimeIntervalsOverlap(dto.startTime, dto.endTime, s.startTime, s.endTime)) {
        const groupLabel = s.group?.gradeLevel || s.group?.name || 'مجموعة أخرى';
        throw new BadRequestException(
          `يوجد تعارض في المواعيد الأسبوعية: لديك بالفعل موعد لمجموعة [${groupLabel}] في نفس التوقيت (${s.startTime} - ${s.endTime || ''})`,
        );
      }
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
                endTime: schedule.endTime || null,
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
      totalGenerated: createdSessions.length,
      sessions: createdSessions,
    };
  }

  /**
   * Retrieves all physical LessonSession records for an academic group.
   */
  async getGroupSessions(groupId: string, user: AuthenticatedUser) {
    await this.assertGroupAccess(groupId, user, false);

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
   * Computes UTC date boundaries for a given academic year and semester/term.
   * FIRST_TERM: Aug 1 to Jan 31
   * SECOND_TERM: Feb 1 to Jul 31
   */
  getSemesterDateWindow(academicYear?: string, academicTerm?: string): { startDate: Date; endDate: Date } {
    let startYear = 2026;
    let endYear = 2027;

    if (academicYear && academicYear.includes('-')) {
      const parts = academicYear.split('-');
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      if (!isNaN(y1)) startYear = y1;
      if (!isNaN(y2)) endYear = y2;
      else endYear = startYear + 1;
    }

    if (academicTerm === 'FIRST_TERM') {
      return {
        startDate: new Date(Date.UTC(startYear, 7, 1)), // Aug 1
        endDate: new Date(Date.UTC(endYear, 0, 31)), // Jan 31
      };
    }

    if (academicTerm === 'SECOND_TERM') {
      return {
        startDate: new Date(Date.UTC(endYear, 1, 1)), // Feb 1
        endDate: new Date(Date.UTC(endYear, 6, 31)), // Jul 31
      };
    }

    // Default: full academic year (Aug 1 to Jul 31)
    return {
      startDate: new Date(Date.UTC(startYear, 7, 1)),
      endDate: new Date(Date.UTC(endYear, 6, 31)),
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

    for (const group of eligibleGroups) {
      const year = group.academicYear || targetYear || '2026-2027';
      const term = group.academicTerm || targetTerm || 'FIRST_TERM';
      const { startDate, endDate } = this.getSemesterDateWindow(year, term);

      // Find existing sessions for this group in the date window
      const existingSessions = await this.prisma.lessonSession.findMany({
        where: {
          groupId: group.id,
          sessionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          sessionDate: true,
          startTime: true,
        },
      });

      const existingSet = new Set<string>();
      existingSessions.forEach((s) => {
        const dStr = s.sessionDate.toISOString().split('T')[0];
        existingSet.add(`${dStr}_${s.startTime || ''}`);
      });

      const sessionsToCreate: Array<{
        groupId: string;
        scheduleId: string;
        sessionDate: Date;
        startTime: string;
        endTime: string | null;
        topic: string;
      }> = [];

      const current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = current.getUTCDay(); // 0 = Sunday .. 6 = Saturday
        const matchingSchedules = group.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

        for (const schedule of matchingSchedules) {
          const sessionDateOnly = new Date(
            Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()),
          );
          const dateStr = sessionDateOnly.toISOString().split('T')[0];
          const key = `${dateStr}_${schedule.startTime || ''}`;

          if (!existingSet.has(key)) {
            existingSet.add(key);
            sessionsToCreate.push({
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

      if (sessionsToCreate.length > 0) {
        await this.prisma.lessonSession.createMany({
          data: sessionsToCreate,
          skipDuplicates: true,
        });
        this.logger.log(
          `Auto-populated ${sessionsToCreate.length} semester sessions for group [${group.name}] (${year} - ${term})`,
        );
      }
    }
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
    let teacherProfile = user.teacherProfileId
      ? await this.prisma.teacherProfile.findUnique({ where: { id: user.teacherProfileId } })
      : await this.prisma.teacherProfile.findFirst({ where: { user: { id: user.id } } });

    if (!teacherProfile && user.role === UserRole.TEACHER) {
      teacherProfile = await this.prisma.teacherProfile.findFirst();
    }

    const effectiveTeacherProfileId = teacherProfile?.id || user.teacherProfileId || user.id;
    const teacherWhereCondition =
      user.role === UserRole.SECRETARIAT
        ? {}
        : {
            OR: [
              { teacherId: effectiveTeacherProfileId },
              { teacher: { id: effectiveTeacherProfileId } },
              { teacher: { user: { id: user.id } } },
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

    // Auto-ensure semester sessions are created for teacher's active groups
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
        await this.autoEnsureSemesterSessionsForGroups(teacherGroups, academicYear, academicTerm);
      }
    } catch (err: any) {
      this.logger.warn(`Could not auto-ensure semester sessions: ${err?.message}`);
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
   * Creates or updates a physical LessonSession for an academic group with collision validation.
   */
  async createSingleSession(dto: CreateSessionDto, user: AuthenticatedUser) {
    await this.assertGroupAccess(dto.groupId, user, true);

    const sessionDateOnly = new Date(
      dto.sessionDate.includes('T') ? dto.sessionDate.split('T')[0] : dto.sessionDate,
    );

    // Find if there is an active (non-cancelled) session for this group at this exact date and time.
    // If an existing session is cancelled, we do NOT overwrite it, so the cancelled session remains visible beside the new replacement session.
    const existing = await this.prisma.lessonSession.findFirst({
      where: {
        groupId: dto.groupId,
        sessionDate: sessionDateOnly,
        startTime: dto.startTime || null,
        isCancelled: false,
      },
    });

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
          this.doTimeIntervalsOverlap(
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
      return this.prisma.lessonSession.update({
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
    }

    return this.prisma.lessonSession.create({
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

    await this.assertGroupAccess(session.groupId, user, true);

    if (dto.groupId && dto.groupId !== session.groupId) {
      await this.assertGroupAccess(dto.groupId, user, true);
    }

    const sessionDateOnly = dto.sessionDate
      ? new Date(dto.sessionDate.includes('T') ? dto.sessionDate.split('T')[0] : dto.sessionDate)
      : session.sessionDate;

    const targetStartTime = dto.startTime !== undefined ? dto.startTime : session.startTime;
    const targetEndTime = dto.endTime !== undefined ? dto.endTime : session.endTime;
    const targetIsCancelled = dto.isCancelled !== undefined ? dto.isCancelled : session.isCancelled;

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
          this.doTimeIntervalsOverlap(
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

    return this.prisma.lessonSession.update({
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
  }

  /**
   * Deletes a physical lesson session.
   * Only allows deleting ad-hoc sessions added from the calendar (scheduleId === null).
   * Group regular schedule sessions cannot be deleted, only cancelled.
   */
  async deleteSession(sessionId: string, user: AuthenticatedUser) {
    const session = await this.prisma.lessonSession.findUnique({
      where: { id: sessionId },
      include: { group: true },
    });

    if (!session) {
      throw new NotFoundException(`Lesson session [${sessionId}] not found`);
    }

    await this.assertGroupAccess(session.groupId, user, true);

    // Group regular scheduled sessions cannot be deleted, only cancelled for the day
    if (session.scheduleId) {
      throw new BadRequestException(
        'لا يمكن حذف الحصص الأساسية المجدولة للمجموعة، يمكنك فقط إلغاء الحصة لهذا اليوم بدلاً من حذفها',
      );
    }

    return this.prisma.lessonSession.delete({
      where: { id: sessionId },
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

  /**
   * Retrieves all sessions for today for the user, auto-generating them if missing.
   * Strictly filtered by active academicYear and academicTerm.
   */
  async getTodaySessionsWithAutoGenerate(
    user: AuthenticatedUser,
    academicStage?: string,
    gradeLevel?: string,
    academicYear?: string,
    academicTerm?: string,
  ) {
    const today = new Date();
    // Normalize to UTC midnight for consistent date matching
    const sessionDateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    const whereGroup: any = { isActive: true };
    
    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      whereGroup.OR = [
        { teacherId },
        { teacher: { id: teacherId } },
      ];

      // Auto-resolve teacher's configured active academic period from database if not explicitly passed
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

    whereGroup.schedules = {
      some: { dayOfWeek }
    };

    const groupsWithSchedules = await this.prisma.academicGroup.findMany({
      where: whereGroup,
      include: {
        schedules: {
          where: { dayOfWeek }
        }
      }
    });

    const generatedSessions: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const group of groupsWithSchedules) {
        for (const schedule of group.schedules) {
          let session = await tx.lessonSession.findFirst({
            where: {
              groupId: group.id,
              sessionDate: sessionDateOnly,
              startTime: schedule.startTime,
            },
            include: {
              group: { select: { id: true, name: true, gradeLevel: true } },
              _count: { select: { attendanceRecords: true, educationalContents: true } }
            }
          });

          if (!session) {
            const dateStr = sessionDateOnly.toISOString().split('T')[0];
            const topic = `حصة ${dateStr}`;

            session = await tx.lessonSession.create({
              data: {
                groupId: group.id,
                scheduleId: schedule.id,
                sessionDate: sessionDateOnly,
                startTime: schedule.startTime,
                topic,
              },
              include: {
                group: { select: { id: true, name: true, gradeLevel: true } },
                _count: { select: { attendanceRecords: true, educationalContents: true } }
              }
            });
          }
          generatedSessions.push(session);
        }
      }
    });

    generatedSessions.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return generatedSessions;
  }
}
