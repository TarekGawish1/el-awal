import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService, CreateContentDto } from '../services/content.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Educational Content')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('upload-url')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Generate presigned Cloudflare R2 direct upload URL' })
  async getUploadUrl(
    @Query('fileName') fileName: string,
    @Query('mimeType') mimeType: string,
  ) {
    return this.contentService.getPresignedUpload(fileName, mimeType);
  }

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Register educational content metadata attached to group or lesson' })
  async createContent(
    @Body() dto: Omit<CreateContentDto, 'teacherId'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentService.createContent({
      ...dto,
      teacherId: user.teacherProfileId || user.id,
    });
  }
}
