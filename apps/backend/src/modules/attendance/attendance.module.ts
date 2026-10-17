import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { AttendanceQrService } from './services/attendance-qr.service';
import { AttendanceBatchService } from './services/attendance-batch.service';
import { AttendanceQueriesService } from './services/attendance-queries.service';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceRepository,
    AttendanceQrService,
    AttendanceBatchService,
    AttendanceQueriesService,
  ],
  exports: [
    AttendanceService,
    AttendanceRepository,
    AttendanceQrService,
    AttendanceBatchService,
    AttendanceQueriesService,
  ],
})
export class AttendanceModule {}
