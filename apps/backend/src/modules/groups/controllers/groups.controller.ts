import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService, CreateGroupDto } from '../services/groups.service';
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
  @ApiOperation({ summary: 'Create a new physical academic group' })
  async createGroup(@Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(dto);
  }

  @Get('my-groups')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all physical academic groups managed by the authenticated teacher' })
  async getMyGroups(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.getTeacherGroups(user.teacherProfileId || user.id);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @ApiOperation({ summary: 'Get details, roster, and schedule of an academic group' })
  async getGroupById(@Param('id') id: string) {
    return this.groupsService.getGroupById(id);
  }
}
