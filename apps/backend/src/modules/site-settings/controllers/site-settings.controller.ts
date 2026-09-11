import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SiteSettingsService } from '../services/site-settings.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../../core/security/decorators/public.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateSiteSettingDto } from '../dto/update-site-setting.dto';

@ApiTags('SiteSettings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

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
