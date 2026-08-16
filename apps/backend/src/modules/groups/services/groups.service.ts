import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

export interface CreateGroupDto {
  name: string;
  gradeLevel: string;
  teacherId: string;
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(dto: CreateGroupDto) {
    return this.prisma.academicGroup.create({
      data: {
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        teacherId: dto.teacherId,
      },
    });
  }

  async getTeacherGroups(teacherId: string) {
    return this.prisma.academicGroup.findMany({
      where: { teacherId, isActive: true },
      include: {
        _count: { select: { enrollments: true, sessions: true } },
      },
    });
  }

  async getGroupById(groupId: string) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: {
        schedules: true,
        enrollments: {
          include: {
            student: {
              include: { user: { select: { fullName: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    return group;
  }
}
