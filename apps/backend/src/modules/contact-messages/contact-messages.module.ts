import { Module } from '@nestjs/common';
import { ContactMessagesController } from './contact-messages.controller';
import { ContactMessagesService } from './contact-messages.service';
import { CoreModule } from '../../core/core.module'; // Assume PrismaService is exported by CoreModule

@Module({
  imports: [CoreModule],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesService],
})
export class ContactMessagesModule {}
