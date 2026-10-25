import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UserRole, NotificationType, NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthCredentialsService } from '../services/auth-credentials.service';
import { AuthTokenService } from '../services/auth-token.service';
import { AuthSessionService } from '../services/auth-session.service';
import { StudentCredentialsService } from '../../students/services/student-credentials.service';
import { StudentProfileService } from '../../students/services/student-profile.service';
import { CleanupJobsService } from '../../../jobs/cleanup-jobs.service';
import { GroupReservationsService } from '../../groups/services/group-reservations.service';

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    compare: vi.fn((plain: string, hash: string) => {
      if (plain === 'StudentPermPass123!' && hash === '$2a$10$studentpermhash') return Promise.resolve(true);
      if (plain === 'ParentPermPass123!' && hash === '$2a$10$parentpermhash') return Promise.resolve(true);
      if (plain === 'InitialPassSameAsPin' && hash === '$2a$10$initialhash') return Promise.resolve(true);
      return Promise.resolve(false);
    }),
    hash: vi.fn((...args: any[]) => actual.hash(...args)),
  };
});

describe('Phase 2C: Secure Plaintext Credential Retention & Parent Auth Hardening', () => {
  let credentialsService: AuthCredentialsService;
  let tokenService: AuthTokenService;
  let sessionService: AuthSessionService;
  let studentCredentialsService: StudentCredentialsService;
  let cleanupJobsService: CleanupJobsService;

  const validTempPin = 'tempPinXYZ';
  const unexpiredDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const expiredDate = new Date(Date.now() - 60 * 60 * 1000);

  let mockPrisma: any;
  let studentDb: any;
  let parentDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    studentDb = {
      id: 'stu-profile-1',
      studentCode: 'STU1001',
      tempAccessPin: validTempPin,
      pinExpiresAt: unexpiredDate,
      pendingCredentials: {
        studentPassword: 'StudentPermPass123!',
        parentPassword: 'ParentPermPass123!',
      },
      user: {
        id: 'user-stu-1',
        fullName: 'طالب اختباري',
        phone: '01011112222',
        passwordHash: '$2a$10$studentpermhash',
        role: UserRole.STUDENT,
        isActive: true,
        deletedAt: null,
      },
      parentLinks: [
        {
          parent: {
            id: 'parent-profile-1',
            user: {
              id: 'user-parent-1',
              fullName: 'ولي أمر اختباري',
              phone: '01033334444',
              passwordHash: '$2a$10$parentpermhash',
              role: UserRole.PARENT,
              isActive: true,
              deletedAt: null,
            },
          },
        },
      ],
    };

    parentDb = studentDb.parentLinks[0].parent.user;

    mockPrisma = {
      user: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const orList = where?.OR || [];
          const phoneOr = orList.find((c: any) => c.phone?.in);
          const phones = phoneOr?.phone?.in || (where?.phone ? [where.phone] : []);
          if (phones.includes('01011112222') || phones.includes('+201011112222')) {
            return Promise.resolve({
              ...studentDb.user,
              studentProfile: studentDb,
            });
          }
          if (phones.includes('01033334444') || phones.includes('+201033334444')) {
            return Promise.resolve({
              ...parentDb,
              parentProfile: {
                id: 'parent-profile-1',
                studentLinks: [{ student: studentDb }],
              },
            });
          }
          return Promise.resolve(null);
        }),
      },
      studentProfile: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          return Promise.resolve(studentDb);
        }),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'stu-profile-1') return Promise.resolve(studentDb);
          return Promise.resolve(null);
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          if (where.id === 'stu-profile-1') {
            studentDb = { ...studentDb, ...data };
            return Promise.resolve(studentDb);
          }
          return Promise.resolve({});
        }),
        updateMany: vi.fn().mockImplementation(({ where, data }) => {
          let count = 0;
          if (studentDb.tempAccessPin && where.tempAccessPin?.not === null) {
            let matches = false;
            if (where.OR) {
              matches = where.OR.some((cond: any) => {
                if (cond.pinExpiresAt === null && studentDb.pinExpiresAt === null) return true;
                if (cond.pinExpiresAt?.lte && studentDb.pinExpiresAt && studentDb.pinExpiresAt <= cond.pinExpiresAt.lte) return true;
                return false;
              });
            } else if (where.pinExpiresAt?.lte) {
              matches = studentDb.pinExpiresAt && studentDb.pinExpiresAt <= where.pinExpiresAt.lte;
            }
            if (matches) {
              studentDb.tempAccessPin = data.tempAccessPin;
              studentDb.pinExpiresAt = data.pinExpiresAt;
              count = 1;
            }
          }
          return Promise.resolve({ count });
        }),
      },
      parentStudentLink: {
        findMany: vi.fn().mockImplementation(() => Promise.resolve([{ student: studentDb }])),
      },
      refreshTokenSession: {
        create: vi.fn().mockResolvedValue({ id: 'sess-1' }),
      },
      teacherAssistant: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const mockJwt = {
      signAsync: vi.fn().mockResolvedValue('jwt-mock-token-xyz'),
    };
    const mockConfig = {
      get: vi.fn((k, d) => d),
      getOrThrow: vi.fn().mockReturnValue('jwt-32-chars-test-secret-value!'),
    };

    tokenService = new AuthTokenService(mockPrisma as any, mockJwt as any, mockConfig as any);
    sessionService = new AuthSessionService(mockPrisma as any, tokenService);
    credentialsService = new AuthCredentialsService(mockPrisma as any, tokenService, sessionService);

    const mockProfileService = {
      assertStudentAccess: vi.fn().mockImplementation((studentId: string, user: any) => {
        if (user.id === 'unauthorized-teacher') {
          throw new ForbiddenException('غير مصرح لك بالوصول لبيانات هذا الطالب');
        }
        return Promise.resolve();
      }),
    } as any;

    studentCredentialsService = new StudentCredentialsService(
      mockPrisma as any,
      { sendNotification: vi.fn() } as any,
      mockProfileService,
    );

    cleanupJobsService = new CleanupJobsService(undefined, mockPrisma as any);
  });

  describe('1. Student Permanent Password Login vs Expired Plaintext Copy', () => {
    it('authenticates student with permanent password before expiry without wiping active temp PIN', async () => {
      // In product initial state, permanent password matches and PIN is unexpired
      studentDb.user.passwordHash = '$2a$10$initialhash';
      studentDb.tempAccessPin = 'InitialPassSameAsPin';

      const result = await credentialsService.login({
        identifier: '01011112222',
        password: 'InitialPassSameAsPin',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('jwt-mock-token-xyz');
      expect(studentDb.tempAccessPin).toBe('InitialPassSameAsPin'); // not wiped yet because unexpired
    });

    it('authenticates student with permanent password AFTER expiry and opportunistically clears expired temp PIN', async () => {
      studentDb.user.passwordHash = '$2a$10$initialhash';
      studentDb.tempAccessPin = 'InitialPassSameAsPin';
      studentDb.pinExpiresAt = expiredDate; // EXPIRED!

      const result = await credentialsService.login({
        identifier: '01011112222',
        password: 'InitialPassSameAsPin',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('jwt-mock-token-xyz');
      // DB must have opportunistically purged the expired temp copy
      expect(mockPrisma.studentProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tempAccessPin: null, pinExpiresAt: null }),
        }),
      );
      expect(studentDb.tempAccessPin).toBeNull();
      // Crucial: user.passwordHash is 100% UNCHANGED
      expect(studentDb.user.passwordHash).toBe('$2a$10$initialhash');
    });

    it('allows student to log in seamlessly with permanent password when tempAccessPin is already NULL', async () => {
      studentDb.tempAccessPin = null;
      studentDb.pinExpiresAt = null;

      const result = await credentialsService.login({
        identifier: '01011112222',
        password: 'StudentPermPass123!',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('jwt-mock-token-xyz');
      expect(result.user.id).toBe('user-stu-1');
    });

    it('blocks login when using old expired temp PIN that differs from permanent password', async () => {
      studentDb.pinExpiresAt = expiredDate;

      await expect(
        credentialsService.login({
          identifier: '01011112222',
          password: validTempPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('2. Safe Idempotent Cleanup of Expired Temporary Access PINs', () => {
    it('purges expired tempAccessPin records in database without altering passwordHash', async () => {
      studentDb.pinExpiresAt = expiredDate;
      studentDb.tempAccessPin = 'ExpiredPin999';
      const initialHash = studentDb.user.passwordHash;

      const report = await cleanupJobsService.cleanupExpiredTemporaryPins();

      expect(report.purgedCount).toBe(1);
      expect(studentDb.tempAccessPin).toBeNull();
      expect(studentDb.pinExpiresAt).toBeNull();
      // User passwordHash was not touched
      expect(studentDb.user.passwordHash).toBe(initialHash);
    });

    it('is strictly idempotent: second cleanup run produces 0 purged rows', async () => {
      studentDb.pinExpiresAt = expiredDate;
      studentDb.tempAccessPin = 'ExpiredPin999';

      const firstRun = await cleanupJobsService.cleanupExpiredTemporaryPins();
      expect(firstRun.purgedCount).toBe(1);

      const secondRun = await cleanupJobsService.cleanupExpiredTemporaryPins();
      expect(secondRun.purgedCount).toBe(0);
    });

    it('does not purge unexpired temporary PINs whose pinExpiresAt is in the future', async () => {
      studentDb.pinExpiresAt = unexpiredDate;
      studentDb.tempAccessPin = validTempPin;

      const report = await cleanupJobsService.cleanupExpiredTemporaryPins();
      expect(report.purgedCount).toBe(0);
      expect(studentDb.tempAccessPin).toBe(validTempPin);
    });

    it('handles database errors gracefully without unhandled exceptions', async () => {
      mockPrisma.studentProfile.updateMany.mockRejectedValueOnce(new Error('DB Connection Timeout'));

      await expect(cleanupJobsService.cleanupExpiredTemporaryPins()).rejects.toThrow('DB Connection Timeout');
    });
  });

  describe('3. Parent Authentication via parentAccess() & login()', () => {
    it('authenticates parent in parentAccess using parent own permanent password', async () => {
      const result = await credentialsService.parentAccess({
        studentPhone: '01011112222',
        password: 'ParentPermPass123!',
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user-parent-1');
      expect(result.user.role).toBe(UserRole.PARENT);
    });

    it('authenticates parent in parentAccess using linked student permanent password EVEN AFTER pinExpiresAt', async () => {
      studentDb.pinExpiresAt = expiredDate; // Student PIN expired

      const result = await credentialsService.parentAccess({
        studentPhone: '01011112222',
        password: 'StudentPermPass123!',
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user-parent-1');
    });

    it('authenticates parent in parentAccess using unexpired student tempAccessPin', async () => {
      studentDb.pinExpiresAt = unexpiredDate;

      const result = await credentialsService.parentAccess({
        studentPhone: '01011112222',
        password: validTempPin,
      });

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user-parent-1');
    });

    it('BLOCKS parent in parentAccess when student tempAccessPin is EXPIRED (closing the bypass gap)', async () => {
      studentDb.pinExpiresAt = expiredDate;

      await expect(
        credentialsService.parentAccess({
          studentPhone: '01011112222',
          password: validTempPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not accept plaintext passwords from pendingCredentials if hash does not match', async () => {
      // Set pendingCredentials with a raw plaintext string that has no matching hash
      studentDb.pendingCredentials = {
        studentPassword: 'RawUnsavedPlaintext!',
      };

      await expect(
        credentialsService.parentAccess({
          studentPhone: '01011112222',
          password: 'RawUnsavedPlaintext!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('4. Teacher Credential Retrieval Boundary & Authorization', () => {
    const authorizedTeacher = { id: 'teacher-1', role: UserRole.TEACHER, teacherProfileId: 'teacher-1' };
    const unauthorizedTeacher = { id: 'unauthorized-teacher', role: UserRole.TEACHER, teacherProfileId: 'teacher-2' };

    it('returns active PIN and isPinActive: true when PIN is unexpired', async () => {
      studentDb.pinExpiresAt = unexpiredDate;
      studentDb.tempAccessPin = validTempPin;

      const res = await studentCredentialsService.getStudentCredentials('stu-profile-1', authorizedTeacher as any);
      expect(res.isPinActive).toBe(true);
      expect(res.tempAccessPin).toBe(validTempPin);
      expect(res.parentPassword).toBe('ParentPermPass123!');
    });

    it('returns tempAccessPin: null and isPinActive: false when PIN is expired', async () => {
      studentDb.pinExpiresAt = expiredDate;
      studentDb.tempAccessPin = validTempPin;

      const res = await studentCredentialsService.getStudentCredentials('stu-profile-1', authorizedTeacher as any);
      expect(res.isPinActive).toBe(false);
      expect(res.tempAccessPin).toBeNull();
      expect(res.parentPassword).toBeNull();
    });

    it('returns tempAccessPin: null and isPinActive: false after cleanup has cleared the DB', async () => {
      studentDb.pinExpiresAt = null;
      studentDb.tempAccessPin = null;

      const res = await studentCredentialsService.getStudentCredentials('stu-profile-1', authorizedTeacher as any);
      expect(res.isPinActive).toBe(false);
      expect(res.tempAccessPin).toBeNull();
      expect(res.parentPassword).toBeNull();
    });

    it('returns parentPassword when recently reset even if student tempAccessPin is null', async () => {
      studentDb.pinExpiresAt = null;
      studentDb.tempAccessPin = null;
      studentDb.pendingCredentials = {
        parentPassword: 'FreshParentPass789!',
        updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      };

      const res = await studentCredentialsService.getStudentCredentials('stu-profile-1', authorizedTeacher as any);
      expect(res.isPinActive).toBe(false);
      expect(res.tempAccessPin).toBeNull();
      expect(res.parentPassword).toBe('FreshParentPass789!');
    });

    it('returns parentPassword: null when parent reset has expired beyond 48 hours', async () => {
      studentDb.pinExpiresAt = null;
      studentDb.tempAccessPin = null;
      studentDb.pendingCredentials = {
        parentPassword: 'OldParentPass789!',
        updatedAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(), // 50 hours ago
      };

      const res = await studentCredentialsService.getStudentCredentials('stu-profile-1', authorizedTeacher as any);
      expect(res.isPinActive).toBe(false);
      expect(res.tempAccessPin).toBeNull();
      expect(res.parentPassword).toBeNull();
    });

    it('blocks unauthorized teacher from retrieving credentials (SEC-02 isolation)', async () => {
      await expect(
        studentCredentialsService.getStudentCredentials('stu-profile-1', unauthorizedTeacher as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. pendingCredentials Lifecycle in Reservation Approval', () => {
    it('safely clears pendingCredentials on successful notification dispatch during approval', async () => {
      let clearedPending = false;
      const mockPrismaApproval: any = {
        groupEnrollment: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'enrollment-1',
            studentId: 'stu-profile-1',
            groupId: 'group-1',
            status: 'PENDING',
            student: studentDb,
            group: {
              id: 'group-1',
              name: 'مجموعة النخبة',
              maxCapacity: 30,
              _count: { enrollments: 5 },
              monthlyFee: 500,
              teacher: { id: 'teacher-1', user: { fullName: 'أحمد غريب' } },
            },
          }),
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn().mockResolvedValue({ id: 'enrollment-1', status: 'ACTIVE' }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        studentPaymentRecord: {
          create: vi.fn().mockResolvedValue({ id: 'pay-1' }),
        },
        studentProfile: {
          update: vi.fn().mockImplementation(({ data }) => {
            if (data.pendingCredentials === null) {
              clearedPending = true;
            }
            return Promise.resolve({});
          }),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrismaApproval)),
      };

      const mockNotificationsService = {
        sendNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      };

      const mockGroupCrudService = {
        checkTeacherOwnership: vi.fn().mockResolvedValue(true),
      };

      const reservationsService = new GroupReservationsService(
        mockPrismaApproval,
        mockNotificationsService as any,
        { notifyReservationsChanged: vi.fn() } as any,
        mockGroupCrudService as any,
      );

      await reservationsService.acceptReservation(
        'enrollment-1',
        { id: 'teacher-1', role: UserRole.TEACHER } as any,
        'PAID',
      );

      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
      expect(clearedPending).toBe(true);
    });

    it('preserves pendingCredentials if sendNotification fails so the operation can be retried', async () => {
      let clearedPending = false;
      const mockPrismaApproval: any = {
        groupEnrollment: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'enrollment-2',
            studentId: 'stu-profile-1',
            groupId: 'group-1',
            status: 'PENDING',
            student: studentDb,
            group: {
              id: 'group-1',
              name: 'مجموعة النخبة',
              maxCapacity: 30,
              _count: { enrollments: 5 },
              monthlyFee: 500,
              teacher: { id: 'teacher-1', user: { fullName: 'أحمد غريب' } },
            },
          }),
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn().mockResolvedValue({ id: 'enrollment-2', status: 'ACTIVE' }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        studentPaymentRecord: {
          create: vi.fn().mockResolvedValue({ id: 'pay-2' }),
        },
        studentProfile: {
          update: vi.fn().mockImplementation(({ data }) => {
            if (data.pendingCredentials === null) {
              clearedPending = true;
            }
            return Promise.resolve({});
          }),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrismaApproval)),
      };

      const mockNotificationsService = {
        sendNotification: vi.fn().mockRejectedValue(new Error('Network failure to notification service')),
      };

      const mockGroupCrudService = {
        checkTeacherOwnership: vi.fn().mockResolvedValue(true),
      };

      const reservationsService = new GroupReservationsService(
        mockPrismaApproval,
        mockNotificationsService as any,
        { notifyReservationsChanged: vi.fn() } as any,
        mockGroupCrudService as any,
      );

      // Does not throw unhandled exception, but logs error and skips pendingCredentials clearance
      await reservationsService.acceptReservation(
        'enrollment-2',
        { id: 'teacher-1', role: UserRole.TEACHER } as any,
        'PAID',
      );

      expect(clearedPending).toBe(false); // Preserved for retry!
    });
  });
});
