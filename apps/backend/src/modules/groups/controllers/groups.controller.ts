import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
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
    return this.groupsService.createGroup(user.teacherProfileId || user.id, dto, user);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all physical academic groups' })
  async getGroups(
    @CurrentUser() user: AuthenticatedUser,
    @Query('academicYear') academicYear?: string,
    @Query('academicTerm') academicTerm?: string,
  ) {
    return this.groupsService.getTeacherGroups(user.teacherProfileId || user.id, academicYear, academicTerm);
  }

  @Get('my-groups')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all physical academic groups managed by the authenticated teacher' })
  async getMyGroups(
    @CurrentUser() user: AuthenticatedUser,
    @Query('academicYear') academicYear?: string,
    @Query('academicTerm') academicTerm?: string,
  ) {
    return this.groupsService.getTeacherGroups(user.teacherProfileId || user.id, academicYear, academicTerm);
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

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Update an academic group' })
  async updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.updateGroup(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Delete an academic group' })
  async deleteGroup(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.deleteGroup(id, user);
  }

  @Post(':id/registration-link')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate or fetch the shareable self-registration link for a group' })
  @ApiResponse({ status: 200, description: 'Registration link details returned' })
  async generateRegistrationLink(
    @Param('id') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.generateRegistrationLink(groupId, user);
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
  @Get('reservations/pending')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get all pending reservations' })
  async getPendingReservations(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.getPendingReservations(user);
  }

  @Post('reservations/:enrollmentId/accept')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Accept a pending reservation' })
  async acceptReservation(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: { paymentStatus?: 'PAID' | 'LATER' },
  ) {
    return this.groupsService.acceptReservation(enrollmentId, user, body?.paymentStatus || 'LATER');
  }

  @Post('reservations/:enrollmentId/reject')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Reject a pending reservation' })
  async rejectReservation(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.rejectReservation(enrollmentId, user);
  }

  @Patch('reservations/:enrollmentId/group')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Change the target group of a pending reservation' })
  async changeReservationGroup(
    @Param('enrollmentId') enrollmentId: string,
    @Body('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupsService.changeReservationGroup(enrollmentId, groupId, user);
  }
}
