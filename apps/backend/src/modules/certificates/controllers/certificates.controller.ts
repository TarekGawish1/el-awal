import { Controller, Post, Get, Delete, Patch, Param, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FastifyFileInterceptor } from '../../../core/interceptors/fastify-file.interceptor';
import { SECURE_FILE_UPLOAD_OPTIONS } from '../../../integrations/storage/upload-options';
import { CertificatesService } from '../services/certificates.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../../core/security/decorators/public.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateCertificateDto } from '../dto/create-certificate.dto';
import { UpdateVisibilityDto } from '../dto/update-visibility.dto';

import { Throttle } from '@nestjs/throttler';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('public')
  @Public()
  @Throttle({ default: { limit: 3000, ttl: 60000 } })
  @ApiOperation({ summary: 'Get list of certificates for the public landing page' })
  async getPublicCertificates() {
    return this.certificatesService.getPublicCertificates();
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all certificates for the teacher management portal' })
  async getAllCertificates() {
    return this.certificatesService.getAllCertificates();
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new certificate and upload its image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FastifyFileInterceptor('file', SECURE_FILE_UPLOAD_OPTIONS))
  async createCertificate(
    @Body() dto: CreateCertificateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.certificatesService.createCertificate(dto, file);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete a certificate' })
  async deleteCertificate(@Param('id') id: string) {
    return this.certificatesService.deleteCertificate(id);
  }

  @Patch(':id/visibility')
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Show or hide a certificate on the public landing page' })
  async setVisibility(@Param('id') id: string, @Body() dto: UpdateVisibilityDto) {
    return this.certificatesService.setVisibility(id, dto.isPublic);
  }
}
