import { IsString, IsOptional, IsBoolean, IsIn, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
