import { Module } from '@nestjs/common';
import { SiteSettingsController } from './controllers/site-settings.controller';
import { SiteSettingsService } from './services/site-settings.service';

@Module({
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
