import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class StudentDeletionService {
  private readonly logger = new Logger(StudentDeletionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Removes / deletes a student completely from the system with all child records.
   */
  async deleteStudent(id: string, user: AuthenticatedUser) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true, parentLinks: true },
    });

    if (!student) {
      throw new NotFoundException(
        'حساب الطالب غير موجود في النظام أو تم حذفه مسبقاً',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Parent linkages & orphaned parent account cleanup
      const parentLinks = await tx.parentStudentLink.findMany({
        where: { studentId: id },
      });
      await tx.parentStudentLink.deleteMany({ where: { studentId: id } });
      if (parentLinks.length > 0) {
        const parentIds = Array.from(new Set(parentLinks.map((l) => l.parentId)));
        const remainingLinks = await tx.parentStudentLink.findMany({
          where: { parentId: { in: parentIds } },
          select: { parentId: true },
        });
        const remainingParentIdSet = new Set(
          remainingLinks.map((l) => l.parentId),
        );
        const orphanedParentIds = parentIds.filter(
          (pid) => !remainingParentIdSet.has(pid),
        );

        if (orphanedParentIds.length > 0) {
          await tx.parentProfile.deleteMany({
            where: { id: { in: orphanedParentIds } },
          });
          await tx.user.deleteMany({
            where: { id: { in: orphanedParentIds }, role: UserRole.PARENT },
          });
        }
      }

      // 2. Academic Group enrollments
      await tx.groupEnrollment.deleteMany({ where: { studentId: id } });

      // 3. Attendance records
      await tx.attendanceRecord.deleteMany({ where: { studentId: id } });

      // 4. Online Courses, progress & questions
      await tx.courseAccess.deleteMany({ where: { studentId: id } });
      await tx.lessonQuestion.deleteMany({ where: { studentId: id } });
      await tx.contentProgress.deleteMany({ where: { studentId: id } });
      await tx.courseProgress.deleteMany({ where: { studentId: id } });
      await tx.courseEnrollment.deleteMany({ where: { studentId: id } });

      // 5. Assessments, Homework & Evaluations
      await tx.assessmentSubmission.deleteMany({ where: { studentId: id } });
      await tx.homeworkRecord.deleteMany({ where: { studentId: id } });
      await tx.studentEvaluation.deleteMany({ where: { studentId: id } });

      // 6. Payments & Billing
      await tx.studentPaymentRecord.deleteMany({ where: { studentId: id } });

      // 7. Notifications & Push Subscriptions
      await tx.notification.deleteMany({ where: { recipientId: id } });
      await tx.pushSubscription.deleteMany({ where: { userId: id } });
      await tx.refreshTokenSession.deleteMany({ where: { userId: id } });

      // 8. Delete Student Profile
      await tx.studentProfile.deleteMany({ where: { id } });

      // 9. Delete User Record
      await tx.user.delete({ where: { id } });
    });

    this.logger.log(
      `Student [${id}] ${student.user.fullName} successfully deleted from system by [${user.id}]`,
    );
    return { success: true, message: 'تم حذف الطالب من النظام بنجاح' };
  }
}
