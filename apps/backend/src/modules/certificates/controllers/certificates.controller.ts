import { Controller, Post, Get, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CertificatesService } from '../services/certificates.service';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get list of certificates for the public landing page' })
  async getPublicCertificates() {
    return this.certificatesService.getPublicCertificates();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new certificate and upload its image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async createCertificate(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.certificatesService.createCertificate(body, file);
  }
}
