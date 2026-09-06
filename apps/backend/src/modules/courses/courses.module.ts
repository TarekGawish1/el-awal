import { Module } from '@nestjs/common';
import { CoursesController } from './controllers/courses.controller';
import { CoursesService } from './services/courses.service';
import { CourseProgressRepository } from './repositories/course-progress.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../../realtime/realtime.module';

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseProgressRepository],
  exports: [CoursesService, CourseProgressRepository],
})
export class CoursesModule {}

