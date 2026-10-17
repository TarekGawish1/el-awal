import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { GeoLocationService } from './services/geo-location.service';
import { TelemetryIngestionService } from './services/telemetry-ingestion.service';
import { DashboardOverviewService } from './services/dashboard-overview.service';
import { GeoAnalyticsService } from './services/geo-analytics.service';
import { StudentAnalyticsService } from './services/student-analytics.service';
import { VisitorAnalyticsService } from './services/visitor-analytics.service';
import { FinancialAnalyticsService } from './services/financial-analytics.service';
import { CourseAnalyticsService } from './services/course-analytics.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    GeoLocationService,
    TelemetryIngestionService,
    DashboardOverviewService,
    GeoAnalyticsService,
    StudentAnalyticsService,
    VisitorAnalyticsService,
    FinancialAnalyticsService,
    CourseAnalyticsService,
  ],
  exports: [
    AnalyticsService,
    GeoLocationService,
    TelemetryIngestionService,
    DashboardOverviewService,
    GeoAnalyticsService,
    StudentAnalyticsService,
    VisitorAnalyticsService,
    FinancialAnalyticsService,
    CourseAnalyticsService,
  ],
})
export class AnalyticsModule {}
