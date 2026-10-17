import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole, GroupEnrollmentStatus } from '@prisma/client';
import { SyncTeacherSnapshotService } from './sync-teacher-snapshot.service';
import { SyncStudentSnapshotService } from './sync-student-snapshot.service';
import { BootstrapSnapshotResponse } from './sync.service';

@Injectable()
export class SyncSnapshotService {
  private readonly logger = new Logger(SyncSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherSnapshotService: SyncTeacherSnapshotService,
    private readonly studentSnapshotService: SyncStudentSnapshotService,
  ) {}

  /**
   * Generates a comprehensive "Zero Cold-Start" bootstrap snapshot for the authenticated user.
   * Supports incremental delta sync via ?since=<epochMs>.
   */
  async getBootstrapSnapshot(
    user: AuthenticatedUser,
    since?: number,
  ): Promise<BootstrapSnapshotResponse> {
    const timestamp = Date.now();
    const isDelta = !!since && since > 0;
    const sinceDate = isDelta ? new Date(since!) : null;
    const snapshotVersion = `v2_${timestamp}`;

    if (user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT) {
      return this.teacherSnapshotService.getTeacherBootstrapSnapshot(
        user,
        timestamp,
        isDelta,
        sinceDate,
        snapshotVersion,
      );
    } else if (user.role === UserRole.STUDENT) {
      return this.studentSnapshotService.getStudentBootstrapSnapshot(
        user,
        timestamp,
        isDelta,
        sinceDate,
        snapshotVersion,
      );
    } else if (user.role === UserRole.PARENT) {
      return this.studentSnapshotService.getParentBootstrapSnapshot(
        user,
        timestamp,
        isDelta,
        sinceDate,
        snapshotVersion,
      );
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {},
    };
  }

  async getSyncDiff(user: AuthenticatedUser, since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    let teacherProfile: any = null;
    try {
      if (user.teacherProfileId && typeof this.prisma.teacherProfile?.findUnique === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findUnique({
          where: { id: user.teacherProfileId },
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
      if (!teacherProfile && typeof this.prisma.teacherProfile?.findFirst === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findFirst({
          where: { id: user.id },
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to resolve teacher profile in getSyncDiff:', err);
    }

    const effectiveTeacherId = teacherProfile?.id || user.teacherProfileId || user.id;

    // 1. Fetch updated groups
    let groups: any[] = [];
    try {
      if (typeof this.prisma.academicGroup?.findMany === 'function') {
        groups = await this.prisma.academicGroup.findMany({
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
            updatedAt: { gte: sinceDate },
          },
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            monthlyFee: true,
            academicYear: true,
            academicTerm: true,
            updatedAt: true,
            _count: {
              select: {
                enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch groups diff:', err);
      groups = [];
    }

    // 2. Fetch updated students
    let students: any[] = [];
    try {
      if (typeof this.prisma.studentProfile?.findMany === 'function') {
        const studentProfiles = await this.prisma.studentProfile.findMany({
          where: {
            academicStatus: 'ACTIVE',
            user: { isActive: true },
            updatedAt: { gte: sinceDate },
          },
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
            groupEnrollments: {
              where: { status: GroupEnrollmentStatus.ACTIVE },
              include: { group: { select: { id: true, name: true } } },
            },
          },
          take: 50,
        });

        students = (studentProfiles || []).map((s) => ({
          id: s.id,
          fullName: s.user?.fullName || '',
          phone: s.user?.phone || '',
          studentCode: s.studentCode || '',
          groupName: s.groupEnrollments?.[0]?.group?.name || '',
          updatedAt: s.updatedAt,
        }));
      }
    } catch (err) {
      this.logger.warn('Failed to fetch students diff:', err);
      students = [];
    }

    // 3. Fetch updated attendance
    let attendance: any[] = [];
    try {
      if (typeof this.prisma.attendanceRecord?.findMany === 'function') {
        attendance = await this.prisma.attendanceRecord.findMany({
          where: {
            ...(user.role === UserRole.TEACHER && effectiveTeacherId
              ? {
                  session: {
                    group: {
                      OR: [
                        { teacherId: effectiveTeacherId },
                        { teacher: { id: effectiveTeacherId } },
                      ],
                    },
                  },
                }
              : {}),
            recordedAt: { gte: sinceDate },
          },
          select: {
            id: true,
            status: true,
            sessionId: true,
            studentId: true,
            recordedAt: true,
          },
          take: 50,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch attendance diff:', err);
      attendance = [];
    }

    // 4. Fetch updated payments
    let payments: any[] = [];
    try {
      if (typeof this.prisma.studentPaymentRecord?.findMany === 'function') {
        payments = await this.prisma.studentPaymentRecord.findMany({
          where: {
            ...(user.role === UserRole.TEACHER && effectiveTeacherId
              ? {
                  group: {
                    OR: [
                      { teacherId: effectiveTeacherId },
                      { teacher: { id: effectiveTeacherId } },
                    ],
                  },
                }
              : {}),
            updatedAt: { gte: sinceDate },
          },
          select: {
            id: true,
            amountPaid: true,
            paymentMethod: true,
            paymentStatus: true,
            studentId: true,
            groupId: true,
            updatedAt: true,
          },
          take: 50,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch payments diff:', err);
      payments = [];
    }

    return {
      groups: { count: groups.length, items: groups },
      students: { count: students.length, items: students },
      attendance: { count: attendance.length, items: attendance },
      payments: { count: payments.length, items: payments },
      serverTime: new Date().toISOString(),
    };
  }
}
