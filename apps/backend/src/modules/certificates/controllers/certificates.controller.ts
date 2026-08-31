import { Controller, Post, Get, Delete, Param, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CertificatesService } from '../services/certificates.service';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Public } from '../../../core/security/decorators/public.decorator';

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
  @Public()
  @ApiOperation({ summary: 'Create a new certificate and upload its image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async createCertificate(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.certificatesService.createCertificate(body, file);
  }

  @Delete(':id')
  @Public()
  @ApiOperation({ summary: 'Delete a certificate' })
  async deleteCertificate(@Param('id') id: string) {
    return this.certificatesService.deleteCertificate(id);
  }
}
