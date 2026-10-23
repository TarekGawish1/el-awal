import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SiteSettingsService } from '../services/site-settings.service';
import { SchedulesService } from '../../schedules/services/schedules.service';
import { CoursesService } from '../../courses/services/courses.service';
import { TestimonialsService } from '../../testimonials/services/testimonials.service';
import { CertificatesService } from '../../certificates/services/certificates.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../../core/security/decorators/public.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateSiteSettingDto } from '../dto/update-site-setting.dto';

@ApiTags('SiteSettings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(
    private readonly siteSettingsService: SiteSettingsService,
    private readonly schedulesService: SchedulesService,
    private readonly coursesService: CoursesService,
    private readonly testimonialsService: TestimonialsService,
    private readonly certificatesService: CertificatesService,
  ) {}

  @Get('public/landing-data')
  @Public()
  @ApiOperation({ summary: 'Get aggregated public landing page data bundle (centers, catalog, testimonials, siteSettings, certificates) in a single request' })
  async getLandingBundle() {
    const [centers, catalog, testimonials, siteSettings, certificates] = await Promise.all([
      this.schedulesService.getPublicCenterSchedules().catch((err) => {
        console.warn('Failed to load centers for landing bundle:', err?.message);
        return [];
      }),
      this.coursesService.getPublishedCatalog({ limit: 20 }).catch((err) => {
        console.warn('Failed to load catalog for landing bundle:', err?.message);
        return [];
      }),
      this.testimonialsService.findPublic().catch((err) => {
        console.warn('Failed to load testimonials for landing bundle:', err?.message);
        return [];
      }),
      this.siteSettingsService.getPublicSettings().catch((err) => {
        console.warn('Failed to load site settings for landing bundle:', err?.message);
        return {};
      }),
      this.certificatesService.getPublicCertificates().catch((err) => {
        console.warn('Failed to load certificates for landing bundle:', err?.message);
        return [];
      }),
    ]);

    return {
      centers,
      catalog,
      testimonials,
      siteSettings,
      certificates,
    };
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get public landing-page display settings' })
  async getPublicSettings() {
    return this.siteSettingsService.getPublicSettings();
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all manageable site settings (dashboard)' })
  async getAllSettings() {
    return this.siteSettingsService.getAllSettings();
  }

  @Patch()
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update a site setting (dashboard control)' })
  async updateSetting(@Body() dto: UpdateSiteSettingDto) {
    return this.siteSettingsService.updateSetting(dto.key, dto.value);
  }
}
