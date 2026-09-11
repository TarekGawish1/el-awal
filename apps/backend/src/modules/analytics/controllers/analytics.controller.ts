import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { TrackPageViewDto, AnalyticsQueryDto } from '../dto/analytics.dto';
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
    // Extract client IP address (supporting reverse proxies like Cloudflare/Nginx)
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = (
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]
        : Array.isArray(forwarded)
        ? forwarded[0]
        : req.socket?.remoteAddress || req.ip || ''
    ).trim();

    const userAgent = req.headers['user-agent'] || '';
    const authenticatedUser = (req as any).user as AuthenticatedUser | undefined;

    // Non-blocking fire-and-forget execution: never delay client response cycle
    void this.analyticsService.recordPageView({
      ...dto,
      ipAddress,
      userAgent,
      userId: authenticatedUser?.id,
      tenantId: dto.tenantId || authenticatedUser?.teacherProfileId,
    });

    return { success: true };
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
}
