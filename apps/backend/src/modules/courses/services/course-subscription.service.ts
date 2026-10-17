import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseCoreService } from './course-core.service';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CourseSubscriptionApprovalService } from './course-subscription-approval.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import {
  CourseSubscriptionRequestDto,
  RejectSubscriptionRequestDto,
} from '../dto/enrollment.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  CourseStatus,
  CourseEnrollmentStatus,
  CourseAccessStatus,
  UserRole,
  AttendanceMode,
} from '@prisma/client';

@Injectable()
export class CourseSubscriptionService {
  private readonly logger = new Logger(CourseSubscriptionService.name);
  private readonly approvalService: CourseSubscriptionApprovalService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly coreService: CourseCoreService,
    private readonly enrollmentService: CourseEnrollmentService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
    @Optional() approvalService?: CourseSubscriptionApprovalService,
  ) {
    this.approvalService =
      approvalService ??
      new CourseSubscriptionApprovalService(
        this.prisma,
        this.coreService,
        this.notificationsService,
        this.realtimeGateway,
      );
  }

  /**
   * Handles student application to subscribe to an online course with Vodafone Cash payment receipt.
   */
  async requestCourseSubscription(
    courseId: string,
    studentId: string,
    dto: CourseSubscriptionRequestDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      },
    });

    if (!course) {
      throw new NotFoundException('الكورس المطلوب غير موجود');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('لا يمكن الاشتراك في كورس غير منشور أو مؤرشف');
    }

    let student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, fullName: true, phone: true } } },
    });
    if (!student) {
      student = await this.prisma.studentProfile.findFirst({
        where: { user: { id: studentId } },
        include: { user: { select: { id: true, fullName: true, phone: true } } },
      });
    }
    if (!student) {
      throw new NotFoundException('بيانات الطالب غير موجودة');
    }

    const resolvedStudentId = student.id;
    const isFree = Number(course.price) === 0;

    if (isFree) {
      return this.enrollmentService.enrollCourse(courseId, resolvedStudentId);
    }

    await this.prisma.courseProgress.deleteMany({
      where: {
        studentId: resolvedStudentId,
        courseId,
      },
    });

    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: {
          courseId,
          studentId: resolvedStudentId,
        },
      },
      create: {
        courseId,
        studentId: resolvedStudentId,
        status: CourseEnrollmentStatus.PENDING,
        senderPhone: dto.senderPhone,
        transferAmount: dto.transferAmount,
        receiptImageUrl: dto.receiptImageUrl,
      },
      update: {
        status: CourseEnrollmentStatus.PENDING,
        senderPhone: dto.senderPhone,
        transferAmount: dto.transferAmount,
        receiptImageUrl: dto.receiptImageUrl,
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
      },
    });

    await this.prisma.courseAccess.upsert({
      where: { enrollmentId: enrollment.id },
      create: {
        enrollmentId: enrollment.id,
        studentId: resolvedStudentId,
        courseId,
        accessStatus: CourseAccessStatus.SUSPENDED,
        validFrom: new Date(),
      },
      update: {
        accessStatus: CourseAccessStatus.SUSPENDED,
      },
    });

    this.logger.log(
      `Course subscription requested for student [${resolvedStudentId}] in course [${courseId}] with receipt`,
    );

    this.realtimeGateway?.notifyCourseSubscriptionsChanged([
      course.teacherId,
      student.user.id,
    ]);

    await this.coreService.clearCatalogCache();
    return {
      enrollmentId: enrollment.id,
      courseId,
      studentId: resolvedStudentId,
      status: enrollment.status,
      senderPhone: enrollment.senderPhone,
      transferAmount: enrollment.transferAmount ? Number(enrollment.transferAmount) : null,
      receiptImageUrl: enrollment.receiptImageUrl,
      message: 'تم إرسال طلب الاشتراك بنجاح وفي انتظار مراجعة المدرس أو السكرتارية',
    };
  }

  /**
   * Retrieves pending student enrollment requests for a teacher/secretariat.
   */
  async getPendingEnrollmentRequests(courseId: string, user: AuthenticatedUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          where: { status: CourseEnrollmentStatus.PENDING },
          include: {
            student: {
              include: {
                user: { select: { fullName: true, phone: true } },
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalPending: course.enrollments.length,
      requests: course.enrollments.map((e) => ({
        enrollmentId: e.id,
        studentId: e.studentId,
        studentName: e.student.user.fullName,
        studentPhone: e.student.user.phone,
        senderPhone: e.senderPhone,
        transferAmount: e.transferAmount ? Number(e.transferAmount) : null,
        receiptImageUrl: e.receiptImageUrl,
        submittedAt: e.enrolledAt,
        status: e.status,
      })),
    };
  }

  /**
   * Retrieves all subscription requests (pending, active, unsubscribed) across all online courses for a teacher.
   */
  async getTeacherSubscriptions(user: AuthenticatedUser) {
    const teacherId =
      user.role === UserRole.TEACHER
        ? user.teacherProfileId || user.id
        : undefined;

    const teacherCourses = await this.prisma.course.findMany({
      where: { ...(teacherId ? { teacherId } : {}) },
      select: { id: true, title: true, price: true },
    });

    const teacherCourseIds = teacherCourses.map((c) => c.id);

    const [enrollments, unsubscribedOnlineProfiles] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: {
          courseId: { in: teacherCourseIds },
        },
        include: {
          course: { select: { id: true, title: true, price: true } },
          student: {
            include: {
              user: { select: { fullName: true, phone: true } },
              parentLinks: {
                include: {
                  parent: { include: { user: { select: { fullName: true, phone: true } } } },
                },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.studentProfile.findMany({
        where: {
          attendanceMode: AttendanceMode.ONLINE,
          ...(teacherId ? { teacherId } : {}),
          enrollments: {
            none: {
              courseId: { in: teacherCourseIds },
              status: { in: [CourseEnrollmentStatus.ACTIVE, CourseEnrollmentStatus.PENDING] },
            },
          },
        },
        include: {
          user: { select: { fullName: true, phone: true } },
          parentLinks: {
            include: {
              parent: { include: { user: { select: { fullName: true, phone: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const pendingRequests = enrollments
      .filter((e) => e.status === CourseEnrollmentStatus.PENDING)
      .map((e) => ({
        id: e.id,
        studentId: e.studentId,
        studentName: e.student?.user?.fullName || 'طالب',
        studentCode: e.student?.studentCode || '',
        studentPhone: e.student?.user?.phone || '',
        parentPhone: e.student?.parentLinks?.[0]?.parent?.user?.phone || e.student?.emergencyPhone || '',
        courseId: e.courseId,
        courseTitle: e.course?.title || '',
        amount: Number(e.transferAmount || e.course?.price || 0),
        receiptUrl: e.receiptImageUrl || '',
        receiptImageUrl: e.receiptImageUrl || '',
        senderPhone: e.senderPhone || '',
        transferAmount: e.transferAmount ? Number(e.transferAmount) : null,
        date: e.enrolledAt ? new Date(e.enrolledAt).toISOString().split('T')[0] : '',
        enrolledAt: e.enrolledAt,
        status: e.status,
      }));

    const activeStudents = enrollments
      .filter((e) => e.status === CourseEnrollmentStatus.ACTIVE)
      .map((e) => ({
        id: e.id,
        studentId: e.studentId,
        studentName: e.student?.user?.fullName || 'طالب',
        studentCode: e.student?.studentCode || '',
        studentPhone: e.student?.user?.phone || '',
        parentPhone: e.student?.parentLinks?.[0]?.parent?.user?.phone || e.student?.emergencyPhone || '',
        courseId: e.courseId,
        courseTitle: e.course?.title || '',
        amount: Number(e.transferAmount || e.course?.price || 0),
        receiptUrl: e.receiptImageUrl || '',
        receiptImageUrl: e.receiptImageUrl || '',
        senderPhone: e.senderPhone || '',
        transferAmount: e.transferAmount ? Number(e.transferAmount) : null,
        date: e.reviewedAt
          ? new Date(e.reviewedAt).toISOString().split('T')[0]
          : e.enrolledAt
            ? new Date(e.enrolledAt).toISOString().split('T')[0]
            : '',
        enrolledAt: e.enrolledAt,
        reviewedAt: e.reviewedAt,
        status: e.status,
      }));

    const unsubscribedStudents = unsubscribedOnlineProfiles.map((s) => ({
      studentId: s.id,
      studentName: s.user?.fullName || 'طالب',
      studentCode: s.studentCode || '',
      studentPhone: s.user?.phone || '',
      parentPhone: s.parentLinks?.[0]?.parent?.user?.phone || s.emergencyPhone || '',
      parentName: s.parentLinks?.[0]?.parent?.user?.fullName || '',
      gradeLevel: s.gradeLevel || '',
      date: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '',
      createdAt: s.createdAt,
    }));

    return {
      pendingRequests,
      activeStudents,
      unsubscribedStudents,
      counts: {
        pending: pendingRequests.length,
        active: activeStudents.length,
        unsubscribed: unsubscribedStudents.length,
      },
    };
  }

  /**
   * Approves a student's subscription request, activating the enrollment and CourseAccess.
   */
  async approveSubscriptionRequest(enrollmentId: string, user: AuthenticatedUser) {
    return this.approvalService.approveSubscriptionRequest(enrollmentId, user);
  }

  /**
   * Rejects a student's subscription request with optional rejection reason.
   */
  async rejectSubscriptionRequest(
    enrollmentId: string,
    user: AuthenticatedUser,
    dto: RejectSubscriptionRequestDto,
  ) {
    return this.approvalService.rejectSubscriptionRequest(enrollmentId, user, dto);
  }

  /**
   * Cancels/revokes an active student's enrollment and suspends course access.
   */
  async cancelStudentSubscription(
    enrollmentId: string,
    user: AuthenticatedUser,
    reason?: string,
  ) {
    return this.approvalService.cancelStudentSubscription(enrollmentId, user, reason);
  }

  /**
   * Gets the student's enrollment and subscription review status for a course.
   */
  async getStudentCourseSubscriptionStatus(courseId: string, studentId: string) {
    let student = await this.prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) {
      student = await this.prisma.studentProfile.findFirst({ where: { user: { id: studentId } } });
    }
    if (!student) {
      return { isEnrolled: false, status: null };
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId: student.id,
        },
      },
      include: { access: true },
    });

    if (!enrollment) {
      return { isEnrolled: false, status: null };
    }

    return {
      isEnrolled:
        enrollment.status === CourseEnrollmentStatus.ACTIVE &&
        enrollment.access?.accessStatus === CourseAccessStatus.ACTIVE,
      status: enrollment.status,
      senderPhone: enrollment.senderPhone,
      transferAmount: enrollment.transferAmount ? Number(enrollment.transferAmount) : null,
      receiptImageUrl: enrollment.receiptImageUrl,
      rejectionReason: enrollment.rejectionReason,
      enrolledAt: enrollment.enrolledAt,
      reviewedAt: enrollment.reviewedAt,
    };
  }
}
