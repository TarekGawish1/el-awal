import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ContactMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: { name: string; phone: string; message: string }) {
    return this.prisma.contactMessage.create({
      data: createDto,
    });
  }

  async findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async delete(id: string) {
    return this.prisma.contactMessage.delete({
      where: { id },
    });
  }
}
