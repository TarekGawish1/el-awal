import { Controller, Post, Get, Delete, Param, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SECURE_FILE_UPLOAD_OPTIONS } from '../../../integrations/storage/upload-options';
import { CertificatesService } from '../services/certificates.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../../core/security/decorators/public.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateCertificateDto } from '../dto/create-certificate.dto';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get list of certificates for the public landing page' })
  async getPublicCertificates() {
    return this.certificatesService.getPublicCertificates();
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new certificate and upload its image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', SECURE_FILE_UPLOAD_OPTIONS))
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
}
