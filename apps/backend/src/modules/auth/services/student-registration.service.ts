import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthService } from './auth.service';
import { RegisterStudentDto } from '../dto/student-registration.dto';
import { normalizeEgyptianPhone, getPhoneVariants } from '../../../common/utils/phone.util';
import { generateSecurePassword } from '../../../common/utils/password.util';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';

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

    // 6. Auto-authenticate the student (role STUDENT, server-determined)
    const tokens = await this.authService.issueTokens({
      id: studentUser.id,
      fullName: studentUser.fullName,
      email: null,
      phone: studentUser.phone,
      role: UserRole.STUDENT,
      studentProfile: { id: studentUser.id },
    });

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
