import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseCoreService } from './course-core.service';
import {
  CreateAndEnrollStudentDto,
  EnrollByQrDto,
} from '../dto/enrollment.dto';
import { CourseEnrollmentStatus, CourseAccessStatus, UserRole } from '@prisma/client';
import { normalizeEgyptianPhone } from '../../../common/utils/phone.util';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CourseRegistrationService {
  private readonly logger = new Logger(CourseRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coreService: CourseCoreService,
  ) {}

  /**
   * Creates a new student and enrolls them into the course immediately.
   */
  async createAndEnrollStudent(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAndEnrollStudentDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to manage enrollments for this course',
      );
    }

    const studentPhone = normalizeEgyptianPhone(dto.phone);
    const parentPhone = normalizeEgyptianPhone(dto.parentPhone);

    const generatedPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findFirst({
        where: { phone: studentPhone },
        include: { studentProfile: true },
      });

      let studentProfile = user?.studentProfile;

      if (!user) {
        const studentCode = await generateUniqueStudentCode(tx);
        const qrCodeToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

        user = await tx.user.create({
          data: {
            fullName: dto.fullName.trim(),
            phone: studentPhone,
            passwordHash,
            role: UserRole.STUDENT,
            isActive: true,
            studentProfile: {
              create: {
                studentCode,
                qrCodeToken,
                gradeLevel: dto.gradeLevel || course.gradeLevel,
                academicStage:
                  dto.academicStage || course.academicStage || 'SECONDARY',
                emergencyPhone: parentPhone,
              },
            },
          },
          include: { studentProfile: true },
        });

        studentProfile = user.studentProfile;
      }

      if (!studentProfile) {
        throw new BadRequestException('تعذر إنشاء ملف الطالب الأكاديمي');
      }

      if (dto.groupId) {
        await tx.groupEnrollment.upsert({
          where: {
            groupId_studentId: {
              groupId: dto.groupId,
              studentId: studentProfile.id,
            },
          },
          update: {},
          create: {
            groupId: dto.groupId,
            studentId: studentProfile.id,
          },
        });
      }

      const enrollment = await tx.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId,
            studentId: studentProfile.id,
          },
        },
        update: { status: CourseEnrollmentStatus.ACTIVE },
        create: {
          courseId,
          studentId: studentProfile.id,
          status: CourseEnrollmentStatus.ACTIVE,
        },
      });

      await tx.courseAccess.upsert({
        where: { enrollmentId: enrollment.id },
        update: { accessStatus: CourseAccessStatus.ACTIVE },
        create: {
          enrollmentId: enrollment.id,
          studentId: studentProfile.id,
          courseId,
          accessStatus: CourseAccessStatus.ACTIVE,
        },
      });

      return {
        studentId: studentProfile.id,
        studentCode: studentProfile.studentCode,
        fullName: user.fullName,
        phone: user.phone,
        generatedPassword,
        enrollmentId: enrollment.id,
      };
    });

    await this.coreService.clearCatalogCache();
    return {
      success: true,
      student: result,
      message: 'تم تسجيل الطالب وضمّه إلى الكورس بنجاح',
    };
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
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to manage enrollments for this course',
      );
    }

    const trimmedToken = dto.qrToken?.trim();
    if (!trimmedToken) {
      throw new BadRequestException('رمز الـ QR مطلوب');
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmedToken,
      );

    let parsedStudentId: string | null = null;
    let parsedToken: string | null = null;
    try {
      if (trimmedToken.startsWith('{') && trimmedToken.endsWith('}')) {
        const json = JSON.parse(trimmedToken);
        if (json.studentId) parsedStudentId = json.studentId;
        if (json.token) parsedToken = json.token;
      }
    } catch {
      // Not JSON
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          { qrCodeToken: trimmedToken },
          { studentCode: trimmedToken },
          ...(isUuid ? [{ id: trimmedToken }] : []),
          ...(parsedStudentId ? [{ id: parsedStudentId }] : []),
          ...(parsedToken ? [{ qrCodeToken: parsedToken }] : []),
        ],
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
      },
    });

    if (!student) {
      throw new NotFoundException(
        'لم يتم العثور على طالب مطابق لرمز الـ QR الممسوح',
      );
    }

    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: {
          courseId,
          studentId: student.id,
        },
      },
      update: { status: CourseEnrollmentStatus.ACTIVE },
      create: {
        courseId,
        studentId: student.id,
        status: CourseEnrollmentStatus.ACTIVE,
      },
    });

    await this.prisma.courseAccess.upsert({
      where: { enrollmentId: enrollment.id },
      update: { accessStatus: CourseAccessStatus.ACTIVE },
      create: {
        enrollmentId: enrollment.id,
        studentId: student.id,
        courseId,
        accessStatus: CourseAccessStatus.ACTIVE,
      },
    });

    await this.coreService.clearCatalogCache();
    return {
      success: true,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.user.fullName,
        phone: student.user.phone,
        gradeLevel: student.gradeLevel,
      },
      message: `تم ضم الطالب ${student.user.fullName} إلى الكورس بنجاح عبر الـ QR`,
    };
  }
}
