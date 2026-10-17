import { Module } from '@nestjs/common';
import { TeachersController } from './controllers/teachers.controller';
import { TeachersService } from './services/teachers.service';
import { TeacherProfileService } from './services/teacher-profile.service';
import { TeacherDashboardService } from './services/teacher-dashboard.service';
import { TeacherDashboardInitService } from './services/teacher-dashboard-init.service';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [StudentsModule],
  controllers: [TeachersController],
  providers: [
    TeachersService,
    TeacherProfileService,
    TeacherDashboardService,
    TeacherDashboardInitService,
  ],
  exports: [
    TeachersService,
    TeacherProfileService,
    TeacherDashboardService,
    TeacherDashboardInitService,
  ],
})
export class TeachersModule {}
