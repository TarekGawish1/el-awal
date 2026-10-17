import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AnalyticsService } from "../services/analytics.service";
import {
  TrackPageViewDto,
  AnalyticsQueryDto,
  StartSessionDto,
  PingSessionDto,
  GeoRankingQueryDto,
  LandingStatsQueryDto,
  StudentRankingQueryDto,
  VisitorListQueryDto,
  PageEngagementPingDto,
  AnalyticsOverviewQueryDto,
} from "../dto/analytics.dto";
import { Public } from "../../../core/security/decorators/public.decorator";
import { Roles } from "../../../core/security/decorators/roles.decorator";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../../../core/security/decorators/current-user.decorator";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";

@ApiTags("Analytics & Telemetry")
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly jwtService: JwtService,
  ) {}

  private extractClientIp(req: any): string {
    const forwarded = req.headers?.["x-forwarded-for"];
    return (
      typeof forwarded === "string"
        ? forwarded.split(",")[0]
        : Array.isArray(forwarded)
          ? forwarded[0]
          : req.ip || req.socket?.remoteAddress || req.raw?.socket?.remoteAddress || ""
    ).trim();
  }

  @Post("track")
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      "Track page view or route navigation event (Non-blocking ingestion)",
  })
  @ApiResponse({
    status: 202,
    description: "Event queued for telemetry ingestion",
  })
  async trackPageView(@Body() dto: TrackPageViewDto, @Req() req: any) {
    const ipAddress = this.extractClientIp(req);
    const userAgent = req.headers["user-agent"] || "";
    let authenticatedUser = (req as any).user as
      | AuthenticatedUser
      | undefined;

    // If request has Authorization header and req.user wasn't populated due to @Public()
    if (!authenticatedUser) {
      const authHeader = req.headers?.["authorization"] || req.headers?.["Authorization"];
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7).trim();
          const decoded = this.jwtService.decode(token) as any;
          if (decoded?.sub) {
            authenticatedUser = {
              id: decoded.sub,
              role: decoded.role,
              teacherProfileId: decoded.teacherProfileId,
            } as any;
          }
        } catch {
          // ignore invalid token in public telemetry
        }
      }
    }

    const resolvedUserId = authenticatedUser?.id || dto.userId;

    // Exclude teachers, assistants, and administrative pages from tracking
    if (
      authenticatedUser?.role === UserRole.TEACHER ||
      authenticatedUser?.role === UserRole.SECRETARIAT ||
      dto.path?.startsWith("/teacher") ||
      dto.path?.startsWith("/secretariat") ||
      dto.path?.startsWith("/assistant") ||
      dto.path?.startsWith("/admin")
    ) {
      return { success: true };
    }

    void this.analyticsService.recordPageView({
      ...dto,
      ipAddress,
      userAgent,
      userId: resolvedUserId,
      tenantId: dto.tenantId || authenticatedUser?.teacherProfileId,
      headers: req.headers,
    });

    return { success: true };
  }

  @Post("session/start")
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Initialize an authenticated student or user activity tracking session",
  })
  @ApiResponse({
    status: 201,
    description: "Session created with resolved geographic location",
  })
  async startSession(
    @Body() dto: StartSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    if (!user)
      throw new UnauthorizedException("Session requires authenticated user");

    // Never track activity sessions for teachers or assistants
    if (user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT) {
      return { sessionId: "teacher-excluded", country: "مصر", city: "القاهرة" };
    }

    const ipAddress = this.extractClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    return this.analyticsService.startSession(
      user.id,
      dto,
      ipAddress,
      userAgent,
      req.headers,
    );
  }

  @Post("session/ping")
  @Public() // Can be pinged with valid sessionId on tab close / beacon without forcing bearer header
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Heartbeat ping to increment active duration for an ongoing session",
  })
  @ApiResponse({ status: 200, description: "Session duration incremented" })
  async pingSession(@Body() dto: PingSessionDto) {
    if (dto.sessionId === "teacher-excluded") {
      return { success: true, duration: 0 };
    }
    return this.analyticsService.pingSession(dto);
  }

  @Post("ping-page")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Heartbeat ping to record active time spent by guest/landing visitors on a single page",
  })
  @ApiResponse({
    status: 200,
    description: "Page engagement duration recorded",
  })
  async pingPageEngagement(
    @Body() dto: PageEngagementPingDto,
    @Req() req: any,
  ) {
    const ipAddress = this.extractClientIp(req);
    const userAgent = req.headers["user-agent"] || "";
    return this.analyticsService.recordPageEngagement({
      visitorId: dto.visitorId,
      path: dto.path,
      durationSeconds: dto.durationSeconds,
      ipAddress,
      userAgent,
    });
  }

  @Get("overview")
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary:
      "Get consolidated analytics overview (stats + geo-ranking + leaderboard + visitors)",
  })
  @ApiResponse({ status: 200, description: "Consolidated analytics overview dataset" })
  async getOverview(
    @Query() query: AnalyticsOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getOverview(query, teacherId);
  }

  @Get("stats")
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary:
      "Get consolidated analytics metrics, unique visitors, trends, and top pages",
  })
  @ApiResponse({ status: 200, description: "Aggregated analytics dataset" })
  async getStats(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getStats(query, teacherId);
  }

  @Get("landing")
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary:
      "Get isolated metrics for the public landing page (total views & unique visitors)",
  })
  @ApiResponse({ status: 200, description: "Landing page overview metrics" })
  async getLandingStats(@Query() query: LandingStatsQueryDto) {
    return this.analyticsService.getLandingStats(query);
  }

  @Get("geo-ranking")
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary:
      "Ranked top countries or governorates/cities by traffic and unique visitors",
  })
  @ApiResponse({ status: 200, description: "Ranked geographic dataset" })
  async getGeoRanking(
    @Query() query: GeoRankingQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getGeoRanking(query, teacherId);
  }

  @Get("students/ranking")
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary:
      "Student engagement leaderboard sorted by active time spent or visit frequency",
  })
  @ApiResponse({
    status: 200,
    description: "Ranked student engagement dataset",
  })
  async getStudentRanking(
    @Query() query: StudentRankingQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getStudentEngagementLeaderboard(
      query,
      teacherId,
    );
  }

  @Get("visitors")
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary:
      "Get detailed visitors list with visit frequency, metadata, and individual visit history",
  })
  @ApiResponse({
    status: 200,
    description: "Filtered visitors list with visit history",
  })
  async getVisitorsList(
    @Query() query: VisitorListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getVisitorsList(query, teacherId);
  }
}
