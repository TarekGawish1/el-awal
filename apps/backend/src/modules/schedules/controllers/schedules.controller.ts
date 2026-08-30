import {
  Controller,
  Get,
  Post,
  Put,
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
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { Public } from '../../../core/security/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Lesson Schedules & Teacher Calendar')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Public()
  @Get('public/centers')
  @ApiOperation({ summary: 'Get all public center schedules grouped by grade' })
  async getPublicCenterSchedules() {
    return this.schedulesService.getPublicCenterSchedules();
  }

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

  @Get('teacher/calendar')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all sessions for the teacher (calendar timeline with past, today, and upcoming)' })
  async getTeacherCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query('groupId') groupId?: string,
    @Query('gradeLevel') gradeLevel?: string,
    @Query('academicYear') academicYear?: string,
    @Query('academicTerm') academicTerm?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('timeframe') timeframe?: 'PAST' | 'TODAY' | 'UPCOMING' | 'ALL',
    @Query('search') search?: string,
  ) {
    return this.schedulesService.getTeacherSessions(user, {
      groupId,
      gradeLevel,
      academicYear,
      academicTerm,
      startDate,
      endDate,
      timeframe,
      search,
    });
  }

  @Post('session')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a single lesson session with custom date, time, and topic' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.createSingleSession(dto, user);
  }

  @Put('session/:id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update a lesson session date, start time, or topic name' })
  async updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.updateSession(id, dto, user);
  }

  @Delete('session/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete a physical lesson session' })
  async deleteSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.deleteSession(id, user);
  }

  @Get('topics')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all distinct session topics/titles saved by the teacher in the database' })
  async getTopics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('gradeLevel') gradeLevel?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.schedulesService.getTeacherSessionTopics(user, gradeLevel, groupId);
  }

  @Get('today-sessions')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all sessions for today across all groups, auto-generating if needed' })
  async getTodaySessions(
    @Query('academicStage') academicStage: string,
    @Query('gradeLevel') gradeLevel: string,
    @Query('academicYear') academicYear: string,
    @Query('academicTerm') academicTerm: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulesService.getTodaySessionsWithAutoGenerate(
      user,
      academicStage,
      gradeLevel,
      academicYear,
      academicTerm,
    );
  }
}
