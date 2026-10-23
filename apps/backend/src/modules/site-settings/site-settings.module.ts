import { Module } from '@nestjs/common';
import { SiteSettingsController } from './controllers/site-settings.controller';
import { SiteSettingsService } from './services/site-settings.service';
import { SchedulesModule } from '../schedules/schedules.module';
import { CoursesModule } from '../courses/courses.module';
import { TestimonialsModule } from '../testimonials/testimonials.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    SchedulesModule,
    CoursesModule,
    TestimonialsModule,
    CertificatesModule,
  ],
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
