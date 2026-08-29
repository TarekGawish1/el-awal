import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModerationService } from './ai-moderation.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AiModerationService],
  exports: [AiModerationService],
})
export class AiModule {}
