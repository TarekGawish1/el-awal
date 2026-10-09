import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        teacherProfile: true,
        studentProfile: true,
        parentProfile: true,
        secretariatProfile: true,
        assistantToTeachers: {
          where: { status: 'ACTIVE' },
          select: { permissions: true, teacherId: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const permissions = user.assistantToTeachers?.[0]?.permissions || [];
    const secretariatProfileId = (user.role === 'STUDENT' || user.role === 'TEACHER')
      ? undefined
      : (user.secretariatProfile?.id || (user.assistantToTeachers?.length ? user.id : undefined));
    const teacherProfileId = (user.role === 'TEACHER') ? user.teacherProfile?.id : undefined;
    const parentProfileId = (user.role === 'TEACHER' || user.role === 'STUDENT') ? undefined : user.parentProfile?.id;
    const studentProfileId = (user.role === 'STUDENT') ? user.studentProfile?.id : undefined;

    return {
      ...user,
      secretariatProfileId,
      teacherProfileId,
      parentProfileId,
      studentProfileId,
      permissions,
    };
  }
}
