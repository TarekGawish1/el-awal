import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { EnrollStudentDto } from '../dto/enroll-student.dto';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Academic Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Create a new physical academic classroom group' })
  @ApiResponse({ status: 201, description: 'Group successfully created' })
  async createGroup(
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.createGroup(user.teacherProfileId || user.id, dto);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all physical academic groups' })
  async getGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.getTeacherGroups(user.teacherProfileId || user.id);
  }

  @Get('my-groups')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all physical academic groups managed by the authenticated teacher' })
  async getMyGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.getTeacherGroups(user.teacherProfileId || user.id);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get details, active count, and schedules of an academic group' })
  async getGroupById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.getGroupById(id, user);
  }

  @Post(':id/students')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Enroll student into academic group roster (Capacity checked)' })
  @ApiResponse({ status: 201, description: 'Student enrolled in group' })
  @ApiResponse({ status: 409, description: 'Group max capacity exceeded' })
  async enrollStudent(
    @Param('id') groupId: string,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.enrollStudent(groupId, dto.studentId, user);
  }

  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Drop or remove student from active academic group roster' })
  async dropStudent(
    @Param('id') groupId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.dropStudent(groupId, studentId, user);
  }

  @Get(':id/students')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get complete active student roster with attendance rates' })
  async getGroupRoster(
    @Param('id') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.getGroupRoster(groupId, user);
  }
}
