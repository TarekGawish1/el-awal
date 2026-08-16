import { Global, Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { VideoModule } from './video/video.module';

@Global()
@Module({
  imports: [StorageModule, VideoModule],
  exports: [StorageModule, VideoModule],
})
export class IntegrationsModule {}
