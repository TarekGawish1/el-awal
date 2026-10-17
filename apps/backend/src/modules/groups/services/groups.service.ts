import {
  Injectable,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { ScheduleLike } from '../utils/schedule-conflict.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { GroupCrudService } from './group-crud.service';
import { GroupEnrollmentsService } from './group-enrollments.service';
import { GroupReservationsService } from './group-reservations.service';

@Injectable()
export class GroupsService {
  private readonly crudService: GroupCrudService;
  private readonly enrollmentsService: GroupEnrollmentsService;
  private readonly reservationsService: GroupReservationsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() crudService?: GroupCrudService,
    @Optional() enrollmentsService?: GroupEnrollmentsService,
    @Optional() reservationsService?: GroupReservationsService,
  ) {
    this.crudService = crudService ?? new GroupCrudService(prisma, redisCache);
    this.enrollmentsService = enrollmentsService ?? new GroupEnrollmentsService(prisma, this.crudService, redisCache);
    this.reservationsService = reservationsService ?? new GroupReservationsService(
      prisma,
      notificationsService,
      realtimeGateway,
      this.crudService,
      redisCache,
    );
  }

  // --- Helpers for backward compatibility ---
  async checkTeacherOwnership(group: { teacherId: string }, user?: AuthenticatedUser) {
    return this.crudService.checkTeacherOwnership(group, user);
  }

  async assertNoScheduleConflict(
    effectiveTeacherId: string,
    candidate: {
      schedules?: ScheduleLike[] | null;
      academicYear?: string | null;
      academicTerm?: string | null;
    },
    excludeGroupId?: string,
  ) {
    return this.crudService.assertNoScheduleConflict(effectiveTeacherId, candidate, excludeGroupId);
  }

  // --- Group CRUD & Management ---
  async createGroup(teacherId: string, dto: CreateGroupDto, currentUser?: AuthenticatedUser) {
    return this.crudService.createGroup(teacherId, dto, currentUser);
  }

  async getTeacherGroups(teacherId: string, academicYear?: string, academicTerm?: string) {
    return this.crudService.getTeacherGroups(teacherId, academicYear, academicTerm);
  }

  async getGroupById(groupId: string, user?: AuthenticatedUser) {
    return this.crudService.getGroupById(groupId, user);
  }

  async updateGroup(groupId: string, dto: UpdateGroupDto, user?: AuthenticatedUser) {
    return this.crudService.updateGroup(groupId, dto, user);
  }

  async deleteGroup(groupId: string, user?: AuthenticatedUser) {
    return this.crudService.deleteGroup(groupId, user);
  }

  async generateRegistrationLink(groupId: string, user?: AuthenticatedUser) {
    return this.crudService.generateRegistrationLink(groupId, user);
  }

  // --- Enrollments & Roster ---
  async enrollStudent(
    groupId: string,
    studentId: string,
    user?: AuthenticatedUser,
    transfer = false,
  ) {
    return this.enrollmentsService.enrollStudent(groupId, studentId, user, transfer);
  }

  async dropStudent(groupId: string, studentId: string, user?: AuthenticatedUser) {
    return this.enrollmentsService.dropStudent(groupId, studentId, user);
  }

  async getGroupRoster(groupId: string, user?: AuthenticatedUser) {
    return this.enrollmentsService.getGroupRoster(groupId, user);
  }

  // --- Reservations ---
  async getPendingReservations(user: AuthenticatedUser) {
    return this.reservationsService.getPendingReservations(user);
  }

  async acceptReservation(enrollmentId: string, user: AuthenticatedUser, paymentStatus: 'PAID' | 'LATER' = 'LATER') {
    return this.reservationsService.acceptReservation(enrollmentId, user, paymentStatus);
  }

  async rejectReservation(enrollmentId: string, user: AuthenticatedUser) {
    return this.reservationsService.rejectReservation(enrollmentId, user);
  }

  async changeReservationGroup(enrollmentId: string, newGroupId: string, user: AuthenticatedUser) {
    return this.reservationsService.changeReservationGroup(enrollmentId, newGroupId, user);
  }
}
