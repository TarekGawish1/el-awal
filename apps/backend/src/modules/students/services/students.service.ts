import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentById(studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student profile [${studentId}] not found`);
    }

    return student;
  }
}
