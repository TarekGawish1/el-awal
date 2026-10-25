import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma, GroupEnrollmentStatus, UserRole, NotificationChannel, NotificationType, AssistantStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { RegisterByGroupDto } from '../dto/register-by-group.dto';
import { AuthTokensResponseDto } from '../dto/auth-response.dto';
import { normalizeEgyptianPhone, arePhonesTooSimilar } from '../../../common/utils/phone.util';
import { isSimilarStudentName } from '../../../common/utils/name.util';
import { generateSecurePassword, getTemporaryPinExpiration } from '../../../common/utils/password.util';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { getPhoneVariants } from '../helpers/auth-phone.helper';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthGroupRegistrationService {
  private readonly logger = new Logger(AuthGroupRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: AuthTokenService,
    private readonly notificationsService: NotificationsService,
  ) {}

  deriveStageLabel(gradeLevel: string): string {
    if (!gradeLevel) return 'غير محدد';
    if (gradeLevel.includes('الابتدائي')) return 'المرحلة الابتدائية';
    if (gradeLevel.includes('الإعدادي')) return 'المرحلة الإعدادية';
    if (gradeLevel.includes('الثانوي')) return 'المرحلة الثانوية';
    return 'أخرى';
  }

  deriveStageCode(gradeLevel: string): string | null {
    if (gradeLevel.includes('الابتدائي')) return 'PRIMARY';
    if (gradeLevel.includes('الإعدادي')) return 'MIDDLE';
    if (gradeLevel.includes('الثانوي')) return 'SECONDARY';
    return null;
  }

  /**
   * Public endpoint payload for the group self-registration view.
   * Validates the invite token, registration window and group state without
   * requiring authentication.
   */
  async getGroupInvite(token: string): Promise<{
    groupId: string;
    groupName: string;
    gradeLevel: string;
    stage: string;
    teacherName: string;
    monthlyFee: number;
    isValid: boolean;
  }> {
    const group = await this.prisma.academicGroup.findUnique({
      where: { registrationToken: token },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        monthlyFee: true,
        isActive: true,
        isRegistrationOpen: true,
        registrationLinkExpiry: true,
        teacher: { select: { user: { select: { fullName: true } } } },
      },
    });

    const now = new Date();
    const isValid =
      !!group &&
      group.isActive &&
      group.isRegistrationOpen &&
      (!group.registrationLinkExpiry || group.registrationLinkExpiry.getTime() > now.getTime());

    return {
      groupId: group?.id || '',
      groupName: group?.name || '',
      gradeLevel: group?.gradeLevel || '',
      stage: group ? this.deriveStageLabel(group.gradeLevel) : '',
      teacherName: group?.teacher?.user?.fullName || '',
      monthlyFee: group ? Number(group.monthlyFee) : 0,
      isValid,
    };
  }

  /**
   * Group-invite self-registration: validates the invite token, then atomically
   * creates the Student User + StudentProfile, creates or links the Parent
   * User + ParentProfile, and enrolls the student (ACTIVE) into the group in a
   * single Prisma transaction. Returns JWT tokens for immediate sign-in.
   */
  async registerByGroup(dto: RegisterByGroupDto): Promise<AuthTokensResponseDto> {
    const phone = dto.phone?.trim() ? normalizeEgyptianPhone(dto.phone) : null;
    const parentPhone = normalizeEgyptianPhone(dto.parentPhone);
    const fullName = dto.fullName.trim();
    const parentName = dto.parentName.trim();

    if (phone && phone === parentPhone) {
      throw new ConflictException({
        code: 'PHONES_MUST_DIFFER',
        message: 'رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب',
      });
    }

    if (phone && arePhonesTooSimilar(phone, parentPhone)) {
      throw new ConflictException({
        code: 'PHONES_TOO_SIMILAR',
        message: 'رقم هاتف الطالب ورقم هاتف ولي الأمر متشابهان جداً. يرجى إدخال رقم شخصي مستقل أو ترك هاتف الطالب فارغاً.',
      });
    }

    const group = await this.prisma.academicGroup.findUnique({
      where: { registrationToken: dto.token },
    });

    const now = new Date();
    const isLinkExpired =
      !!group?.registrationLinkExpiry && group.registrationLinkExpiry.getTime() < now.getTime();

    if (!group || !group.isActive) {
      throw new BadRequestException({
        code: 'INVALID_INVITE_TOKEN',
        message: 'رابط التسجيل غير صالح، يرجى طلب رابط جديد من المدرس',
      });
    }

    if (!group.isRegistrationOpen || isLinkExpired) {
      throw new BadRequestException({
        code: 'REGISTRATION_CLOSED',
        message: 'التسجيل في هذه المجموعة مغلق حالياً',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let generatedParentPassword: string | null = null;
    let studentUser: any;
    try {
      studentUser = await this.prisma.$transaction(async (tx) => {
        // 1. If student phone is provided, it must not already belong to any account (anti-duplicate)
        if (phone) {
          const existingStudent = await tx.user.findFirst({
            where: { phone: { in: getPhoneVariants(phone) } },
            select: { id: true, role: true },
          });
          if (existingStudent) {
            throw new ConflictException({
              code: 'PHONE_ALREADY_REGISTERED',
              message: 'رقم هاتف الطالب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة',
            });
          }
        }

        // 2. Generate unique student code and QR credential
        const studentCode = await generateUniqueStudentCode(tx);
        const qrCodeToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

        // 3. Create Student User + StudentProfile (shared primary key)
        const createdStudentUser = await tx.user.create({
          data: {
            fullName,
            phone,
            passwordHash,
            role: UserRole.STUDENT,
            isActive: true,
            studentProfile: {
              create: {
                studentCode,
                qrCodeToken,
                gradeLevel: group.gradeLevel,
                academicStage: this.deriveStageCode(group.gradeLevel),
                attendanceMode: 'CENTER',
                emergencyPhone: parentPhone,
                tempAccessPin: dto.password,
                pinExpiresAt: getTemporaryPinExpiration(48),
                createdById: group.teacherId,
                createdByName: `رابط انضمام: ${group.name}`,
                updatedById: group.teacherId,
                updatedByName: `رابط انضمام: ${group.name}`,
              },
            },
          },
          include: { studentProfile: true },
        });

        // 4. Resolve parent: reuse an existing parent by phone or create one
        let parentUserId: string;
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
            where: { id: parentUserId },
            select: { id: true },
          });
          if (!parentProfile) {
            await tx.parentProfile.create({
              data: { id: parentUserId, relationshipType: 'ولي أمر' },
            });
          }

          // Anti-duplicate check: verify if the parent already has a student registered with similar name
          const existingLinks = await tx.parentStudentLink.findMany({
            where: { parentId: parentUserId },
            include: {
              student: {
                select: {
                  studentCode: true,
                  user: { select: { fullName: true } },
                },
              },
            },
          });

          const duplicateStudent = existingLinks.find((link) =>
            link.student?.user?.fullName && isSimilarStudentName(link.student.user.fullName, fullName),
          );

          if (duplicateStudent && duplicateStudent.student?.user) {
            const existingCode = duplicateStudent.student.studentCode || '';
            const existingName = duplicateStudent.student.user.fullName;
            throw new ConflictException({
              code: 'DUPLICATE_STUDENT_ACCOUNT',
              message: `يوجد بالفعل حساب مسجل للطالب "${existingName}" برقم كود (${existingCode}) تحت نفس رقم ولي الأمر. يمكنك تسجيل الدخول مباشرة بالكود أو رقم ولي الأمر دون الحاجة لإنشاء حساب جديد.`,
            });
          }
        } else {
          const parentPassword = generateSecurePassword();
          generatedParentPassword = parentPassword;
          const parentPasswordHash = await bcrypt.hash(parentPassword, 10);
          const newParentUser = await tx.user.create({
            data: {
              fullName: parentName,
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

          await tx.studentProfile.update({
            where: { id: createdStudentUser.id },
            data: {
              pendingCredentials: {
                studentPassword: null,
                parentPassword,
                studentPhone: phone || null,
                parentPhone,
              },
            },
          });
        }

        // 5. Link parent ↔ student
        await tx.parentStudentLink.create({
          data: { parentId: parentUserId, studentId: createdStudentUser.id },
        });

        // 6. Enroll the student directly into the group (ACTIVE)
        await tx.groupEnrollment.upsert({
          where: {
            groupId_studentId: {
              groupId: group.id,
              studentId: createdStudentUser.id,
            },
          },
          create: {
            groupId: group.id,
            studentId: createdStudentUser.id,
            status: GroupEnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          },
          update: {
            status: GroupEnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          },
        });

        return createdStudentUser;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn('Group registration collided on a unique constraint');
        throw new ConflictException({
          code: 'IDENTIFIER_ALREADY_IN_USE',
          message: 'رقم الهاتف مستخدم بالفعل، يرجى المحاولة مرة أخرى',
        });
      }
      throw error;
    }

    this.logger.log(`Group self-registration completed for [${fullName}] into group [${group.id}]`);

    // Dispatch WebPush & In-App push notification to the group teacher (and assistants)
    try {
      const studentCode = studentUser.studentProfile?.studentCode || '';
      const teacherNotification = {
        recipientId: group.teacherId,
        type: 'STUDENT_JOINED_GROUP_LINK',
        notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
        title: 'انضمام طالب جديد للمجموعة 🎓',
        body: `قام الطالب "${fullName}" بالانضمام إلى مجموعة "${group.name}" عبر رابط الانضمام المباشر.`,
        channels: [NotificationChannel.WEB_PUSH, NotificationChannel.IN_APP],
        referenceEntityId: studentUser.id,
        data: {
          studentId: studentUser.id,
          studentName: fullName,
          studentCode,
          studentPhone: phone || parentPhone,
          groupId: group.id,
          groupName: group.name,
          joinedAt: new Date().toISOString(),
          joinMethod: 'GROUP_LINK',
          url: '/teacher/students',
        },
      };

      await this.notificationsService.sendNotification(teacherNotification);

      // Also notify active assistants for this teacher
      if (typeof this.prisma.teacherAssistant?.findMany === 'function') {
        const assistants = await this.prisma.teacherAssistant.findMany({
          where: { teacherId: group.teacherId, status: AssistantStatus.ACTIVE },
          select: { assistantId: true },
        });
        for (const ast of assistants) {
          await this.notificationsService
            .sendNotification({
              ...teacherNotification,
              recipientId: ast.assistantId,
            })
            .catch((err) =>
              this.logger.warn(`Failed to dispatch group join push notification to assistant [${ast.assistantId}]: ${err}`),
            );
        }
      }
    } catch (notifErr) {
      this.logger.warn(`Failed to dispatch group join push notification to teacher: ${notifErr}`);
    }

    // Automated Parent WhatsApp Delivery on Group Registration
    try {
      let teacherDisplayName = 'الأستاذ';
      const teacherUser = await this.prisma.user.findUnique({
        where: { id: group.teacherId },
        select: { fullName: true },
      });
      if (teacherUser?.fullName) {
        teacherDisplayName = teacherUser.fullName;
      }

      const studentCode = studentUser.studentProfile?.studentCode || '';
      const parentPassText = generatedParentPassword || dto.password;
      const directAccessLink = `https://al-awal.online/parent-access?phone=${encodeURIComponent(parentPhone)}&pass=${encodeURIComponent(parentPassText)}`;

      const message = `🌟 مرحباً بك أ/ ${parentName}!
تم تسجيل انضمام ابنكم/ابنتكم (${fullName}) بنجاح إلى:
🏫 *${group.name}* مع *${teacherDisplayName}* على منصة الأوّل.

━━━━━━━━━━━━━━━━━━━
👤 *بيانات حساب الطالب:*
▫️ *كود الطالب:* ${studentCode}
▫️ *رقم الدخول:* ${phone}
▫️ *كلمة المرور:* ${dto.password}
🔗 *رابط منصة الطالب:* https://al-awal.online/login

━━━━━━━━━━━━━━━━━━━
👨‍👩‍👦 *بيانات حساب ولي الأمر (لمتابعة الحضور والدرجات والغياب):*
▫️ *رقم الدخول:* ${parentPhone}
▫️ *كلمة المرور:* ${parentPassText}
🔗 *رابط بوابة ولي الأمر المباشر:* ${directAccessLink}
━━━━━━━━━━━━━━━━━━━
نتمنى لابنكم عاماً دراسياً مليئاً بالتفوق والنجاح! 🎓`.trim();

      await this.notificationsService.sendNotification({
        recipientId: studentUser.id,
        type: 'STUDENT_REGISTRATION_CREDENTIALS',
        notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
        title: `🎉 مرحباً بك! بيانات دخول الطالب ${dto.fullName}`,
        body: message,
        channels: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
        data: {
          studentId: studentUser.id,
          studentName: dto.fullName,
          studentPhoneOrCode: phone,
          studentPassword: dto.password,
          parentPhone,
          parentPassword: parentPassText,
          parentName: `ولي أمر ${dto.fullName}`,
          centerName: group.name ? `مجموعة ${group.name}` : 'منصة الأوّل التعليمية',
          groupName: group.name,
          platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
          phone: parentPhone || phone,
        },
      });

        // Safely clear pendingCredentials once registration notification is successfully enqueued
        await this.prisma.studentProfile.update({
          where: { id: studentUser.id },
          data: { pendingCredentials: null },
        }).catch((err) => {
          this.logger.warn(`Failed to clear pendingCredentials for student [${studentUser.id}]: ${err.message}`);
        });
      } catch (waErr) {
      this.logger.warn(`Failed to dispatch registration WhatsApp message to parent: ${waErr}`);
    }

    return this.tokenService.issueTokens({
      id: studentUser.id,
      fullName: studentUser.fullName,
      email: null,
      phone: studentUser.phone,
      role: UserRole.STUDENT,
      studentProfile: { id: studentUser.id },
    });
  }
}
