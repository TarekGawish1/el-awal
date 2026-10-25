import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  UserRole,
  GroupEnrollmentStatus,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { getTemporaryPinExpiration } from '../../../common/utils/password.util';
import { formatStudentApprovalMessage } from '../../../utils/spintax';

@Injectable()
export class StudentRegistrationService {
  private readonly logger = new Logger(StudentRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Atomic Registration Workflow for Student + Parent + Initial Group Enrollment.
   */
  async createStudent(dto: CreateStudentDto, currentUser?: AuthenticatedUser) {
    const creatorName =
      currentUser?.fullName ||
      (currentUser?.role === UserRole.SECRETARIAT ? 'المساعد' : 'المعلم');
    const creatorId = currentUser?.id || null;

    const result = await this.prisma.$transaction(async (tx) => {
      // 0. Check if student already exists (Idempotent for offline sync retries)
      if (dto.id) {
        const existingStudent = await tx.studentProfile.findUnique({
          where: { id: dto.id },
          include: { user: true, parentLinks: true, groupEnrollments: true },
        });
        if (existingStudent) {
          return {
            id: existingStudent.id,
            studentCode: existingStudent.studentCode,
            fullName: existingStudent.user.fullName,
            phone: existingStudent.user.phone,
            email: existingStudent.user.email,
            gradeLevel: existingStudent.gradeLevel,
            academicStage: existingStudent.academicStage,
            academicStatus: existingStudent.academicStatus,
            attendanceMode: existingStudent.attendanceMode,
            qrCodeToken: existingStudent.qrCodeToken,
            createdAt: existingStudent.createdAt,
            hasParentLinked: existingStudent.parentLinks.length > 0,
            enrolledGroupId: existingStudent.groupEnrollments[0]?.groupId || null,
            createdByName: existingStudent.createdByName,
            updatedByName: existingStudent.updatedByName,
            parentUserId: existingStudent.parentLinks[0]?.parentId || null,
            groupName: null,
            teacherDisplayName: 'أستاذ أحمد غريب',
          };
        }
      }

      // 1. Check for phone or email collisions on user
      if (dto.phone) {
        const existingPhone = await tx.user.findUnique({
          where: { phone: dto.phone },
        });
        if (existingPhone) {
          throw new ConflictException(
            `Phone number [${dto.phone}] is already registered`,
          );
        }
      }

      if (dto.email) {
        const existingEmail = await tx.user.findUnique({
          where: { email: dto.email },
        });
        if (existingEmail) {
          throw new ConflictException(`Email [${dto.email}] is already registered`);
        }
      }

      // 2. Hash student password
      const passwordHash = await bcrypt.hash(dto.password, 10);

      // 3. Create Student User Record
      const user = await tx.user.create({
        data: {
          id: dto.id || undefined,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          role: UserRole.STUDENT,
          isActive: true,
        },
      });

      // 4. Generate unique studentCode and cryptographic QR token
      const studentCode = await generateUniqueStudentCode(tx);
      const qrCodeToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

      // 5. Create StudentProfile
      const studentProfile = await tx.studentProfile.create({
        data: {
          id: user.id,
          studentCode,
          qrCodeToken,
          gradeLevel: dto.gradeLevel,
          academicStage: dto.academicStage,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          emergencyPhone: dto.emergencyPhone,
          tempAccessPin: dto.password,
          pinExpiresAt: getTemporaryPinExpiration(48),
          pendingCredentials: {
            studentPassword: dto.password,
            parentPassword: dto.password,
            studentPhone: dto.phone,
            parentPhone: dto.parentPhone,
            createdAt: new Date().toISOString(),
          },
          createdById: creatorId,
          createdByName: creatorName,
          updatedById: creatorId,
          updatedByName: creatorName,
        },
      });

      // 6. Parent Profile & Linkage (if provided)
      let parentLink = null;
      let parentUser = null;
      if (dto.parentPhone) {
        parentUser = await tx.user.findUnique({
          where: { phone: dto.parentPhone },
          include: { parentProfile: true },
        });

        if (!parentUser) {
          const parentPasswordHash = await bcrypt.hash(dto.password, 10);
          parentUser = await tx.user.create({
            data: {
              fullName: dto.parentName || `ولي أمر ${dto.fullName}`,
              phone: dto.parentPhone,
              passwordHash: parentPasswordHash,
              role: UserRole.PARENT,
              isActive: true,
              parentProfile: {
                create: {
                  relationshipType: dto.parentRelationship || 'Guardian',
                },
              },
            },
            include: { parentProfile: true },
          });
        } else if (!parentUser.parentProfile) {
          await tx.parentProfile.create({
            data: {
              id: parentUser.id,
              relationshipType: dto.parentRelationship || 'Guardian',
            },
          });
        }

        parentLink = await tx.parentStudentLink.create({
          data: {
            parentId: parentUser.id,
            studentId: studentProfile.id,
          },
        });
      }

      // 7. Initial Group Enrollment (if specified)
      let initialEnrollment = null;
      let groupRecord = null;
      if (dto.initialGroupId) {
        groupRecord = await tx.academicGroup.findUnique({
          where: { id: dto.initialGroupId },
          include: {
            teacher: { include: { user: true } },
            _count: {
              select: {
                enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
              },
            },
          },
        });

        if (!groupRecord) {
          throw new NotFoundException(`Target group [${dto.initialGroupId}] not found`);
        }

        if (groupRecord._count.enrollments >= groupRecord.maxCapacity) {
          throw new BadRequestException(
            `Group [${groupRecord.name}] has reached its max capacity (${groupRecord.maxCapacity})`,
          );
        }

        initialEnrollment = await tx.groupEnrollment.create({
          data: {
            groupId: dto.initialGroupId,
            studentId: studentProfile.id,
            status: GroupEnrollmentStatus.ACTIVE,
          },
        });
      }

      this.logger.log(`Student created successfully: [${studentCode}] ${dto.fullName}`);

      const teacherDisplayName =
        groupRecord?.teacher?.user?.fullName ||
        (currentUser?.role === UserRole.TEACHER
          ? currentUser.fullName
          : 'أستاذ أحمد غريب');

      return {
        id: studentProfile.id,
        studentCode: studentProfile.studentCode,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        gradeLevel: studentProfile.gradeLevel,
        academicStage: studentProfile.academicStage,
        academicStatus: studentProfile.academicStatus,
        attendanceMode: studentProfile.attendanceMode,
        qrCodeToken: studentProfile.qrCodeToken,
        createdAt: studentProfile.createdAt,
        hasParentLinked: !!parentLink,
        enrolledGroupId: initialEnrollment?.groupId || null,
        parentUserId: parentUser?.id || null,
        groupName: groupRecord?.name || null,
        teacherDisplayName,
      };
    });

    // 8. Automated Parent WhatsApp Delivery on Manual Registration
    if (dto.sendWhatsApp !== false && (dto.parentPhone || dto.phone)) {
      try {
        const whatsappPhone = dto.parentPhone || dto.phone;
        const parentRecipientId = result.parentUserId || result.id;
        const teacherName = result.teacherDisplayName || 'أستاذ أحمد غريب';
        const centerName = `منصة الأول للرياضيات - ${teacherName}`;

        const messageBody = formatStudentApprovalMessage({
          parentName: dto.parentName || `ولي أمر ${dto.fullName}`,
          studentName: dto.fullName,
          studentPhoneOrCode: dto.phone || result.studentCode,
          studentPassword: dto.password,
          parentPhoneOrCode: dto.parentPhone || undefined,
          parentPassword: dto.password,
          platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
          centerName,
          groupName: result.groupName || undefined,
        });

        await this.notificationsService.sendNotification({
          recipientId: parentRecipientId,
          type: 'STUDENT_APPROVAL_CREDENTIALS',
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          title: `🎉 مرحباً بك! بيانات انضمام الطالب ${dto.fullName}`,
          body: messageBody,
          channels: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
          data: {
            studentId: result.id,
            studentName: dto.fullName,
            studentPhoneOrCode: dto.phone || result.studentCode,
            studentPassword: dto.password,
            parentPhone: whatsappPhone,
            parentPassword: dto.password,
            parentName: dto.parentName || `ولي أمر ${dto.fullName}`,
            groupName: result.groupName || undefined,
            centerName,
            platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
            phone: whatsappPhone,
          },
        });

        // Safely clear pendingCredentials once notification is successfully enqueued
        await this.prisma.studentProfile.update({
          where: { id: result.id },
          data: { pendingCredentials: null },
        }).catch((err) => {
          this.logger.warn(`Failed to clear pendingCredentials for student [${result.id}]: ${err.message}`);
        });

        this.logger.log(
          `📱 Registration credentials WhatsApp dispatched to parent ${whatsappPhone} for student ${dto.fullName}`,
        );
      } catch (waErr) {
        this.logger.warn(
          `Failed to queue manual registration WhatsApp notification: ${waErr}`,
        );
      }
    }

    return result;
  }
}
