import { Module } from '@nestjs/common';
import { BunnyVideoService } from './bunny-video.service';

@Module({
  providers: [BunnyVideoService],
  exports: [BunnyVideoService],
})
export class VideoModule {}
