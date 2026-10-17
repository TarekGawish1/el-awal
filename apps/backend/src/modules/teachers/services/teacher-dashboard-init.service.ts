import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { GroupEnrollmentStatus, CourseEnrollmentStatus } from '@prisma/client';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { TeacherProfileService } from './teacher-profile.service';

@Injectable()
export class TeacherDashboardInitService {
  private readonly logger = new Logger(TeacherDashboardInitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: TeacherProfileService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  async getDashboardInit(
    teacherId: string,
    query: DashboardOverviewQueryDto,
    overview: any,
  ) {
    const cacheKey = `teacher:dashboard:init:${teacherId}:${JSON.stringify(query)}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const academicPeriod = await this.profileService.getAcademicPeriod(teacherId);
    const effectiveTeacherId = await this.profileService.resolveEffectiveTeacherId(teacherId);

    const [rawGroups, pendingEnrollments] = await Promise.all([
      this.prisma.academicGroup.findMany({
        where: { teacherId: effectiveTeacherId, isActive: true },
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          monthlyFee: true,
          academicYear: true,
          academicTerm: true,
          _count: {
            select: {
              enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.courseEnrollment.findMany({
        where: {
          course: { teacherId: effectiveTeacherId },
          status: CourseEnrollmentStatus.PENDING,
        },
        include: {
          course: { select: { id: true, title: true, price: true, gradeLevel: true, subject: true } },
          student: {
            include: {
              user: { select: { id: true, fullName: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        take: 20,
      }),
    ]);

    const groups = rawGroups.map((g) => ({
      ...g,
      monthlyFee: Number(g.monthlyFee),
      stage: g.gradeLevel.includes('ابتدائي')
        ? 'PRIMARY'
        : g.gradeLevel.includes('إعدادي') || g.gradeLevel.includes('اعدادي')
        ? 'PREPARATORY'
        : 'SECONDARY',
    }));

    const pendingReservations = pendingEnrollments.map((e) => ({
      enrollmentId: e.id,
      courseId: e.courseId,
      courseName: e.course.title,
      coursePrice: Number(e.course.price),
      studentId: e.studentId,
      studentName: e.student?.user?.fullName || 'طالب',
      studentCode: e.student?.studentCode || '',
      studentPhone: e.student?.user?.phone || '',
      senderPhone: e.senderPhone || e.student?.user?.phone || '',
      transferAmount: e.transferAmount ? Number(e.transferAmount) : Number(e.course.price),
      receiptImageUrl: e.receiptImageUrl || null,
      paymentMethod: e.paymentMethod,
      date: e.enrolledAt ? new Date(e.enrolledAt).toISOString().split('T')[0] : '',
      enrolledAt: e.enrolledAt?.toISOString() || '',
      status: e.status,
      student: {
        id: e.studentId,
        studentCode: e.student?.studentCode,
        qrCodeToken: e.student?.studentCode,
        user: {
          fullName: e.student?.user?.fullName,
          phone: e.student?.user?.phone,
        },
        ...e.student,
      },
      group: {
        name: e.course.title,
      },
    }));

    const result = {
      ...overview,
      pendingReservations,
      menus: {
        groups,
        academicPeriod,
      },
    };

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, result, 300);
    }

    return result;
  }
}
