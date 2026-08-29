import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma, GroupEnrollmentStatus, UserRole, NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthService } from './auth.service';
import { RegisterStudentDto } from '../dto/student-registration.dto';
import { normalizeEgyptianPhone, getPhoneVariants } from '../../../common/utils/phone.util';
import { generateSecurePassword } from '../../../common/utils/password.util';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { formatStudentApprovalMessage, formatStudentRegistrationMessage } from '../../../utils/spintax';

export interface StudentRegistrationResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    role: UserRole;
    studentProfileId?: string;
  };
  credentials: {
    studentCode: string;
    studentPhone: string;
    studentPassword: string;
    parentPhone: string;
    parentPassword: string | null;
    parentIsNew: boolean;
  };
}

@Injectable()
export class StudentRegistrationService {
  private readonly logger = new Logger(StudentRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Self-service student registration.
   *
   * Creates, atomically, the Student User + StudentProfile, the Parent User +
   * ParentProfile (or links an existing parent by phone), and the
   * ParentStudentLink. Server-side generated credentials (student code and
   * random passwords) are returned exactly once; only bcrypt hashes are
   * persisted. The student is auto-authenticated with the STUDENT role — the
   * role is never accepted from the client.
   *
   * Identity/duplicate strategy: `users.phone` is the unique identifier (names
   * are never treated as unique). Both student and parent phones are
   * normalized to a canonical form before uniqueness checks so that the same
   * number submitted in different formats cannot slip through.
   */
  async registerStudent(dto: RegisterStudentDto): Promise<StudentRegistrationResult> {
    const studentPhone = normalizeEgyptianPhone(dto.studentPhone);
    const parentPhone = dto.parentPhone ? normalizeEgyptianPhone(dto.parentPhone) : null;
    const fullName = dto.fullName.trim();

    if (parentPhone && studentPhone === parentPhone) {
      throw new ConflictException({
        code: 'PHONES_MUST_DIFFER',
        message: 'رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب',
      });
    }

    const studentPassword = generateSecurePassword();
    const studentPasswordHash = await bcrypt.hash(studentPassword, 10);

    let parentPassword: string | null = null;
    let parentIsNew = false;
    let studentCode = '';
    let studentUser;

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        // 1. Student phone must not already belong to any account (anti-duplicate)
        const existingStudent = await tx.user.findFirst({
          where: { phone: { in: getPhoneVariants(studentPhone) } },
          select: { id: true, role: true },
        });
        if (existingStudent) {
          throw new ConflictException({
            code: 'PHONE_ALREADY_REGISTERED',
            message: 'رقم هاتف الطالب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة',
          });
        }

        // 2. Generate unique student code and QR credential
        studentCode = await generateUniqueStudentCode(tx);
        const qrCodeToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

        // 3. Create Student User + StudentProfile (shared primary key)
        const createdStudentUser = await tx.user.create({
          data: {
            fullName,
            phone: studentPhone,
            passwordHash: studentPasswordHash,
            role: UserRole.STUDENT,
            isActive: true,
            studentProfile: {
              create: {
                studentCode,
                qrCodeToken,
                gradeLevel: dto.gradeLevel,
                academicStage: dto.academicStage,
                attendanceMode: dto.attendanceMode as any,
                emergencyPhone: parentPhone,
                tempAccessPin: studentPassword,
                pinExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          include: { studentProfile: true },
        });

        // 4. Resolve parent: reuse an existing parent by phone or create one
        let parentUserId: string | null = null;
        
        if (parentPhone) {
          const existingParent = await tx.user.findFirst({
            where: { phone: { in: getPhoneVariants(parentPhone) } },
            select: { id: true, role: true, deletedAt: true },
          });

          if (existingParent) {
            if (existingParent.deletedAt) {
              await tx.user.update({
                where: { id: existingParent.id },
                data: { deletedAt: null, isActive: true },
              });
            }
            parentUserId = existingParent.id;

            const parentProfile = await tx.parentProfile.findUnique({
              where: { id: existingParent.id },
              select: { id: true },
            });
            if (!parentProfile) {
              await tx.parentProfile.create({
                data: { id: existingParent.id, relationshipType: 'ولي أمر' },
              });
            }
          } else {
            parentPassword = generateSecurePassword();
            const parentPasswordHash = await bcrypt.hash(parentPassword, 10);
            const newParentUser = await tx.user.create({
              data: {
                fullName: `ولي أمر ${fullName}`,
                phone: parentPhone,
                passwordHash: parentPasswordHash,
                role: UserRole.PARENT,
                isActive: true,
                parentProfile: {
                  create: { relationshipType: 'ولي أمر' },
                },
              },
            });
            parentUserId = newParentUser.id;
            parentIsNew = true;
          }

          // 5. Link parent ↔ student
          await tx.parentStudentLink.create({
            data: {
              parentId: parentUserId,
              studentId: createdStudentUser.id,
            },
          });
        }

        // Save pendingCredentials so they can be sent to the parent via WhatsApp when accepted
        await tx.studentProfile.update({
          where: { id: createdStudentUser.id },
          data: {
            pendingCredentials: {
              studentPassword,
              parentPassword: parentIsNew ? parentPassword : null,
              studentPhone,
              parentPhone: parentPhone || null,
            },
          },
        });

        return { studentUser: createdStudentUser };
      });

      studentUser = txResult.studentUser;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn('Student registration collided on a unique constraint');
        throw new ConflictException({
          code: 'IDENTIFIER_ALREADY_IN_USE',
          message: 'رقم الهاتف أو الكود مستخدم بالفعل، يرجى المحاولة مرة أخرى',
        });
      }
      throw error;
    }

    this.logger.log(
      `Student self-registration completed: [${studentCode}] ${fullName} (parent ${parentIsNew ? 'created' : 'linked'})`,
    );

    // 6. If a groupId was provided (direct group link registration):
    //    Direct group links do NOT require teacher acceptance!
    //    Create an ACTIVE enrollment directly and record initial tuition.
    let groupRecord: {
      id: string;
      name: string;
      teacher?: { user?: { fullName: string } | null } | null;
    } | null = null;

    if (dto.groupId) {
      try {
        const group = await this.prisma.academicGroup.findUnique({
          where: { id: dto.groupId },
          select: {
            id: true,
            name: true,
            isActive: true,
            monthlyFee: true,
            teacher: { select: { user: { select: { fullName: true } } } },
          },
        });

        if (group && group.isActive) {
          groupRecord = {
            id: group.id,
            name: group.name,
            teacher: group.teacher,
          };
          await this.prisma.groupEnrollment.upsert({
            where: { groupId_studentId: { groupId: dto.groupId, studentId: studentUser.id } },
            create: {
              groupId: dto.groupId,
              studentId: studentUser.id,
              status: GroupEnrollmentStatus.ACTIVE,
            },
            update: { status: GroupEnrollmentStatus.ACTIVE },
          });

          // Create initial payment record for the active enrollment
          const now = new Date();
          const amount = group.monthlyFee ? Number(group.monthlyFee) : 0;
          await this.prisma.studentPaymentRecord.create({
            data: {
              student: { connect: { id: studentUser.id } },
              group: { connect: { id: dto.groupId } },
              recordedBy: { connect: { id: studentUser.id } },
              periodYear: now.getFullYear(),
              periodMonth: now.getMonth() + 1,
              amountExpected: amount,
              amountPaid: 0,
              paymentStatus: 'PENDING' as any,
              paymentType: 'TUITION' as any,
              paymentMethod: 'CASH',
              notes: 'تسجيل مباشر عبر رابط المجموعة',
            },
          }).catch(() => undefined);

          this.logger.log(
            `ACTIVE enrollment created for student [${studentCode}] in group [${dto.groupId}] via direct link`,
          );
        }
      } catch (enrollErr) {
        this.logger.warn(`Failed to create ACTIVE enrollment for group ${dto.groupId}: ${enrollErr}`);
      }
    }

    // 7. Auto-authenticate the student (role STUDENT, server-determined)
    const tokens = await this.authService.issueTokens({
      id: studentUser.id,
      fullName: studentUser.fullName,
      email: null,
      phone: studentUser.phone,
      role: UserRole.STUDENT,
      studentProfile: { id: studentUser.id },
    });

    // 8. Dispatch WhatsApp notification via NotificationsService:
    //    - If direct group link: Send Group Acceptance Message directly to parent!
    //    - If general registration: Send Account Credentials message.
    try {
      const whatsappPhone = parentPhone || studentPhone;

      // Resolve the recipient (parent user ID if linked, else student ID)
      const recipientId = parentPhone
        ? ((await this.prisma.user.findFirst({
            where: { phone: { in: getPhoneVariants(parentPhone) } },
            select: { id: true },
          }))?.id ?? studentUser.id)
        : studentUser.id;

      if (groupRecord) {
        // Direct Group Link Registration: Direct acceptance message!
        const teacherName = groupRecord.teacher?.user?.fullName;
        const centerName = teacherName ? `مجموعة الأستاذ ${teacherName}` : 'منصة الأوّل التعليمية';
        const messageBody = formatStudentApprovalMessage({
          parentName: parentPhone ? `ولي أمر ${fullName}` : fullName,
          studentName: fullName,
          studentPhoneOrCode: studentPhone,
          studentPassword,
          parentPhoneOrCode: parentPhone || undefined,
          parentPassword: parentIsNew ? parentPassword : undefined,
          platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
          centerName,
          groupName: groupRecord.name,
        });

        await this.notificationsService.sendNotification({
          recipientId,
          type: 'STUDENT_APPROVAL_CREDENTIALS',
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          title: `✅ تم تأكيد وقبول انضمام الطالب ${fullName} في ${groupRecord.name}`,
          body: messageBody,
          channels: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
          data: {
            studentId: studentUser.id,
            studentName: fullName,
            studentPhoneOrCode: studentPhone,
            studentPassword,
            parentPhone: parentPhone || undefined,
            parentPassword: parentIsNew ? parentPassword : undefined,
            parentName: parentPhone ? `ولي أمر ${fullName}` : fullName,
            groupName: groupRecord.name,
            centerName,
            platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
            phone: whatsappPhone,
          },
        });

        this.logger.log(
          `📥 Direct Group Acceptance WhatsApp queued for student ${fullName} → ${whatsappPhone}`,
        );
      } else {
        // General Registration (without direct group link):
        // Only send In-App notification; WhatsApp will be sent ONLY when the teacher accepts/enrolls the student.
        await this.notificationsService.sendNotification({
          recipientId,
          type: 'STUDENT_REGISTRATION_CREDENTIALS',
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          title: `🎉 مرحباً بك! بيانات دخول الطالب ${fullName}`,
          body: `مرحباً بك في منصة الأوّل التعليمية! تم إنشاء الحساب بنجاح.`,
          channels: [NotificationChannel.IN_APP],
          data: {
            studentId: studentUser.id,
            studentName: fullName,
            studentPhoneOrCode: studentPhone,
            studentPassword,
            parentPhone: parentPhone || undefined,
            parentPassword: parentIsNew ? parentPassword : undefined,
            parentName: parentPhone ? `ولي أمر ${fullName}` : fullName,
            centerName: 'منصة الأوّل التعليمية',
            platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
            phone: whatsappPhone,
          },
        });
      }
    } catch (waErr) {
      // Non-fatal — registration succeeded even if we couldn't queue the WhatsApp
      this.logger.error('Failed to queue registration WhatsApp notification', waErr);
    }

    return {
      ...tokens,
      credentials: {
        studentCode,
        studentPhone,
        studentPassword,
        parentPhone: parentPhone || '',
        parentPassword: parentIsNew ? parentPassword : null,
        parentIsNew,
      },
    };
  }
}
