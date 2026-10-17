import {
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { StorageService } from '../../../integrations/storage/storage.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentQueryDto } from '../dto/student-query.dto';
import { StudentGroupQueryDto } from '../dto/student-group-query.dto';
import { StudentQrCodeResponseDto } from '../dto/qr-code-response.dto';
import { ResetStudentPasswordDto } from '../dto/reset-student-password.dto';
import { ResetParentPasswordDto } from '../dto/reset-parent-password.dto';
import { StudentAcademicStatus } from '@prisma/client';

import { StudentRegistrationService } from './student-registration.service';
import { StudentProfileService } from './student-profile.service';
import { StudentQueryService } from './student-query.service';
import { StudentCredentialsService } from './student-credentials.service';
import { StudentPortalDataService } from './student-portal-data.service';
import { StudentGroupReservationService } from './student-group-reservation.service';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  public readonly registrationService: StudentRegistrationService;
  public readonly profileService: StudentProfileService;
  public readonly queryService: StudentQueryService;
  public readonly credentialsService: StudentCredentialsService;
  public readonly portalDataService: StudentPortalDataService;
  public readonly reservationService: StudentGroupReservationService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() registrationService?: StudentRegistrationService,
    @Optional() profileService?: StudentProfileService,
    @Optional() queryService?: StudentQueryService,
    @Optional() credentialsService?: StudentCredentialsService,
    @Optional() portalDataService?: StudentPortalDataService,
    @Optional() reservationService?: StudentGroupReservationService,
  ) {
    this.registrationService =
      registrationService ??
      new StudentRegistrationService(this.prisma, this.notificationsService);

    this.profileService =
      profileService ?? new StudentProfileService(this.prisma);

    this.queryService = queryService ?? new StudentQueryService(this.prisma);

    this.credentialsService =
      credentialsService ??
      new StudentCredentialsService(
        this.prisma,
        this.notificationsService,
        this.profileService,
      );

    this.portalDataService =
      portalDataService ??
      new StudentPortalDataService(
        this.prisma,
        this.storageService,
        this.redisCache,
      );

    this.reservationService =
      reservationService ??
      new StudentGroupReservationService(
        this.prisma,
        this.notificationsService,
        this.realtimeGateway,
      );
  }

  async createStudent(dto: CreateStudentDto, currentUser?: AuthenticatedUser) {
    return this.registrationService.createStudent(dto, currentUser);
  }

  async updateStudent(
    studentId: string,
    dto: UpdateStudentDto,
    user: AuthenticatedUser,
  ) {
    return this.profileService.updateStudent(studentId, dto, user);
  }

  async getStudentById(studentId: string, user: AuthenticatedUser) {
    return this.profileService.getStudentById(studentId, user);
  }

  async getStudentQrCode(
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<StudentQrCodeResponseDto> {
    return this.credentialsService.getStudentQrCode(studentId, user);
  }

  async getMyGroup(user: AuthenticatedUser, query?: StudentGroupQueryDto) {
    return this.portalDataService.getMyGroup(user, query);
  }

  async getMyGroupSessions(
    user: AuthenticatedUser,
    query?: StudentGroupQueryDto,
  ) {
    return this.portalDataService.getMyGroupSessions(user, query);
  }

  async getStudentDashboardOverview(user: AuthenticatedUser) {
    return this.portalDataService.getStudentDashboardOverview(user);
  }

  async invalidateStudentDashboardCache(studentId: string) {
    return this.portalDataService.invalidateStudentDashboardCache(studentId);
  }

  async regenerateQrToken(
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<StudentQrCodeResponseDto> {
    return this.credentialsService.regenerateQrToken(studentId, user);
  }

  async getStudents(query: StudentQueryDto, user?: AuthenticatedUser) {
    return this.queryService.getStudents(query, user);
  }

  async getAvailableGroups(user: AuthenticatedUser) {
    return this.reservationService.getAvailableGroups(user);
  }

  async reserveGroup(groupId: string, user: AuthenticatedUser) {
    return this.reservationService.reserveGroup(groupId, user);
  }

  async updateStudentStatus(
    id: string,
    status: StudentAcademicStatus,
    user: AuthenticatedUser,
  ) {
    return this.profileService.updateStudentStatus(id, status, user);
  }

  async deleteStudent(id: string, user: AuthenticatedUser) {
    return this.profileService.deleteStudent(id, user);
  }

  async resetStudentPassword(
    studentId: string,
    dto: ResetStudentPasswordDto,
    user: AuthenticatedUser,
  ) {
    return this.credentialsService.resetStudentPassword(studentId, dto, user);
  }

  async resetParentPassword(
    studentId: string,
    dto: ResetParentPasswordDto,
    user: AuthenticatedUser,
  ) {
    return this.credentialsService.resetParentPassword(studentId, dto, user);
  }

  async getStudentCredentials(studentId: string, user: AuthenticatedUser) {
    return this.credentialsService.getStudentCredentials(studentId, user);
  }
}
