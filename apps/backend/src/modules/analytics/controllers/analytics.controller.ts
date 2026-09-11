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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import {
  TrackPageViewDto,
  AnalyticsQueryDto,
  StartSessionDto,
  PingSessionDto,
  GeoRankingQueryDto,
  LandingStatsQueryDto,
  StudentRankingQueryDto,
} from '../dto/analytics.dto';
import { Public } from '../../../core/security/decorators/public.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Analytics & Telemetry')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    return (
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]
        : Array.isArray(forwarded)
        ? forwarded[0]
        : req.socket?.remoteAddress || req.ip || ''
    ).trim();
  }

  @Post('track')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Track page view or route navigation event (Non-blocking ingestion)',
  })
  @ApiResponse({ status: 202, description: 'Event queued for telemetry ingestion' })
  async trackPageView(
    @Body() dto: TrackPageViewDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const authenticatedUser = (req as any).user as AuthenticatedUser | undefined;

    void this.analyticsService.recordPageView({
      ...dto,
      ipAddress,
      userAgent,
      userId: authenticatedUser?.id,
      tenantId: dto.tenantId || authenticatedUser?.teacherProfileId,
      headers: req.headers,
    });

    return { success: true };
  }

  @Post('session/start')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize an authenticated student or user activity tracking session',
  })
  @ApiResponse({ status: 201, description: 'Session created with resolved geographic location' })
  async startSession(
    @Body() dto: StartSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (!user) throw new UnauthorizedException('Session requires authenticated user');
    const ipAddress = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.analyticsService.startSession(
      user.id,
      dto,
      ipAddress,
      userAgent,
      req.headers,
    );
  }

  @Post('session/ping')
  @Public() // Can be pinged with valid sessionId on tab close / beacon without forcing bearer header
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Heartbeat ping to increment active duration for an ongoing session',
  })
  @ApiResponse({ status: 200, description: 'Session duration incremented' })
  async pingSession(@Body() dto: PingSessionDto) {
    return this.analyticsService.pingSession(dto);
  }

  @Get('stats')
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Get consolidated analytics metrics, unique visitors, trends, and top pages',
  })
  @ApiResponse({ status: 200, description: 'Aggregated analytics dataset' })
  async getStats(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getStats(query, teacherId);
  }

  @Get('landing')
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Get isolated metrics for the public landing page (total views & unique visitors)',
  })
  @ApiResponse({ status: 200, description: 'Landing page overview metrics' })
  async getLandingStats(@Query() query: LandingStatsQueryDto) {
    return this.analyticsService.getLandingStats(query);
  }

  @Get('geo-ranking')
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Ranked top countries or governorates/cities by traffic and unique visitors',
  })
  @ApiResponse({ status: 200, description: 'Ranked geographic dataset' })
  async getGeoRanking(
    @Query() query: GeoRankingQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getGeoRanking(query, teacherId);
  }

  @Get('students/ranking')
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({
    summary: 'Student engagement leaderboard sorted by active time spent or visit frequency',
  })
  @ApiResponse({ status: 200, description: 'Ranked student engagement dataset' })
  async getStudentRanking(
    @Query() query: StudentRankingQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const teacherId = user.teacherProfileId || user.id;
    return this.analyticsService.getStudentEngagementLeaderboard(query, teacherId);
  }
}
