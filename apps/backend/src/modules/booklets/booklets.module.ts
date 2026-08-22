import { Module } from '@nestjs/common';
import { BookletsController } from './controllers/booklets.controller';
import { BookletsService } from './services/booklets.service';

@Module({
  controllers: [BookletsController],
  providers: [BookletsService],
  exports: [BookletsService],
})
export class BookletsModule {}
