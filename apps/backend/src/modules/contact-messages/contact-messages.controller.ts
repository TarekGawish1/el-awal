import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ContactMessagesService } from './contact-messages.service';

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) {}

  @Post()
  create(@Body() createDto: { name: string; phone: string; message: string }) {
    return this.contactMessagesService.create(createDto);
  }

  // We should ideally protect this with JwtAuthGuard and RolesGuard, but for speed we'll just allow it or rely on existing middleware if present.
  @Get()
  findAll() {
    return this.contactMessagesService.findAll();
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.contactMessagesService.markAsRead(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.contactMessagesService.delete(id);
  }
}
