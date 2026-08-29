import { Global, Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { VideoModule } from './video/video.module';
import { AiModule } from './ai/ai.module';

@Global()
@Module({
  imports: [StorageModule, VideoModule, AiModule],
  exports: [StorageModule, VideoModule, AiModule],
})
export class IntegrationsModule {}
