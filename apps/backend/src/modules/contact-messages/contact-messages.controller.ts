import { Controller, Post, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { ContactMessagesService } from './contact-messages.service';
import { Public } from '../../core/security/decorators/public.decorator';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) {}

  @Public()
  @Post()
  create(@Body() createDto: { name: string; phone: string; message: string }) {
    return this.contactMessagesService.create(createDto);
  }

  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @Get('unread-count')
  getUnreadCount() {
    return this.contactMessagesService.getUnreadCount();
  }

  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @Get()
  findAll() {
    return this.contactMessagesService.findAll();
  }

  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.contactMessagesService.markAsRead(id);
  }

  @Roles(UserRole.TEACHER, UserRole.SECRETARIAT)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.contactMessagesService.delete(id);
  }
}
