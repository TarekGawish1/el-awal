import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ContentService } from '../services/content.service';
import { PresignedUploadDto, PresignedVideoUploadDto } from '../dto/presigned-upload.dto';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../core/security/decorators/current-user.decorator';
import { UserRole, ContentType } from '@prisma/client';

@ApiTags('Educational Content Library')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) { }

  @Post('upload-file')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload binary file with automatic storage' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('الملف مطلوب للرفع');
    }
    return this.contentService.uploadRawFile(file, folder);
  }

  @Delete('file')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete an unlinked uploaded file from storage bucket' })
  async deleteUploadedFile(
    @Body('fileKey') fileKey?: string,
    @Body('fileUrl') fileUrl?: string,
    @Query('fileKey') queryFileKey?: string,
    @Query('fileUrl') queryFileUrl?: string,
  ) {
    const key = fileKey || queryFileKey;
    const url = fileUrl || queryFileUrl;
    return this.contentService.deleteFileFromStorage({ fileKey: key, fileUrl: url });
  }

  @Post('upload-raw')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Direct multipart raw file upload (image, pdf, cover, attachment)' })
  async uploadRaw(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('الملف مطلوب للرفع');
    }
    return this.contentService.uploadRawFile(file, folder || 'assessments');
  }

  @Post('upload-direct')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Direct multipart file upload with automatic R2 storage and database persistence' })
  async uploadDirect(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('الملف مطلوب للرفع');
    }

    return this.contentService.uploadAndCreateContent(
      user.teacherProfileId || user.id,
      file,
      {
        title: body.title,
        description: body.description,
        contentType: (body.contentType as ContentType) || ContentType.FILE,
        gradeLevel: body.gradeLevel || undefined,
        academicYear: body.academicYear || undefined,
        academicTerm: body.academicTerm || undefined,
        groupId: body.groupId || undefined,
        sessionId: body.sessionId || undefined,
        sessionTopic: body.sessionTopic || undefined,
        lessonId: body.lessonId || undefined,
      },
    );
  }

  @Post('presigned-upload-url')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT)
  @ApiOperation({ summary: 'Generate presigned Cloudflare R2 direct upload URL' })
  @ApiResponse({ status: 200, description: 'Presigned upload URL generated' })
  async getUploadUrl(
    @Body() dto: PresignedUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Students may only request a presigned upload for their own homework answers.
    if (user.role === UserRole.STUDENT && dto.folder !== 'homework-submissions') {
      throw new BadRequestException(
        'Students can only generate upload URLs for homework submissions',
      );
    }
    return this.contentService.generatePresignedUpload(dto);
  }

  @Post('presigned-video-upload')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Generate direct client-to-Bunny Stream video upload credentials' })
  @ApiResponse({ status: 200, description: 'Bunny Stream direct upload credentials generated' })
  async getPresignedVideoUrl(@Body() dto: PresignedVideoUploadDto) {
    return this.contentService.generatePresignedVideoUpload(dto.title);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Register educational content metadata attached to group or lesson' })
  @ApiResponse({ status: 201, description: 'Educational content record created' })
  async createContent(
    @Body() dto: CreateContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentService.createContent(
      user.teacherProfileId || user.id,
      dto,
    );
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'List uploaded educational materials for the authenticated instructor' })
  async listContent(
    @CurrentUser() user: AuthenticatedUser,
    @Query('groupId') groupId?: string,
    @Query('gradeLevel') gradeLevel?: string,
    @Query('academicYear') academicYear?: string,
    @Query('academicTerm') academicTerm?: string,
    @Query('sessionId') sessionId?: string,
    @Query('sessionTopic') sessionTopic?: string,
    @Query('lessonId') lessonId?: string,
    @Query('contentType') contentType?: ContentType,
    @Query('includeGradeScope') includeGradeScope?: string,
  ) {
    return this.contentService.listTeacherContent(
      user.teacherProfileId || user.id,
      {
        groupId,
        gradeLevel,
        academicYear,
        academicTerm,
        sessionId,
        sessionTopic,
        lessonId,
        contentType,
        includeGradeScope: includeGradeScope === 'true' || includeGradeScope === '1',
      },
    );
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update educational content metadata and optionally replace the file' })
  @ApiResponse({ status: 200, description: 'Content successfully updated' })
  async updateContent(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto: UpdateContentDto = {
      title: body.title,
      description: body.description,
      contentType: body.contentType as ContentType,
      gradeLevel: body.gradeLevel,
      academicYear: body.academicYear,
      academicTerm: body.academicTerm,
      groupId: body.groupId,
      sessionId: body.sessionId,
      sessionTopic: body.sessionTopic,
      lessonId: body.lessonId,
      fileKey: body.fileKey,
      fileUrl: body.fileUrl,
      fileSize: body.fileSize ? Number(body.fileSize) : undefined,
      mimeType: body.mimeType,
    };

    return this.contentService.updateContent(
      id,
      user.teacherProfileId || user.id,
      dto,
      file,
    );
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete educational content and its associated storage object' })
  @ApiResponse({ status: 200, description: 'Content successfully deleted' })
  async deleteContent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentService.deleteContent(id, user.teacherProfileId || user.id);
  }
}
