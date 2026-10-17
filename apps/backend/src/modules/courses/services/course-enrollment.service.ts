import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseCoreService } from './course-core.service';
import { CourseRegistrationService } from './course-registration.service';
import {
  EnrollStudentsBatchDto,
  CreateAndEnrollStudentDto,
  EnrollByQrDto,
} from '../dto/enrollment.dto';
import { CourseStatus, CourseEnrollmentStatus, CourseAccessStatus } from '@prisma/client';

@Injectable()
export class CourseEnrollmentService {
  private readonly logger = new Logger(CourseEnrollmentService.name);
  private readonly registrationService: CourseRegistrationService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly coreService: CourseCoreService,
    @Optional() registrationService?: CourseRegistrationService,
  ) {
    this.registrationService =
      registrationService ??
      new CourseRegistrationService(this.prisma, this.coreService);
  }

  /**
   * Student course enrollment with atomic CourseEnrollment and CourseAccess provisioning.
   */
  async enrollCourse(courseId: string, studentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new NotFoundException(`Course [${courseId}] not found`);
      }

      if (course.status !== CourseStatus.PUBLISHED) {
        throw new BadRequestException('Cannot enroll in an unpublished or archived course');
      }

      let student = await tx.studentProfile.findUnique({ where: { id: studentId } });
      if (!student) {
        student = await tx.studentProfile.findFirst({ where: { user: { id: studentId } } });
      }
      if (!student) {
        throw new NotFoundException(`Student [${studentId}] not found`);
      }

      const resolvedStudentId = student.id;

      const enrollment = await tx.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId,
            studentId: resolvedStudentId,
          },
        },
        create: {
          courseId,
          studentId: resolvedStudentId,
          status: CourseEnrollmentStatus.ACTIVE,
        },
        update: {
          status: CourseEnrollmentStatus.ACTIVE,
        },
      });

      const access = await tx.courseAccess.upsert({
        where: { enrollmentId: enrollment.id },
        create: {
          enrollmentId: enrollment.id,
          studentId: resolvedStudentId,
          courseId,
          accessStatus: CourseAccessStatus.ACTIVE,
          validFrom: new Date(),
        },
        update: {
          accessStatus: CourseAccessStatus.ACTIVE,
        },
      });

      this.logger.log(`Student [${studentId}] enrolled in course [${courseId}]`);

      return {
        enrollmentId: enrollment.id,
        courseId,
        studentId,
        status: enrollment.status,
        accessStatus: access.accessStatus,
        enrolledAt: enrollment.enrolledAt,
      };
    });
  }

  /**
   * Retrieves enrolled students for a specific course.
   */
  async getCourseEnrollments(courseId: string, teacherId: string, isSecretariat: boolean) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { fullName: true, phone: true, email: true } },
              },
            },
            access: true,
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to view enrollments for this course');
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalEnrolled: course.enrollments.length,
      enrollments: course.enrollments.map((e) => ({
        enrollmentId: e.id,
        studentId: e.studentId,
        studentName: e.student.user.fullName,
        studentPhone: e.student.user.phone,
        studentEmail: e.student.user.email,
        status: e.status,
        accessStatus: e.access?.accessStatus || null,
        validUntil: e.access?.validUntil || null,
        enrolledAt: e.enrolledAt,
      })),
    };
  }

  /**
   * Bulk enrolls students into an online course.
   */
  async enrollStudentsBatch(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: EnrollStudentsBatchDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage enrollments for this course');
    }

    const uniqueStudentIds = Array.from(new Set(dto.studentIds));
    if (uniqueStudentIds.length === 0) {
      throw new BadRequestException('Student IDs array cannot be empty');
    }

    const results = await this.prisma.$transaction(async (tx) => {
      if (tx.courseEnrollment?.createMany && tx.courseAccess?.createMany) {
        try {
          const existingEnrollments = (await tx.courseEnrollment.findMany({
            where: { courseId, studentId: { in: uniqueStudentIds } },
            select: { id: true, studentId: true, status: true },
          })) || [];

          const existingStudentIds = new Set(existingEnrollments.map((e) => e.studentId));
          const missingStudentIds = uniqueStudentIds.filter((sId) => !existingStudentIds.has(sId));
          const nonActiveStudentIds = existingEnrollments
            .filter((e) => e.status !== CourseEnrollmentStatus.ACTIVE)
            .map((e) => e.studentId);

          if (nonActiveStudentIds.length > 0) {
            await tx.courseEnrollment.updateMany({
              where: { courseId, studentId: { in: nonActiveStudentIds } },
              data: { status: CourseEnrollmentStatus.ACTIVE },
            });
          }

          if (missingStudentIds.length > 0) {
            await tx.courseEnrollment.createMany({
              data: missingStudentIds.map((sId) => ({
                courseId,
                studentId: sId,
                status: CourseEnrollmentStatus.ACTIVE,
              })),
              skipDuplicates: true,
            });
          }

          const allEnrollments = (await tx.courseEnrollment.findMany({
            where: { courseId, studentId: { in: uniqueStudentIds } },
            select: { id: true, studentId: true },
          })) || [];

          if (allEnrollments.length > 0) {
            const allEnrollmentIds = allEnrollments.map((e) => e.id);
            const existingAccess = (await tx.courseAccess.findMany({
              where: { enrollmentId: { in: allEnrollmentIds } },
              select: { enrollmentId: true },
            })) || [];
            const existingAccessEnrollmentIds = new Set(existingAccess.map((a) => a.enrollmentId));
            const missingAccessEnrollments = allEnrollments.filter(
              (e) => !existingAccessEnrollmentIds.has(e.id),
            );

            if (existingAccess.length > 0) {
              await tx.courseAccess.updateMany({
                where: { enrollmentId: { in: Array.from(existingAccessEnrollmentIds) } },
                data: { accessStatus: CourseAccessStatus.ACTIVE },
              });
            }

            if (missingAccessEnrollments.length > 0) {
              await tx.courseAccess.createMany({
                data: missingAccessEnrollments.map((e) => ({
                  enrollmentId: e.id,
                  studentId: e.studentId,
                  courseId,
                  accessStatus: CourseAccessStatus.ACTIVE,
                })),
                skipDuplicates: true,
              });
            }

            return allEnrollments;
          }
        } catch {
          // Fall through to fallback loop
        }
      }

      return Promise.all(
        uniqueStudentIds.map(async (studentId) => {
          const enrollment = await tx.courseEnrollment.upsert({
            where: { courseId_studentId: { courseId, studentId } },
            update: { status: CourseEnrollmentStatus.ACTIVE },
            create: { courseId, studentId, status: CourseEnrollmentStatus.ACTIVE },
          });

          await tx.courseAccess.upsert({
            where: { enrollmentId: enrollment.id },
            update: { accessStatus: CourseAccessStatus.ACTIVE },
            create: {
              enrollmentId: enrollment.id,
              studentId,
              courseId,
              accessStatus: CourseAccessStatus.ACTIVE,
            },
          });

          return enrollment;
        }),
      );
    });

    await this.coreService.clearCatalogCache();
    return {
      success: true,
      enrolledCount: results.length,
      message: `تم ضم ${results.length} طالب إلى الكورس بنجاح`,
    };
  }

  /**
   * Creates a new student and enrolls them into the course immediately.
   */
  async createAndEnrollStudent(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAndEnrollStudentDto,
  ) {
    return this.registrationService.createAndEnrollStudent(
      courseId,
      teacherId,
      isSecretariat,
      dto,
    );
  }

  /**
   * Enrolls a student into a course using their scanned QR code token or student code.
   */
  async enrollByQrToken(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: EnrollByQrDto,
  ) {
    return this.registrationService.enrollByQrToken(
      courseId,
      teacherId,
      isSecretariat,
      dto,
    );
  }

  /**
   * Revokes student enrollment from a course.
   */
  async revokeStudentEnrollment(
    courseId: string,
    studentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage enrollments for this course');
    }

    await this.prisma.courseEnrollment.deleteMany({
      where: {
        courseId,
        studentId,
      },
    });

    await this.coreService.clearCatalogCache();
    return {
      success: true,
      message: 'تم إلغاء اشتراك الطالب في هذا الكورس بنجاح',
    };
  }
}
