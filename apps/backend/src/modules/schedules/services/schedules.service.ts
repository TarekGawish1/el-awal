import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { ScheduleTimetableService } from './schedule-timetable.service';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { ScheduleSessionQueryService } from './schedule-session-query.service';
import { ScheduleSessionCrudService } from './schedule-session-crud.service';

@Injectable()
export class SchedulesService {
  private readonly timetableService: ScheduleTimetableService;
  private readonly generatorService: ScheduleGeneratorService;
  private readonly sessionQueryService: ScheduleSessionQueryService;
  private readonly sessionCrudService: ScheduleSessionCrudService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() timetableService?: ScheduleTimetableService,
    @Optional() generatorService?: ScheduleGeneratorService,
    @Optional() sessionQueryService?: ScheduleSessionQueryService,
    @Optional() sessionCrudService?: ScheduleSessionCrudService,
  ) {
    this.timetableService =
      timetableService ?? new ScheduleTimetableService(this.prisma, this.redisCache);
    this.generatorService =
      generatorService ??
      new ScheduleGeneratorService(this.prisma, this.timetableService, this.redisCache);
    this.sessionQueryService =
      sessionQueryService ??
      new ScheduleSessionQueryService(this.prisma, this.generatorService);
    this.sessionCrudService =
      sessionCrudService ??
      new ScheduleSessionCrudService(this.prisma, this.timetableService);
  }

  /**
   * Weekly timetable schedules
   */
  async createSchedule(dto: CreateScheduleDto, user: AuthenticatedUser) {
    return this.timetableService.createSchedule(dto, user);
  }

  async getGroupSchedules(groupId: string, user: AuthenticatedUser) {
    return this.timetableService.getGroupSchedules(groupId, user);
  }

  async deleteSchedule(scheduleId: string, user: AuthenticatedUser) {
    return this.timetableService.deleteSchedule(scheduleId, user);
  }

  async getPublicCenterSchedules() {
    return this.timetableService.getPublicCenterSchedules();
  }

  /**
   * Generation and semester helpers
   */
  getSemesterDateWindow(academicYear?: string, academicTerm?: string) {
    return this.generatorService.getSemesterDateWindow(academicYear, academicTerm);
  }

  async generateSessionsFromSchedule(
    groupId: string,
    dto: GenerateSessionsDto,
    user: AuthenticatedUser,
  ) {
    return this.generatorService.generateSessionsFromSchedule(groupId, dto, user);
  }

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
    return this.generatorService.autoEnsureSemesterSessionsForGroups(
      groupsWithSchedules,
      targetYear,
      targetTerm,
    );
  }

  async getTodaySessionsWithAutoGenerate(
    user: AuthenticatedUser,
    academicStage?: string,
    gradeLevel?: string,
    academicYear?: string,
    academicTerm?: string,
  ) {
    return this.generatorService.getTodaySessionsWithAutoGenerate(
      user,
      academicStage,
      gradeLevel,
      academicYear,
      academicTerm,
    );
  }

  /**
   * Lesson session queries
   */
  async getGroupSessions(groupId: string, user: AuthenticatedUser) {
    return this.sessionQueryService.getGroupSessions(groupId, user);
  }

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
    return this.sessionQueryService.getTeacherSessions(user, params);
  }

  async getTeacherSessionTopics(user: AuthenticatedUser, gradeLevel?: string, groupId?: string) {
    return this.sessionQueryService.getTeacherSessionTopics(user, gradeLevel, groupId);
  }

  /**
   * Lesson session CRUD
   */
  async createSingleSession(dto: CreateSessionDto, user: AuthenticatedUser) {
    return this.sessionCrudService.createSingleSession(dto, user);
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto, user: AuthenticatedUser) {
    return this.sessionCrudService.updateSession(sessionId, dto, user);
  }

  async deleteSession(sessionId: string, user: AuthenticatedUser) {
    return this.sessionCrudService.deleteSession(sessionId, user);
  }
}
