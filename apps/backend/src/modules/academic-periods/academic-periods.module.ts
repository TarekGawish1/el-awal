import { Module } from '@nestjs/common';
import { AcademicPeriodsController } from './controllers/academic-periods.controller';
import { AcademicPeriodsService } from './services/academic-periods.service';
import { TeachersModule } from '../teachers/teachers.module';

@Module({
  imports: [TeachersModule],
  controllers: [AcademicPeriodsController],
  providers: [AcademicPeriodsService],
})
export class AcademicPeriodsModule {}
