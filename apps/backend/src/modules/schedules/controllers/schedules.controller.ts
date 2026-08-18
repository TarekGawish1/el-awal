import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from '../services/schedules.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GenerateSessionsDto } from '../dto/generate-sessions.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Lesson Schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a recurring weekly lesson schedule for a group' })
  @ApiResponse({ status: 201, description: 'Schedule rule created' })
  async createSchedule(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.createSchedule(dto, user);
  }

  @Get('group/:groupId')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get all recurring lesson schedules for an academic group' })
  async getGroupSchedules(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.getGroupSchedules(groupId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete a recurring lesson schedule rule' })
  async deleteSchedule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.deleteSchedule(id, user);
  }

  @Post('group/:groupId/generate-sessions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Generate physical LessonSession records from recurring schedule over a date window' })
  @ApiResponse({ status: 201, description: 'Sessions generated successfully' })
  async generateSessions(
    @Param('groupId') groupId: string,
    @Body() dto: GenerateSessionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.generateSessionsFromSchedule(groupId, dto, user);
  }

  @Get('group/:groupId/sessions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get all physical LessonSession records for an academic group' })
  async getGroupSessions(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.getGroupSessions(groupId, user);
  }

  @Get('today-sessions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all sessions for today across all groups, auto-generating if needed' })
  async getTodaySessions(
    @Query('academicStage') academicStage: string,
    @Query('gradeLevel') gradeLevel: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.getTodaySessionsWithAutoGenerate(user, academicStage, gradeLevel);
  }
}
