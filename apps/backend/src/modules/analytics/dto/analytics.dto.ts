import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsDateString,
  IsObject,
  IsNumber,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TrackPageViewDto {
  @ApiProperty({ description: 'The URL path visited', example: '/' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Referrer URL', example: 'https://google.com' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Whether the visited page is the public landing page', default: false })
  @IsOptional()
  @IsBoolean()
  isLandingPage?: boolean;

  @ApiPropertyOptional({ description: 'Tenant ID if scoped to a specific teacher workspace', example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Optional extensible metadata (UTM tags, device info, screen dimensions)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter scope: landing page only, system dashboard only, or combined',
    enum: ['landing', 'system', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['landing', 'system', 'all'])
  scope?: 'landing' | 'system' | 'all' = 'all';

  @ApiPropertyOptional({
    description: 'Predefined date range',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    default: 'week',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year', 'all', 'custom'])
  range?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom' = 'week';

  @ApiPropertyOptional({ description: 'Custom range start date (ISO string)', example: '2026-09-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Custom range end date (ISO string)', example: '2026-09-11T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Optional tenant filter if requesting platform-wide analytics' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class StartSessionDto {
  @ApiPropertyOptional({ description: 'Tenant ID / Teacher Profile ID associated with the session' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class PingSessionDto {
  @ApiProperty({ description: 'Active session UUID', example: 'b6e3f282-e30c-4395-814e-f82ad31057e0' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Elapsed active seconds since last ping', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  @Type(() => Number)
  elapsedSeconds?: number = 30;
}

export class GeoRankingQueryDto {
  @ApiPropertyOptional({
    description: 'Filter scope: landing visits, platform user sessions, or all combined',
    enum: ['landing', 'platform', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['landing', 'platform', 'all'])
  scope?: 'landing' | 'platform' | 'all' = 'all';

  @ApiPropertyOptional({
    description: 'Group ranking by country or city/governorate',
    enum: ['country', 'city'],
    default: 'city',
  })
  @IsOptional()
  @IsIn(['country', 'city'])
  groupBy?: 'country' | 'city' = 'city';

  @ApiPropertyOptional({
    description: 'Predefined date range',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    default: 'week',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year', 'all', 'custom'])
  range?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom' = 'week';

  @ApiPropertyOptional({ description: 'Custom range start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Custom range end date (ISO string)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Tenant ID filter' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class LandingStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Predefined date range',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    default: 'week',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year', 'all', 'custom'])
  range?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom' = 'week';

  @ApiPropertyOptional({ description: 'Custom range start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Custom range end date (ISO string)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class StudentRankingQueryDto {
  @ApiPropertyOptional({
    description: 'Sort leaderboard by total active duration or total session visit count',
    enum: ['duration', 'visits'],
    default: 'duration',
  })
  @IsOptional()
  @IsIn(['duration', 'visits'])
  sortBy?: 'duration' | 'visits' = 'duration';

  @ApiPropertyOptional({
    description: 'Predefined date range',
    enum: ['today', 'week', 'month', 'year', 'all', 'custom'],
    default: 'week',
  })
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'year', 'all', 'custom'])
  range?: 'today' | 'week' | 'month' | 'year' | 'all' | 'custom' = 'week';

  @ApiPropertyOptional({ description: 'Custom range start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Custom range end date (ISO string)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Tenant ID filter' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Number of top students to return', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
