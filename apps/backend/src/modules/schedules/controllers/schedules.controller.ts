import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService, CreateScheduleDto } from '../services/schedules.service';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Lesson Schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a recurring weekly lesson schedule for a group' })
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.createSchedule(dto);
  }

  @Get('group/:groupId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get all recurring lesson schedules for an academic group' })
  async getGroupSchedules(@Param('groupId') groupId: string) {
    return this.schedulesService.getGroupSchedules(groupId);
  }
}
