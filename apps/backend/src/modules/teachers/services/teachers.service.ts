import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { ChangeTeacherPasswordDto } from '../dto/change-teacher-password.dto';
import { TeacherProfileService } from './teacher-profile.service';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Injectable()
export class TeachersService {
  private readonly profileService: TeacherProfileService;
  private readonly dashboardService: TeacherDashboardService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() profileService?: TeacherProfileService,
    @Optional() dashboardService?: TeacherDashboardService,
  ) {
    this.profileService = profileService ?? new TeacherProfileService(prisma);
    this.dashboardService = dashboardService ?? new TeacherDashboardService(prisma, this.profileService, redisCache);
  }

  // --- Teacher Resolution ---
  async resolveEffectiveTeacherId(teacherIdOrUserId: string): Promise<string> {
    return this.profileService.resolveEffectiveTeacherId(teacherIdOrUserId);
  }

  // --- Dashboard & Analytics ---
  async getDashboardOverview(teacherId: string, query: DashboardOverviewQueryDto) {
    return this.dashboardService.getDashboardOverview(teacherId, query);
  }

  async getDashboardInit(teacherId: string, query: DashboardOverviewQueryDto) {
    return this.dashboardService.getDashboardInit(teacherId, query);
  }

  // --- Academic Period ---
  async getAcademicPeriod(teacherId?: string) {
    return this.profileService.getAcademicPeriod(teacherId);
  }

  async updateAcademicPeriod(
    teacherId: string,
    dto: { activeAcademicYear: string; activeAcademicTerm: string },
  ) {
    return this.profileService.updateAcademicPeriod(teacherId, dto);
  }

  // --- Saved Locations ---
  async getSavedLocations(teacherId: string): Promise<string[]> {
    return this.profileService.getSavedLocations(teacherId);
  }

  async updateSavedLocations(teacherId: string, locations: string[]): Promise<string[]> {
    return this.profileService.updateSavedLocations(teacherId, locations);
  }

  // --- Profile & Password ---
  async getTeacherProfile(teacherId: string) {
    return this.profileService.getTeacherProfile(teacherId);
  }

  async updateTeacherProfile(
    teacherId: string,
    dto: { fullName?: string; phone?: string },
  ) {
    return this.profileService.updateTeacherProfile(teacherId, dto);
  }

  async changeTeacherPassword(
    userId: string,
    dto: ChangeTeacherPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.profileService.changeTeacherPassword(userId, dto);
  }
}
