import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseCoreService } from './course-core.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { RejectSubscriptionRequestDto } from '../dto/enrollment.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  CourseEnrollmentStatus,
  CourseAccessStatus,
  UserRole,
  NotificationType,
  NotificationChannel,
} from '@prisma/client';

@Injectable()
export class CourseSubscriptionApprovalService {
  private readonly logger = new Logger(CourseSubscriptionApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coreService: CourseCoreService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  /**
   * Approves a student's subscription request, activating the enrollment and CourseAccess.
   */
  async approveSubscriptionRequest(
    enrollmentId: string,
    user: AuthenticatedUser,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: { course: true, student: { include: { user: true } } },
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment request [${enrollmentId}] not found`);
      }

      if (
        user.role === UserRole.TEACHER &&
        enrollment.course.teacherId !== user.teacherProfileId &&
        enrollment.course.teacherId !== user.id
      ) {
        throw new ForbiddenException(
          'Not authorized to approve this course enrollment',
        );
      }

      const updatedEnrollment = await tx.courseEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: CourseEnrollmentStatus.ACTIVE,
          reviewedAt: new Date(),
          reviewedById: user.id,
          rejectionReason: null,
        },
      });

      const access = await tx.courseAccess.upsert({
        where: { enrollmentId: enrollment.id },
        create: {
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          accessStatus: CourseAccessStatus.ACTIVE,
          validFrom: new Date(),
          grantedById: user.id,
        },
        update: {
          accessStatus: CourseAccessStatus.ACTIVE,
          validFrom: new Date(),
          grantedById: user.id,
        },
      });

      this.logger.log(
        `Approved enrollment [${enrollmentId}] for student [${enrollment.studentId}] in course [${enrollment.courseId}]`,
      );

      if (this.notificationsService && enrollment.student?.user?.id) {
        this.notificationsService
          .sendNotification({
            recipientId: enrollment.student.user.id,
            notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
            type: 'COURSE_SUBSCRIPTION_APPROVED',
            title: `تمت الموافقة على اشتراكك في الكورس 🎉`,
            body: `تم تفعيل اشتراكك في كورس "${enrollment.course.title}" بنجاح! يمكنك الآن مشاهدة جميع الدروس والبدء في المذاكرة.`,
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
            data: {
              courseId: enrollment.courseId,
              enrollmentId: enrollment.id,
            },
            referenceEntityId: enrollment.id,
          })
          .catch((err) => {
            this.logger.warn(`Failed to dispatch student approval notification`, err);
          });
      }

      this.realtimeGateway?.notifyCourseSubscriptionsChanged([
        enrollment.course.teacherId,
        enrollment.student?.user?.id,
      ]);

      return {
        enrollmentId: updatedEnrollment.id,
        courseId: updatedEnrollment.courseId,
        studentId: updatedEnrollment.studentId,
        status: updatedEnrollment.status,
        accessStatus: access.accessStatus,
        message: 'تم قبول وتفعيل اشتراك الطالب بنجاح',
      };
    });
    await this.coreService.clearCatalogCache();
    return result;
  }

  /**
   * Rejects a student's subscription request with optional rejection reason.
   */
  async rejectSubscriptionRequest(
    enrollmentId: string,
    user: AuthenticatedUser,
    dto: RejectSubscriptionRequestDto,
  ) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true, student: { include: { user: true } } },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment request [${enrollmentId}] not found`);
    }

    if (
      user.role === UserRole.TEACHER &&
      enrollment.course.teacherId !== user.teacherProfileId &&
      enrollment.course.teacherId !== user.id
    ) {
      throw new ForbiddenException(
        'Not authorized to reject this course enrollment',
      );
    }

    const updated = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: CourseEnrollmentStatus.DROPPED,
        rejectionReason:
          dto.rejectionReason ||
          'تم رفض طلب الاشتراك أو لم يتم التحقق من صحة الإيصال.',
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
    });

    await this.prisma.courseAccess.updateMany({
      where: { enrollmentId },
      data: { accessStatus: CourseAccessStatus.SUSPENDED },
    });

    if (this.notificationsService && enrollment.student?.user?.id) {
      this.notificationsService
        .sendNotification({
          recipientId: enrollment.student.user.id,
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          type: 'COURSE_SUBSCRIPTION_REJECTED',
          title: `تم رفض طلب الاشتراك في الكورس`,
          body: `نأسف، تم رفض طلب اشتراكك في كورس "${enrollment.course.title}". السبب: ${updated.rejectionReason}`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
          data: {
            courseId: enrollment.courseId,
            enrollmentId: enrollment.id,
            rejectionReason: updated.rejectionReason,
          },
          referenceEntityId: enrollment.id,
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch student rejection notification`, err);
        });
    }

    this.realtimeGateway?.notifyCourseSubscriptionsChanged([
      enrollment.course.teacherId,
      enrollment.student?.user?.id,
    ]);

    await this.coreService.clearCatalogCache();
    return {
      enrollmentId: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      message: 'تم رفض طلب الاشتراك.',
    };
  }

  /**
   * Cancels/revokes an active student's enrollment and suspends course access.
   */
  async cancelStudentSubscription(
    enrollmentId: string,
    user: AuthenticatedUser,
    reason?: string,
  ) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true, student: { include: { user: true } } },
    });

    if (!enrollment) {
      throw new NotFoundException(`اشتراك الطالب [${enrollmentId}] غير موجود`);
    }

    if (
      user.role === UserRole.TEACHER &&
      enrollment.course.teacherId !== user.teacherProfileId &&
      enrollment.course.teacherId !== user.id
    ) {
      throw new ForbiddenException('غير مصرح لك بإلغاء هذا الاشتراك');
    }

    const updated = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: CourseEnrollmentStatus.DROPPED,
        rejectionReason: reason || 'تم إلغاء الاشتراك في الكورس من قبل المعلم.',
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
    });

    await this.prisma.courseAccess.updateMany({
      where: { enrollmentId },
      data: { accessStatus: CourseAccessStatus.SUSPENDED },
    });

    await this.prisma.courseProgress.deleteMany({
      where: {
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
      },
    });

    const [courseRecord, unitQuizzes, lessonQuizzes] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: enrollment.courseId },
        select: { courseQuizId: true },
      }),
      this.prisma.courseModule.findMany({
        where: { courseId: enrollment.courseId, unitQuizId: { not: null } },
        select: { unitQuizId: true },
      }),
      this.prisma.courseLesson.findMany({
        where: {
          module: { courseId: enrollment.courseId },
          lessonQuizId: { not: null },
        },
        select: { lessonQuizId: true },
      }),
    ]);

    const quizIds: string[] = [
      ...(courseRecord?.courseQuizId ? [courseRecord.courseQuizId] : []),
      ...unitQuizzes.map((u) => u.unitQuizId as string),
      ...lessonQuizzes.map((l) => l.lessonQuizId as string),
    ];

    if (quizIds.length > 0) {
      await this.prisma.assessmentSubmission.deleteMany({
        where: {
          assessmentId: { in: quizIds },
          studentId: enrollment.studentId,
        },
      });
    }

    if (this.notificationsService && enrollment.student?.user?.id) {
      this.notificationsService
        .sendNotification({
          recipientId: enrollment.student.user.id,
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          type: 'COURSE_SUBSCRIPTION_CANCELLED',
          title: `تم إلغاء اشتراكك في الكورس`,
          body: `تم إلغاء اشتراكك في كورس "${enrollment.course.title}" من قبل المعلم.${reason ? ` السبب: ${reason}` : ''}`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
          data: {
            courseId: enrollment.courseId,
            enrollmentId: enrollment.id,
            reason: updated.rejectionReason,
          },
          referenceEntityId: enrollment.id,
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch student cancellation notification`, err);
        });
    }

    this.realtimeGateway?.notifyCourseSubscriptionsChanged([
      enrollment.course.teacherId,
      enrollment.student?.user?.id,
    ]);

    await this.coreService.clearCatalogCache();
    return {
      enrollmentId: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      message: 'تم إلغاء اشتراك الطالب وتعليق وصوله للكورس بنجاح.',
    };
  }
}
