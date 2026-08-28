import { Module } from '@nestjs/common';
import { TeachersController } from './controllers/teachers.controller';
import { TeachersService } from './services/teachers.service';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [StudentsModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
