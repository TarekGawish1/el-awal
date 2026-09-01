import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssistantsService, InviteAssistantDto, UpdateAssistantDto } from '../services/assistants.service';
import { CurrentUser, AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { Roles } from '../../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Teacher Assistants')
@ApiBearerAuth()
@Controller('teachers/assistants')
@Roles(UserRole.TEACHER) // Only the primary teacher can manage assistants
export class AssistantsController {
  constructor(private readonly assistantsService: AssistantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assistants for the authenticated teacher' })
  async getAssistants(@CurrentUser() user: AuthenticatedUser) {
    const teacherId = user.id;
    return this.assistantsService.listAssistants(teacherId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a new assistant by phone or email' })
  async inviteAssistant(
    @Body() dto: InviteAssistantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assistantsService.inviteAssistant(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update assistant permissions and status' })
  async updateAssistant(
    @Param('id') id: string,
    @Body() dto: UpdateAssistantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assistantsService.updateAssistant(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an assistant' })
  async removeAssistant(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assistantsService.removeAssistant(user.id, id);
  }
}
