import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { StudentProfileService } from './student-profile.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { StudentQrCodeResponseDto } from '../dto/qr-code-response.dto';
import { ResetStudentPasswordDto } from '../dto/reset-student-password.dto';
import { ResetParentPasswordDto } from '../dto/reset-parent-password.dto';
import { UserRole } from '@prisma/client';
import { generateSecurePassword } from '../../../common/utils/password.util';
import {
  formatResetStudentPasswordMessage,
  formatResetParentPasswordMessage,
  dispatchResetStudentPasswordAlert,
  dispatchResetParentPasswordAlert,
} from '../helpers/student-credentials-message.helper';

@Injectable()
export class StudentCredentialsService {
  private readonly logger = new Logger(StudentCredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly profileService: StudentProfileService,
  ) {}

  /**
   * Generates QR display payload for digital badge rendering.
   */
  async getStudentQrCode(
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<StudentQrCodeResponseDto> {
    await this.profileService.assertStudentAccess(studentId, user, true, true);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { fullName: true } } },
    });

    if (!student) {
      throw new NotFoundException(`Student [${studentId}] not found`);
    }

    return {
      studentId: student.id,
      studentCode: student.studentCode || 'N/A',
      fullName: student.user.fullName,
      gradeLevel: student.gradeLevel,
      qrCodeToken: student.qrCodeToken,
    };
  }

  /**
   * Cryptographically re-generates the QR code token for a student profile.
   */
  async regenerateQrToken(
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<StudentQrCodeResponseDto> {
    await this.profileService.assertStudentAccess(studentId, user, false, false);

    const newQrToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

    const updatedStudent = await this.prisma.studentProfile.update({
      where: { id: studentId },
      data: { qrCodeToken: newQrToken },
      include: { user: { select: { fullName: true } } },
    });

    this.logger.log(`Rotated QR code token for student [${studentId}]`);

    return {
      studentId: updatedStudent.id,
      studentCode: updatedStudent.studentCode || 'N/A',
      fullName: updatedStudent.user.fullName,
      gradeLevel: updatedStudent.gradeLevel,
      qrCodeToken: updatedStudent.qrCodeToken,
    };
  }

  /**
   * Reset student password or issue temporary access PIN.
   */
  async resetStudentPassword(
    studentId: string,
    dto: ResetStudentPasswordDto,
    user: AuthenticatedUser,
  ) {
    await this.profileService.assertStudentAccess(studentId, user, false, false);

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parentLinks: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!studentProfile || !studentProfile.user) {
      throw new NotFoundException(`Student with ID [${studentId}] not found`);
    }

    const newPassword = dto.newPassword?.trim() || generateSecurePassword(6);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const pinExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: studentProfile.user.id },
        data: { passwordHash },
      }),
      this.prisma.studentProfile.update({
        where: { id: studentProfile.id },
        data: {
          tempAccessPin: newPassword,
          pinExpiresAt,
        },
      }),
      ...(this.prisma.refreshTokenSession?.updateMany
        ? [
            this.prisma.refreshTokenSession.updateMany({
              where: { userId: studentProfile.user.id, revokedAt: null },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
    ]);

    const studentName = studentProfile.user.fullName;
    const studentPhone = studentProfile.user.phone || '';
    const studentCode = studentProfile.studentCode || '';
    const parentPhone =
      studentProfile.emergencyPhone ||
      studentProfile.parentLinks?.[0]?.parent?.user?.phone ||
      '';
    const parentName =
      studentProfile.parentLinks?.[0]?.parent?.user?.fullName || 'ولي الأمر';

    if (dto.sendWhatsApp !== false) {
      try {
        let teacherName = 'إدارة السنتر';
        if (user.role === UserRole.TEACHER) {
          const teacherUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { fullName: true },
          });
          if (teacherUser?.fullName) {
            teacherName = teacherUser.fullName;
          }
        }

        const message = formatResetStudentPasswordMessage({
          parentName,
          studentName,
          studentCode,
          teacherName,
          studentPhone,
          newPassword,
        });

        if (parentPhone) {
          await dispatchResetStudentPasswordAlert(this.notificationsService, {
            recipientId:
              studentProfile.parentLinks?.[0]?.parent?.user?.id ||
              studentProfile.user.id,
            parentPhone,
            studentName,
            studentCode,
            studentPhone,
            newPassword,
            teacherName,
            message,
          });
        }
      } catch (waErr) {
        this.logger.warn(
          `Failed to dispatch reset-password WhatsApp alert: ${waErr}`,
        );
      }
    }

    return {
      success: true,
      studentId: studentProfile.id,
      studentCode,
      studentName,
      studentPhone,
      parentPhone,
      newPassword,
      messageSent: dto.sendWhatsApp !== false,
    };
  }

  /**
   * Reset the password for the parent account linked to the student.
   */
  async resetParentPassword(
    studentId: string,
    dto: ResetParentPasswordDto,
    user: AuthenticatedUser,
  ) {
    await this.profileService.assertStudentAccess(studentId, user, false, false);

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parentLinks: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!studentProfile || !studentProfile.user) {
      throw new NotFoundException(`Student with ID [${studentId}] not found`);
    }

    let parentUser = studentProfile.parentLinks?.[0]?.parent?.user;
    const parentPhone =
      studentProfile.parentLinks?.[0]?.parent?.user?.phone ||
      studentProfile.emergencyPhone;

    if (!parentPhone && !parentUser) {
      throw new BadRequestException(
        'لا يوجد هاتف مسجل لولي الأمر لهذا الطالب لإعداد حسابه',
      );
    }

    const newPassword = dto.newPassword?.trim() || generateSecurePassword(6);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (parentUser) {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: parentUser.id },
          data: { passwordHash, isActive: true },
        }),
        ...(this.prisma.refreshTokenSession?.updateMany
          ? [
              this.prisma.refreshTokenSession.updateMany({
                where: { userId: parentUser.id, revokedAt: null },
                data: { revokedAt: new Date() },
              }),
            ]
          : []),
      ]);
    } else if (parentPhone) {
      let existingUserWithPhone = await this.prisma.user.findFirst({
        where: { phone: parentPhone },
        include: { parentProfile: true },
      });

      if (existingUserWithPhone) {
        parentUser = existingUserWithPhone;
        await this.prisma.user.update({
          where: { id: parentUser.id },
          data: { passwordHash, isActive: true },
        });
        if (!existingUserWithPhone.parentProfile) {
          await this.prisma.parentProfile.create({
            data: {
              id: parentUser.id,
              relationshipType: 'Guardian',
            },
          });
        }
      } else {
        parentUser = await this.prisma.user.create({
          data: {
            fullName: `ولي أمر ${studentProfile.user.fullName}`,
            phone: parentPhone,
            passwordHash,
            role: UserRole.PARENT,
            isActive: true,
            parentProfile: {
              create: {
                relationshipType: 'Guardian',
              },
            },
          },
        });
      }

      await this.prisma.parentStudentLink.create({
        data: {
          parentId: parentUser.id,
          studentId: studentProfile.id,
        },
      });
    }

    const prevPending =
      (studentProfile.pendingCredentials as Record<string, any>) || {};
    await this.prisma.studentProfile.update({
      where: { id: studentProfile.id },
      data: {
        pendingCredentials: {
          ...prevPending,
          parentPassword: newPassword,
          parentPhone: parentPhone,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    const studentName = studentProfile.user.fullName;
    const studentCode = studentProfile.studentCode || '';
    const parentName = parentUser?.fullName || 'ولي الأمر';
    const platformUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online';
    const directLoginUrl = `${platformUrl}/parent-access?phone=${encodeURIComponent(
      parentPhone || '',
    )}&pass=${encodeURIComponent(newPassword)}`;

    if (dto.sendWhatsApp !== false && parentPhone && parentUser) {
      try {
        let teacherName = 'أستاذ أحمد غريب';
        if (user.role === UserRole.TEACHER) {
          const teacherUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { fullName: true },
          });
          if (teacherUser?.fullName) {
            teacherName = teacherUser.fullName;
          }
        }

        const message = formatResetParentPasswordMessage({
          parentName,
          studentName,
          studentCode,
          teacherName,
          parentPhone: parentPhone || '',
          newPassword,
          directLoginUrl,
        });

        await dispatchResetParentPasswordAlert(this.notificationsService, {
          recipientId: parentUser.id,
          parentPhone: parentPhone || '',
          studentName,
          studentCode,
          parentName,
          newPassword,
          teacherName,
          directLoginUrl,
          message,
        });
      } catch (waErr) {
        this.logger.warn(
          `Failed to dispatch reset-parent-password WhatsApp alert: ${waErr}`,
        );
      }
    }

    return {
      success: true,
      studentId: studentProfile.id,
      studentCode,
      studentName,
      parentName,
      parentPhone,
      newPassword,
      directLoginUrl,
      messageSent: dto.sendWhatsApp !== false,
    };
  }

  /**
   * Retrieve student credentials & active temporary PIN.
   */
  async getStudentCredentials(studentId: string, user: AuthenticatedUser) {
    await this.profileService.assertStudentAccess(studentId, user, false, false);

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
        parentLinks: {
          include: {
            parent: {
              include: { user: { select: { id: true, fullName: true, phone: true } } },
            },
          },
        },
      },
    });

    if (!studentProfile || !studentProfile.user) {
      throw new NotFoundException(`Student with ID [${studentId}] not found`);
    }

    const parentUser = studentProfile.parentLinks?.[0]?.parent?.user;
    const isPinActive =
      Boolean(studentProfile.tempAccessPin) &&
      Boolean(studentProfile.pinExpiresAt) &&
      new Date(studentProfile.pinExpiresAt) > new Date();

    const pending =
      (studentProfile.pendingCredentials as Record<string, any>) || {};
    const isParentResetActive =
      Boolean(pending.updatedAt) &&
      new Date(pending.updatedAt).getTime() + 48 * 60 * 60 * 1000 > Date.now();
    const isParentPasswordActive = isPinActive || isParentResetActive;
    const parentPassword =
      isParentPasswordActive && pending.parentPassword
        ? pending.parentPassword
        : null;

    return {
      studentId: studentProfile.id,
      studentName: studentProfile.user.fullName,
      studentCode: studentProfile.studentCode,
      studentPhone: studentProfile.user.phone,
      parentName: parentUser?.fullName || null,
      parentPhone: studentProfile.emergencyPhone || parentUser?.phone || null,
      parentPassword,
      hasParentAccount: !!parentUser,
      tempAccessPin: isPinActive ? studentProfile.tempAccessPin : null,
      pinExpiresAt: studentProfile.pinExpiresAt,
      isPinActive,
    };
  }

  /**
   * Domain-level cleanup method for expired temporary student access PINs.
   * Safe and idempotent: updates only student_profiles where pin_expires_at <= cutoff.
   * Leaves users.password_hash completely intact.
   */
  async cleanupExpiredTemporaryPins(cutoffDate: Date = new Date()) {
    return this.prisma.studentProfile.updateMany({
      where: {
        pinExpiresAt: { lte: cutoffDate },
        tempAccessPin: { not: null },
      },
      data: {
        tempAccessPin: null,
        pinExpiresAt: null,
      },
    });
  }
}
