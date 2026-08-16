import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ParentPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getLinkedStudents(parentId: string) {
    return this.prisma.parentStudentLink.findMany({
      where: { parentId },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, phone: true } },
            groupEnrollments: {
              where: { status: 'ACTIVE' },
              include: { group: { select: { name: true, gradeLevel: true } } },
            },
          },
        },
      },
    });
  }

  async getStudentAcademicSummary(parentId: string, studentId: string) {
    // Verify guardianship link
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    if (!link) {
      throw new ForbiddenException('You do not have guardianship authorization for this student');
    }

    const [attendanceCount, evaluations, submissions] = await Promise.all([
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: { studentId },
        _count: { id: true },
      }),
      this.prisma.studentEvaluation.findMany({
        where: { studentId },
        orderBy: { evaluationDate: 'desc' },
        take: 10,
      }),
      this.prisma.assessmentSubmission.findMany({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        include: { assessment: { select: { title: true, totalScore: true, type: true } } },
      }),
    ]);

    return {
      attendanceSummary: attendanceCount,
      recentEvaluations: evaluations,
      recentSubmissions: submissions,
    };
  }
}
