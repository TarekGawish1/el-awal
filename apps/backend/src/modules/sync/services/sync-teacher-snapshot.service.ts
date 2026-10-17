import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  GroupEnrollmentStatus,
  UserRole,
  PaymentStatus,
  AttendanceMode,
} from '@prisma/client';
import { BootstrapSnapshotResponse } from './sync.service';
import { fetchTeacherSnapshotStudents } from './sync-teacher-students.helper';

@Injectable()
export class SyncTeacherSnapshotService {
  private readonly logger = new Logger(SyncTeacherSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTeacherBootstrapSnapshot(
    user: AuthenticatedUser,
    timestamp: number,
    isDelta: boolean,
    sinceDate: Date | null,
    snapshotVersion: string,
  ): Promise<BootstrapSnapshotResponse> {
    let teacherProfile: any = null;
    try {
      if (user.teacherProfileId && typeof this.prisma.teacherProfile?.findUnique === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findUnique({
          where: { id: user.teacherProfileId },
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }

      if (!teacherProfile && typeof this.prisma.teacherProfile?.findFirst === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findFirst({
          where: { id: user.id },
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }

      if (!teacherProfile && user.role === UserRole.SECRETARIAT && typeof this.prisma.teacherAssistant?.findFirst === 'function') {
        const link = await this.prisma.teacherAssistant.findFirst({
          where: { assistantId: user.id, status: 'ACTIVE' },
          select: { teacherId: true },
        });
        if (link && typeof this.prisma.teacherProfile?.findUnique === 'function') {
          teacherProfile = await this.prisma.teacherProfile.findUnique({
            where: { id: link.teacherId },
            select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
          });
        }
      }
    } catch (err) {
      this.logger.warn('Failed to resolve teacher profile for bootstrap snapshot:', err);
    }

    const effectiveTeacherId = teacherProfile?.id || user.teacherProfileId || user.id;

    // 1. Academic Period
    const academicPeriod = {
      academicYear: teacherProfile?.activeAcademicYear || '2026-2027',
      academicTerm: teacherProfile?.activeAcademicTerm || 'FIRST_TERM',
      activeAcademicYear: teacherProfile?.activeAcademicYear || '2026-2027',
      activeAcademicTerm: teacherProfile?.activeAcademicTerm || 'FIRST_TERM',
    };

    // 2. Groups
    let groups: any[] = [];
    let allTeacherGroupIds: string[] = [];
    try {
      const allGroups = await this.prisma.academicGroup.findMany({
        where: {
          ...((user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT) && effectiveTeacherId
            ? {
                OR: [
                  { teacherId: effectiveTeacherId },
                  { teacher: { id: effectiveTeacherId } },
                ],
              }
            : {}),
          isActive: true,
        },
        select: { id: true },
      });
      allTeacherGroupIds = allGroups.map((g) => g.id).filter(Boolean);

      const groupsWhere: any = {
        id: { in: allTeacherGroupIds },
        isActive: true,
      };

      if (isDelta && sinceDate) {
        groupsWhere.updatedAt = { gte: sinceDate };
      }

      groups = await this.prisma.academicGroup.findMany({
        where: groupsWhere,
        include: {
          schedules: true,
          _count: {
            select: {
              enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch groups in bootstrap snapshot:', err);
      groups = [];
    }

    const groupIds = (groups || []).map((g) => g.id).filter(Boolean);

    // 3. Students
    const students = await fetchTeacherSnapshotStudents(
      this.prisma,
      allTeacherGroupIds,
      groupIds,
      isDelta,
      sinceDate,
      this.logger,
    );

    // 4. Schedules
    let schedules: any[] = [];
    try {
      if (groupIds.length > 0) {
        schedules = await this.prisma.lessonSchedule.findMany({
          where: {
            groupId: { in: groupIds },
          },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch schedules in bootstrap snapshot:', err);
      schedules = [];
    }

    // 5. Sessions
    let sessions: any[] = [];
    try {
      if (groupIds.length > 0) {
        sessions = await this.prisma.lessonSession.findMany({
          where: {
            groupId: { in: groupIds },
            ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
          },
          include: {
            _count: { select: { attendanceRecords: true } },
          },
          orderBy: { sessionDate: 'asc' },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch sessions in bootstrap snapshot:', err);
      sessions = [];
    }

    // 6. Payments
    let payments: any[] = [];
    try {
      const studentIds = students.map((s) => s.id).filter(Boolean);
      const orConditions = [
        ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ...(studentIds.length > 0 ? [{ studentId: { in: studentIds } }] : []),
      ];

      if (orConditions.length > 0) {
        payments = await this.prisma.studentPaymentRecord.findMany({
          where: {
            OR: orConditions,
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          include: {
            student: {
              include: {
                user: { select: { fullName: true } },
              },
            },
            group: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch payments in bootstrap snapshot:', err);
      payments = [];
    }

    // 7. Assessments (with answer keys included for Teacher/Secretariat)
    let assessments: any[] = [];
    try {
      assessments = await this.prisma.assessment.findMany({
        where: {
          ...(user.role === UserRole.TEACHER && effectiveTeacherId ? { teacherId: effectiveTeacherId } : {}),
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          questions: {
            orderBy: { questionNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch assessments in bootstrap snapshot:', err);
      assessments = [];
    }

    // 8. Courses
    let courses: any[] = [];
    try {
      courses = await this.prisma.course.findMany({
        where: {
          ...(user.role === UserRole.TEACHER && effectiveTeacherId ? { teacherId: effectiveTeacherId } : {}),
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          modules: {
            include: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch courses in bootstrap snapshot:', err);
      courses = [];
    }

    // 9. Attendance Records
    let attendanceRecords: any[] = [];
    try {
      if (groupIds.length > 0) {
        attendanceRecords = await this.prisma.attendanceRecord.findMany({
          where: {
            session: {
              groupId: { in: groupIds },
            },
            ...(sinceDate ? { recordedAt: { gte: sinceDate } } : {}),
          },
          include: {
            student: {
              include: {
                user: { select: { fullName: true, phone: true } },
              },
            },
            session: {
              select: { id: true, groupId: true, sessionDate: true, topic: true },
            },
          },
          orderBy: { recordedAt: 'desc' },
          take: 1000,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch attendance records in bootstrap snapshot:', err);
      attendanceRecords = [];
    }

    // 10. Booklets
    let booklets: any[] = [];
    try {
      if (typeof this.prisma.booklet?.findMany === 'function') {
        const rawBooklets = await this.prisma.booklet.findMany({
          where: {
            ...(user.role === UserRole.TEACHER && effectiveTeacherId
              ? { teacherProfileId: effectiveTeacherId }
              : {}),
            isActive: true,
            academicYear: academicPeriod.activeAcademicYear,
            academicTerm: academicPeriod.activeAcademicTerm,
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          include: {
            group: { select: { id: true, name: true, gradeLevel: true } },
            payments: {
              where: { paymentStatus: PaymentStatus.PAID },
              select: { id: true, amountPaid: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        booklets = (rawBooklets || []).map((b) => {
          const salesCount = b.payments?.length || 0;
          const totalRevenue = (b.payments || []).reduce((acc: number, p: any) => acc + Number(p.amountPaid || 0), 0);
          const { payments: _payments, ...rest } = b;
          return {
            ...rest,
            price: Number(b.price),
            salesCount,
            totalRevenue,
          };
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch booklets in bootstrap snapshot:', err);
      booklets = [];
    }

    // 11. Homework Records
    let homeworkRecords: any[] = [];
    try {
      if (typeof this.prisma.homeworkRecord?.findMany === 'function') {
        homeworkRecords = await this.prisma.homeworkRecord.findMany({
          where: {
            session: {
              groupId: { in: groupIds },
            },
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          orderBy: { updatedAt: 'desc' },
          take: 1000,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch homework records in bootstrap snapshot:', err);
      homeworkRecords = [];
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {
        academicPeriod,
        groups: groups || [],
        students: students || [],
        schedules: schedules || [],
        sessions: sessions || [],
        payments: payments || [],
        attendance: attendanceRecords || [],
        assessments: assessments || [],
        courses: courses || [],
        booklets: booklets || [],
        homework: homeworkRecords || [],
      },
    };
  }
}
