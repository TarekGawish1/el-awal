import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { GroupEnrollmentStatus } from '@prisma/client';
import { BootstrapSnapshotResponse } from './sync.service';

@Injectable()
export class SyncStudentSnapshotService {
  private readonly logger = new Logger(SyncStudentSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStudentBootstrapSnapshot(
    user: AuthenticatedUser,
    timestamp: number,
    isDelta: boolean,
    sinceDate: Date | null,
    snapshotVersion: string,
  ): Promise<BootstrapSnapshotResponse> {
    const studentProfileId = user.studentProfileId || user.id;

    // 1. Enrolled Groups
    let groups: any[] = [];
    try {
      const enrollments = await this.prisma.groupEnrollment.findMany({
        where: {
          studentId: studentProfileId,
          status: GroupEnrollmentStatus.ACTIVE,
        },
        include: {
          group: {
            include: {
              schedules: true,
              teacher: {
                include: {
                  user: { select: { fullName: true } },
                },
              },
            },
          },
        },
      });
      groups = (enrollments || []).map((e) => e.group).filter(Boolean);
    } catch (err) {
      this.logger.warn('Failed to fetch student groups for bootstrap:', err);
      groups = [];
    }

    const groupIds = groups.map((g) => g.id).filter(Boolean);

    // 2. Upcoming Sessions
    let sessions: any[] = [];
    try {
      if (groupIds.length > 0) {
        sessions = await this.prisma.lessonSession.findMany({
          where: {
            groupId: { in: groupIds },
            ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
          },
          orderBy: { sessionDate: 'asc' },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch student sessions for bootstrap:', err);
      sessions = [];
    }

    // 3. Published Assessments (REDACTING correctAnswer for students!)
    let assessments: any[] = [];
    try {
      const rawAssessments = await this.prisma.assessment.findMany({
        where: {
          isPublished: true,
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          questions: {
            orderBy: { questionNumber: 'asc' },
          },
          submissions: {
            where: { studentId: studentProfileId },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      // Redact answers for student security
      assessments = (rawAssessments || []).map((a) => ({
        ...a,
        questions: (a.questions || []).map((q) => {
          const { correctAnswer: _correctAnswer, ...safeQuestion } = q;
          return safeQuestion;
        }),
      }));
    } catch (err) {
      this.logger.warn('Failed to fetch student assessments for bootstrap:', err);
      assessments = [];
    }

    // 4. Enrolled Courses with student progress
    let courses: any[] = [];
    try {
      courses = await this.prisma.course.findMany({
        where: {
          enrollments: {
            some: { studentId: studentProfileId },
          },
        },
        include: {
          modules: {
            include: {
              lessons: {
                include: {
                  progresses: {
                    where: { studentId: studentProfileId },
                  },
                },
                orderBy: { orderIndex: 'asc' },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch student courses for bootstrap:', err);
      courses = [];
    }

    // 5. Personal Attendance History
    let attendanceHistory: any[] = [];
    try {
      attendanceHistory = await this.prisma.attendanceRecord.findMany({
        where: {
          studentId: studentProfileId,
          ...(sinceDate ? { recordedAt: { gte: sinceDate } } : {}),
        },
        include: {
          session: {
            include: { group: { select: { name: true } } },
          },
        },
        orderBy: { recordedAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch student attendance history for bootstrap:', err);
      attendanceHistory = [];
    }

    // 6. Personal Payment History
    let payments: any[] = [];
    try {
      payments = await this.prisma.studentPaymentRecord.findMany({
        where: {
          studentId: studentProfileId,
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          group: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch student payment history for bootstrap:', err);
      payments = [];
    }

    // 7. Available Booklets for Student
    let booklets: any[] = [];
    try {
      if (typeof this.prisma.booklet?.findMany === 'function') {
        const studentProfile = await this.prisma.studentProfile.findUnique({
          where: { id: studentProfileId },
          select: { gradeLevel: true },
        });

        const rawBooklets = await this.prisma.booklet.findMany({
          where: {
            isActive: true,
            ...(studentProfile?.gradeLevel ? { gradeLevel: studentProfile.gradeLevel } : {}),
            ...(groupIds.length > 0
              ? {
                  OR: [
                    { groupId: { in: groupIds } },
                    { groupId: null },
                  ],
                }
              : { groupId: null }),
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          include: {
            group: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        booklets = (rawBooklets || []).map((b) => ({
          ...b,
          price: Number(b.price),
        }));
      }
    } catch (err) {
      this.logger.warn('Failed to fetch student booklets for bootstrap:', err);
      booklets = [];
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {
        groups: groups || [],
        sessions: sessions || [],
        assessments: assessments || [],
        courses: courses || [],
        attendanceHistory: attendanceHistory || [],
        payments: payments || [],
        booklets: booklets || [],
      },
    };
  }

  async getParentBootstrapSnapshot(
    user: AuthenticatedUser,
    timestamp: number,
    isDelta: boolean,
    sinceDate: Date | null,
    snapshotVersion: string,
  ): Promise<BootstrapSnapshotResponse> {
    let children: any[] = [];
    try {
      const parent = await this.prisma.parentProfile.findUnique({
        where: { id: user.id },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  user: { select: { fullName: true, phone: true } },
                  groupEnrollments: {
                    where: { status: GroupEnrollmentStatus.ACTIVE },
                    include: { group: true },
                  },
                  attendanceRecords: {
                    orderBy: { recordedAt: 'desc' },
                    take: 50,
                  },
                  paymentRecords: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                  },
                  assessmentSubmissions: {
                    orderBy: { submittedAt: 'desc' },
                    take: 50,
                  },
                },
              },
            },
          },
        },
      });

      children = (parent?.studentLinks || []).map((link) => link.student).filter(Boolean);
    } catch (err) {
      this.logger.warn('Failed to fetch parent children for bootstrap:', err);
      children = [];
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {
        children: children || [],
      },
    };
  }
}
