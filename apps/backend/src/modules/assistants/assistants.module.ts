import { Module } from '@nestjs/common';
import { AssistantsController } from './controllers/assistants.controller';
import { AssistantsService } from './services/assistants.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AssistantsController],
  providers: [AssistantsService],
  exports: [AssistantsService],
})
export class AssistantsModule {}

