import { Module } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { GeoLocationService } from './services/geo-location.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, GeoLocationService],
  exports: [AnalyticsService, GeoLocationService],
})
export class AnalyticsModule {}
