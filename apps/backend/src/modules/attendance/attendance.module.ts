import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { AutoAbsenceCron } from './crons/auto-absence.cron';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, AutoAbsenceCron],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
