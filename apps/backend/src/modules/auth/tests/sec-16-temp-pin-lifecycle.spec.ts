import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../services/auth.service';
import { AuthCredentialsService } from '../services/auth-credentials.service';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthSessionService } from '../services/auth-session.service';
import { StudentCredentialsService } from '../../students/services/student-credentials.service';
import { StudentProfileService } from '../../students/services/student-profile.service';

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    compare: vi.fn((plain: string, hash: string) => {
      if (plain === 'CorrectPermanentPass123!' && hash === '$2a$10$realhash') return Promise.resolve(true);
      if (plain === 'ParentRealPass123!' && hash === '$2a$10$parenthash') return Promise.resolve(true);
      return Promise.resolve(false);
    }),
    hash: vi.fn((...args: any[]) => actual.hash(...args)),
  };
});

describe('SEC-16 & Scope 2: Student Temporary PIN Lifecycle & Cross-Teacher Security', () => {
  let authService: AuthService;
  let credentialsService: AuthCredentialsService;
  let studentCredentialsService: StudentCredentialsService;
  let profileService: StudentProfileService;

  const validTempPin = 'k8F2m9A1';
  const realPasswordHash = '$2a$10$realhash';
  const unexpiredDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48 hours
  const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  let studentProfileDb: any;
  let mockPrismaService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    studentProfileDb = {
      id: 'stu-profile-1',
      tempAccessPin: validTempPin,
      pinExpiresAt: unexpiredDate,
      pendingCredentials: null,
      studentCode: 'STU2026001',
      user: {
        id: 'user-stu-1',
        fullName: 'أحمد محمود',
        phone: '01012345678',
        email: 'ahmed@test.com',
        isActive: true,
        deletedAt: null,
        passwordHash: realPasswordHash,
        role: UserRole.STUDENT,
      },
      parentLinks: [
        {
          parent: {
            id: 'parent-profile-1',
            user: {
              id: 'user-parent-1',
              fullName: 'محمود حسن',
              phone: '01098765432',
              isActive: true,
              deletedAt: null,
              passwordHash: '$2a$10$parenthash',
              role: UserRole.PARENT,
            },
          },
        },
      ],
    };

    mockPrismaService = {
      user: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const orList = where?.OR || [];
          const phoneOr = orList.find((c: any) => c.phone?.in);
          const phones = phoneOr?.phone?.in || (where?.phone ? [where.phone] : []);
          if (phones.includes('01012345678') || phones.includes('+201012345678')) {
            return Promise.resolve({
              ...studentProfileDb.user,
              studentProfile: studentProfileDb,
            });
          }
          if (phones.includes('01098765432') || phones.includes('+201098765432')) {
            return Promise.resolve({
              ...studentProfileDb.parentLinks[0].parent.user,
              parentProfile: {
                id: 'parent-profile-1',
                studentLinks: [
                  {
                    student: studentProfileDb,
                  },
                ],
              },
            });
          }
          return Promise.resolve(null);
        }),
      },
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'stu-profile-1') {
            return Promise.resolve(studentProfileDb);
          }
          return Promise.resolve(null);
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          if (where.id === 'stu-profile-1') {
            studentProfileDb = { ...studentProfileDb, ...data };
            return Promise.resolve(studentProfileDb);
          }
          return Promise.resolve({});
        }),
      },
      refreshTokenSession: {
        create: vi.fn().mockResolvedValue({ id: 'sess-1' }),
      },
      teacherAssistant: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('jwt-mock-token'),
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-stu-1' }),
    };

    const mockConfigService = {
      get: vi.fn((key: string, defVal: any) => defVal),
      getOrThrow: vi.fn().mockReturnValue('jwt-secret-for-tests-32-chars-long!'),
    };

    const mockNotificationsService = {
      sendNotification: vi.fn().mockResolvedValue(undefined),
    };

    const tokenService = new AuthTokenService(mockPrismaService as any, mockJwtService as any, mockConfigService as any);
    const sessionService = new AuthSessionService(mockPrismaService as any, tokenService);
    credentialsService = new AuthCredentialsService(mockPrismaService as any, tokenService, sessionService);

    authService = new AuthService(
      mockPrismaService as any,
      mockJwtService as any,
      mockConfigService as any,
      mockNotificationsService as any,
      tokenService,
      sessionService,
      credentialsService,
    );

    profileService = {
      assertStudentAccess: vi.fn().mockImplementation((studentId: string, user: any) => {
        if (user.id === 'unauthorized-teacher') {
          throw new ForbiddenException('غير مصرح لك بالوصول لبيانات هذا الطالب');
        }
        return Promise.resolve();
      }),
    } as any;

    studentCredentialsService = new StudentCredentialsService(
      mockPrismaService as any,
      mockNotificationsService as any,
      profileService,
    );
  });

  describe('1. Temporary PIN Success and Reuse within Validity Window', () => {
    it('authenticates student successfully when using active, unexpired tempAccessPin', async () => {
      const result = await authService.login({
        identifier: '01012345678',
        password: validTempPin,
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('jwt-mock-token');
      expect(result.user.id).toBe('user-stu-1');
      expect(result.user.role).toBe(UserRole.STUDENT);
    });

    it('proves tempAccessPin CAN BE REUSED during onboarding (does not delete PIN on temp login)', async () => {
      // First login with temp PIN
      await authService.login({
        identifier: '01012345678',
        password: validTempPin,
      });

      // Verify PIN was NOT deleted from database
      expect(mockPrismaService.studentProfile.update).not.toHaveBeenCalled();
      expect(studentProfileDb.tempAccessPin).toBe(validTempPin);

      // Second login with SAME temp PIN succeeds again (validating reuse)
      const secondResult = await authService.login({
        identifier: '01012345678',
        password: validTempPin,
      });

      expect(secondResult).toBeDefined();
      expect(secondResult.user.id).toBe('user-stu-1');
    });
  });

  describe('2. Temporary PIN Expiration Enforcement', () => {
    it('rejects student login with UnauthorizedException when pinExpiresAt is in the past', async () => {
      studentProfileDb.pinExpiresAt = expiredDate;

      await expect(
        authService.login({
          identifier: '01012345678',
          password: validTempPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects parent login via student PIN when linked student pinExpiresAt is in the past', async () => {
      studentProfileDb.pinExpiresAt = expiredDate;

      await expect(
        authService.login({
          identifier: '01098765432',
          password: validTempPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('3. Invalidation upon Permanent Password Authentication', () => {
    it('invalidates tempAccessPin and pinExpiresAt once student logs in with real permanent password', async () => {
      expect(studentProfileDb.tempAccessPin).toBe(validTempPin);

      // Student logs in with their real permanent password
      const result = await authService.login({
        identifier: '01012345678',
        password: 'CorrectPermanentPass123!',
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user-stu-1');

      // Database must have wiped the tempAccessPin
      expect(mockPrismaService.studentProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'stu-profile-1' },
          data: expect.objectContaining({
            tempAccessPin: null,
            pinExpiresAt: null,
            pendingCredentials: null,
          }),
        }),
      );

      // Verify in-memory DB state after update
      expect(studentProfileDb.tempAccessPin).toBeNull();
      expect(studentProfileDb.pinExpiresAt).toBeNull();

      // Subsequent attempt using the old tempAccessPin MUST fail
      await expect(
        authService.login({
          identifier: '01012345678',
          password: validTempPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('4. Cross-Teacher Isolation & Credential Visibility Boundaries', () => {
    it('blocks unauthorized teacher from inspecting student credentials', async () => {
      const unauthorizedUser = {
        id: 'unauthorized-teacher',
        role: UserRole.TEACHER,
        teacherProfileId: 'teacher-2',
      };

      await expect(
        studentCredentialsService.getStudentCredentials('stu-profile-1', unauthorizedUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns tempAccessPin: null when PIN is expired in getStudentCredentials', async () => {
      studentProfileDb.pinExpiresAt = expiredDate;

      const authorizedTeacher = {
        id: 'teacher-1',
        role: UserRole.TEACHER,
        teacherProfileId: 'teacher-1',
      };

      const credentials = await studentCredentialsService.getStudentCredentials(
        'stu-profile-1',
        authorizedTeacher as any,
      );

      expect(credentials.isPinActive).toBe(false);
      expect(credentials.tempAccessPin).toBeNull();
    });

    it('returns active tempAccessPin when valid and unexpired for authorized teacher', async () => {
      studentProfileDb.pinExpiresAt = unexpiredDate;

      const authorizedTeacher = {
        id: 'teacher-1',
        role: UserRole.TEACHER,
        teacherProfileId: 'teacher-1',
      };

      const credentials = await studentCredentialsService.getStudentCredentials(
        'stu-profile-1',
        authorizedTeacher as any,
      );

      expect(credentials.isPinActive).toBe(true);
      expect(credentials.tempAccessPin).toBe(validTempPin);
    });
  });
});
