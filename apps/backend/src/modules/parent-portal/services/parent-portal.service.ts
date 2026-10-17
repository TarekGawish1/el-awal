import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { ParentChildrenService } from './parent-children.service';
import { ParentOverviewService } from './parent-overview.service';
import { ParentFeedService } from './parent-feed.service';

@Injectable()
export class ParentPortalService {
  private readonly childrenService: ParentChildrenService;
  private readonly overviewService: ParentOverviewService;
  private readonly feedService: ParentFeedService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() childrenService?: ParentChildrenService,
    @Optional() overviewService?: ParentOverviewService,
    @Optional() feedService?: ParentFeedService,
  ) {
    this.childrenService = childrenService ?? new ParentChildrenService(prisma);
    this.overviewService = overviewService ?? new ParentOverviewService(prisma, this.childrenService, redisCache);
    this.feedService = feedService ?? new ParentFeedService(prisma, this.childrenService);
  }

  // --- Guardian Verification & Children List ---
  async verifyGuardianLink(parentId: string, studentId: string, userRole?: string) {
    return this.childrenService.verifyGuardianLink(parentId, studentId, userRole);
  }

  async getLinkedStudents(parentId: string) {
    return this.childrenService.getLinkedStudents(parentId);
  }

  // --- Overview & Dashboard ---
  async getStudentOverview(parentId: string, studentId: string, userRole?: string) {
    return this.overviewService.getStudentOverview(parentId, studentId, userRole);
  }

  async getParentDashboard(parentId: string, studentIdQuery?: string, userRole?: string) {
    return this.overviewService.getParentDashboard(parentId, studentIdQuery, userRole);
  }

  // --- Feeds (Attendance, Assessments, Courses) ---
  async getStudentAttendance(
    parentId: string,
    studentId: string,
    query: CursorPaginationDto,
  ) {
    return this.feedService.getStudentAttendance(parentId, studentId, query);
  }

  async getStudentAssessments(parentId: string, studentId: string) {
    return this.feedService.getStudentAssessments(parentId, studentId);
  }

  async getStudentCourses(parentId: string, studentId: string) {
    return this.feedService.getStudentCourses(parentId, studentId);
  }
}
