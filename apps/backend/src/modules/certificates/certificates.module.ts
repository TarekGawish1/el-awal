import { Module } from '@nestjs/common';
import { CertificatesController } from './controllers/certificates.controller';
import { CertificatesService } from './services/certificates.service';
import { StorageModule } from '../../integrations/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
