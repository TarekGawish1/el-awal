import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

export interface CreateScheduleDto {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
}

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(dto: CreateScheduleDto) {
    return this.prisma.lessonSchedule.create({
      data: {
        groupId: dto.groupId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        location: dto.location,
      },
    });
  }

  async getGroupSchedules(groupId: string) {
    return this.prisma.lessonSchedule.findMany({
      where: { groupId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
