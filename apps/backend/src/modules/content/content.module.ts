import { Module } from '@nestjs/common';
import { ContentController } from './controllers/content.controller';
import { ContentService } from './services/content.service';
import { ContentStorageService } from './services/content-storage.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService, ContentStorageService],
  exports: [ContentService, ContentStorageService],
})
export class ContentModule {}
