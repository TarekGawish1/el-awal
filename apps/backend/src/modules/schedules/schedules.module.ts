import { Module } from '@nestjs/common';
import { SchedulesController } from './controllers/schedules.controller';
import { SchedulesService } from './services/schedules.service';
import { ScheduleTimetableService } from './services/schedule-timetable.service';
import { ScheduleGeneratorService } from './services/schedule-generator.service';
import { ScheduleSessionQueryService } from './services/schedule-session-query.service';
import { ScheduleSessionCrudService } from './services/schedule-session-crud.service';

@Module({
  controllers: [SchedulesController],
  providers: [
    ScheduleTimetableService,
    ScheduleGeneratorService,
    ScheduleSessionQueryService,
    ScheduleSessionCrudService,
    SchedulesService,
  ],
  exports: [
    ScheduleTimetableService,
    ScheduleGeneratorService,
    ScheduleSessionQueryService,
    ScheduleSessionCrudService,
    SchedulesService,
  ],
})
export class SchedulesModule {}
