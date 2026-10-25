import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, NotificationType, NotificationChannel, GroupEnrollmentStatus } from '@prisma/client';
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
      return Promise.resolve(false);
    }),
    hash: vi.fn((...args: any[]) => actual.hash(...args)),
  };
});

describe('Phase 2D: Residual Plaintext Credential Retention & Legacy PIN Remediation', () => {
  let credentialsService: AuthCredentialsService;
  let tokenService: AuthTokenService;
  let sessionService: AuthSessionService;
  let studentCredentialsService: StudentCredentialsService;
  let cleanupJobsService: CleanupJobsService;
  let reservationsService: GroupReservationsService;

  const legacyPin = 'legacyPin999';
  const unexpiredDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

  let mockPrisma: any;
  let studentDb: any;
  let parentDb: any;
  let enrollmentsDb: any[];
  let mockNotificationsService: any;
  let mockRealtimeGateway: any;
  let mockGroupCrudService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    studentDb = {
      id: 'stu-profile-1',
      studentCode: 'STU1001',
      tempAccessPin: legacyPin,
      pinExpiresAt: null, // Legacy PIN without expiration date
      pendingCredentials: {
        studentPassword: 'StudentPermPass123!',
        parentPassword: 'ParentPermPass123!',
        createdAt: '2026-09-01T10:00:00.000Z',
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

    enrollmentsDb = [
      {
        id: 'enrollment-1',
        studentId: studentDb.id,
        groupId: 'group-1',
        status: GroupEnrollmentStatus.PENDING,
        student: studentDb,
        group: {
          id: 'group-1',
          name: 'مجموعة النخبة',
          teacherId: 'teacher-1',
          maxCapacity: 30,
          monthlyFee: 500,
          _count: { enrollments: 5 },
          teacher: { id: 'teacher-1', user: { fullName: 'أستاذ أحمد غريب' } },
        },
      },
    ];

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
        findFirst: vi.fn().mockImplementation(() => Promise.resolve(studentDb)),
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
            const matchesExpiry =
              where.OR?.some((cond: any) => {
                if (cond.pinExpiresAt === null && studentDb.pinExpiresAt === null) return true;
                if (cond.pinExpiresAt?.lte && studentDb.pinExpiresAt && studentDb.pinExpiresAt <= cond.pinExpiresAt.lte) return true;
                return false;
              });

            if (matchesExpiry) {
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
      groupEnrollment: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          const match = enrollmentsDb.find((e) => e.id === where.id);
          return Promise.resolve(match || null);
        }),
        findMany: vi.fn().mockImplementation(() => Promise.resolve([])),
        count: vi.fn().mockImplementation(({ where }) => {
          const matching = enrollmentsDb.filter((e) => {
            if (e.studentId !== where.studentId) return false;
            if (where.status && e.status !== where.status) return false;
            return true;
          });
          return Promise.resolve(matching.length);
        }),
        delete: vi.fn().mockImplementation(({ where }) => {
          const idx = enrollmentsDb.findIndex((e) => e.id === where.id);
          if (idx !== -1) {
            const [deleted] = enrollmentsDb.splice(idx, 1);
            return Promise.resolve(deleted);
          }
          return Promise.resolve({});
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const item = enrollmentsDb.find((e) => e.id === where.id);
          if (item) {
            Object.assign(item, data);
            return Promise.resolve(item);
          }
          return Promise.resolve({});
        }),
        updateMany: vi.fn().mockImplementation(({ where, data }) => {
          let count = 0;
          for (const item of enrollmentsDb) {
            if (item.studentId === where.studentId && item.status === where.status) {
              Object.assign(item, data);
              count++;
            }
          }
          return Promise.resolve({ count });
        }),
      },
      studentPaymentRecord: {
        create: vi.fn().mockResolvedValue({ id: 'pay-rec-1' }),
      },
      refreshTokenSession: {
        create: vi.fn().mockResolvedValue({ id: 'sess-1' }),
      },
      teacherAssistant: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(async (callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(mockPrisma);
        }
        return Promise.all(callbackOrArray);
      }),
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
    credentialsService = new AuthCredentialsService(
      mockPrisma as any,
      tokenService,
      sessionService,
    );

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

    mockNotificationsService = {
      sendNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };
    mockRealtimeGateway = {
      notifyReservationsChanged: vi.fn(),
    };
    mockGroupCrudService = {
      checkTeacherOwnership: vi.fn().mockResolvedValue(true),
    };

    reservationsService = new GroupReservationsService(
      mockPrisma as any,
      mockNotificationsService as any,
      mockRealtimeGateway as any,
      mockGroupCrudService as any,
      undefined,
    );
  });

  // =========================================================================
  // 1. Legacy PIN Cleanup & Idempotence
  // =========================================================================
  describe('1. Safe Remediation of Legacy PINs Without Expiration (pinExpiresAt = NULL)', () => {
    it('purges obsolete legacy tempAccessPin records where pinExpiresAt is NULL', async () => {
      expect(studentDb.tempAccessPin).toBe(legacyPin);
      expect(studentDb.pinExpiresAt).toBeNull();

      const result = await cleanupJobsService.cleanupExpiredTemporaryPins();

      expect(result.purgedCount).toBe(1);
      expect(studentDb.tempAccessPin).toBeNull();
      expect(studentDb.pinExpiresAt).toBeNull();
    });

    it('preserves valid, unexpired temporary PINs whose pinExpiresAt is in the future', async () => {
      studentDb.tempAccessPin = 'unexpiredPIN123';
      studentDb.pinExpiresAt = unexpiredDate;

      const result = await cleanupJobsService.cleanupExpiredTemporaryPins();

      expect(result.purgedCount).toBe(0);
      expect(studentDb.tempAccessPin).toBe('unexpiredPIN123');
      expect(studentDb.pinExpiresAt).toBe(unexpiredDate);
    });

    it('is strictly idempotent: running cleanup twice produces 0 purged rows on the second pass', async () => {
      const pass1 = await cleanupJobsService.cleanupExpiredTemporaryPins();
      expect(pass1.purgedCount).toBe(1);

      const pass2 = await cleanupJobsService.cleanupExpiredTemporaryPins();
      expect(pass2.purgedCount).toBe(0);
    });

    it('never touches or alters users.passwordHash during cleanup of legacy PINs', async () => {
      const originalHash = studentDb.user.passwordHash;

      await cleanupJobsService.cleanupExpiredTemporaryPins();

      expect(studentDb.user.passwordHash).toBe(originalHash);
      expect(studentDb.user.passwordHash).toBe('$2a$10$studentpermhash');
    });

    it('allows student to authenticate with permanent password after legacy PIN is cleaned up', async () => {
      await cleanupJobsService.cleanupExpiredTemporaryPins();
      expect(studentDb.tempAccessPin).toBeNull();

      const tokens = await credentialsService.login({
        identifier: '01011112222',
        password: 'StudentPermPass123!',
      });

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBe('jwt-mock-token-xyz');
    });
  });

  // =========================================================================
  // 2. Authentication Bypass Prevention with Legacy Null-Expiry PINs
  // =========================================================================
  describe('2. Authentication Security: Blocking Legacy PIN Bypass', () => {
    it('BLOCKS student login when using legacy PIN with NULL pinExpiresAt', async () => {
      studentDb.tempAccessPin = legacyPin;
      studentDb.pinExpiresAt = null;

      await expect(
        credentialsService.login({
          identifier: '01011112222',
          password: legacyPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('BLOCKS parent login via /login when using linked student legacy PIN with NULL pinExpiresAt', async () => {
      studentDb.tempAccessPin = legacyPin;
      studentDb.pinExpiresAt = null;

      await expect(
        credentialsService.login({
          identifier: '01033334444',
          password: legacyPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('BLOCKS parent access via /parent-access when student tempAccessPin has NULL pinExpiresAt', async () => {
      studentDb.tempAccessPin = legacyPin;
      studentDb.pinExpiresAt = null;

      await expect(
        credentialsService.parentAccess({
          studentPhone: '01011112222',
          password: legacyPin,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('authenticates student with permanent password even when it matches the expired temporary PIN string', async () => {
      // The user enters their permanent password. Even if the expired temp PIN string was identical,
      // permanent authentication succeeds via standard bcrypt comparison against passwordHash.
      studentDb.tempAccessPin = 'StudentPermPass123!';
      studentDb.pinExpiresAt = new Date(Date.now() - 3600_000); // EXPIRED

      const tokens = await credentialsService.login({
        identifier: '01011112222',
        password: 'StudentPermPass123!',
      });

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBe('jwt-mock-token-xyz');
      // DB opportunistically purges the expired temp PIN copy
      expect(studentDb.tempAccessPin).toBeNull();
    });

    it('opportunistically purges legacy PIN (null expiry) upon verified login with permanent password', async () => {
      studentDb.tempAccessPin = legacyPin;
      studentDb.pinExpiresAt = null;

      const tokens = await credentialsService.login({
        identifier: '01011112222',
        password: 'StudentPermPass123!',
      });

      expect(tokens).toBeDefined();
      expect(studentDb.tempAccessPin).toBeNull();
      expect(studentDb.pinExpiresAt).toBeNull();
      expect(studentDb.pendingCredentials).toBeNull();
    });

    it('opportunistic student login preserves active parent reset credentials while clearing student PIN', async () => {
      studentDb.tempAccessPin = legacyPin;
      studentDb.pinExpiresAt = null;
      studentDb.pendingCredentials = {
        studentPassword: 'OldStudentPass!',
        parentPassword: 'FreshParentResetPass99!',
        parentPhone: '01033334444',
        updatedAt: new Date().toISOString(), // Active parent reset!
      };

      const tokens = await credentialsService.login({
        identifier: '01011112222',
        password: 'StudentPermPass123!',
      });

      expect(tokens).toBeDefined();
      expect(studentDb.tempAccessPin).toBeNull();
      // Crucial: Active parent reset is PRESERVED, not erased!
      expect(studentDb.pendingCredentials).not.toBeNull();
      expect(studentDb.pendingCredentials.parentPassword).toBe('FreshParentResetPass99!');
      expect(studentDb.pendingCredentials.studentPassword).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. Teacher Credential Retrieval API Boundary
  // =========================================================================
  describe('3. Teacher Credential Retrieval API Masking with Legacy Records', () => {
    const teacherUser = { id: 'teacher-1', role: UserRole.TEACHER, fullName: 'أستاذ أحمد غريب' };

    it('returns tempAccessPin: null and isPinActive: false when pinExpiresAt is NULL', async () => {
      studentDb.tempAccessPin = legacyPin;
      studentDb.pinExpiresAt = null;

      const res = await studentCredentialsService.getStudentCredentials('stu-profile-1', teacherUser as any);

      expect(res.tempAccessPin).toBeNull();
      expect(res.isPinActive).toBe(false);
      expect(res.parentPassword).toBeNull();
    });
  });

  // =========================================================================
  // 4. pendingCredentials Lifecycle in Reservation Approval & Rejection
  // =========================================================================
  describe('4. pendingCredentials Lifecycle in Group Reservation Workflows', () => {
    const teacherUser = { id: 'teacher-1', role: UserRole.TEACHER, fullName: 'أستاذ أحمد غريب' };

    it('safely clears pendingCredentials on rejectReservation when student has no other pending reservations', async () => {
      expect(studentDb.pendingCredentials).not.toBeNull();
      expect(enrollmentsDb.length).toBe(1);

      await reservationsService.rejectReservation('enrollment-1', teacherUser as any);

      expect(enrollmentsDb.length).toBe(0);
      expect(studentDb.pendingCredentials).toBeNull();
    });

    it('preserves active parent reset credentials on rejectReservation when reservation is rejected', async () => {
      studentDb.pendingCredentials = {
        studentPassword: 'OldStudentPass!',
        parentPassword: 'FreshParentResetPass99!',
        parentPhone: '01033334444',
        updatedAt: new Date().toISOString(), // Active parent reset!
      };

      await reservationsService.rejectReservation('enrollment-1', teacherUser as any);

      // Student onboarding password is gone, but active parent reset is preserved for card printing!
      expect(studentDb.pendingCredentials).not.toBeNull();
      expect(studentDb.pendingCredentials.parentPassword).toBe('FreshParentResetPass99!');
      expect(studentDb.pendingCredentials.studentPassword).toBeUndefined();
    });

    it('preserves pendingCredentials on rejectReservation if student still has another pending reservation in another group', async () => {
      // Add a second pending enrollment in another group
      enrollmentsDb.push({
        id: 'enrollment-2',
        studentId: studentDb.id,
        groupId: 'group-2',
        status: GroupEnrollmentStatus.PENDING,
        student: studentDb,
        group: { id: 'group-2', name: 'مجموعة الأبطال', teacherId: 'teacher-2' },
      });

      expect(enrollmentsDb.length).toBe(2);

      await reservationsService.rejectReservation('enrollment-1', teacherUser as any);

      expect(enrollmentsDb.length).toBe(1);
      expect(enrollmentsDb[0].id).toBe('enrollment-2');
      // Should NOT be cleared because enrollment-2 is still PENDING
      expect(studentDb.pendingCredentials).not.toBeNull();
      expect(studentDb.pendingCredentials.parentPassword).toBe('ParentPermPass123!');
    });

    it('clears pendingCredentials on acceptReservation when notification dispatch succeeds', async () => {
      expect(studentDb.pendingCredentials).not.toBeNull();

      await reservationsService.acceptReservation('enrollment-1', teacherUser as any, 'PAID');

      expect(mockNotificationsService.sendNotification).toHaveBeenCalledTimes(2); // student + parent
      expect(studentDb.pendingCredentials).toBeNull();
    });

    it('preserves active parent reset credentials on acceptReservation when notification dispatch succeeds', async () => {
      studentDb.pendingCredentials = {
        studentPassword: 'StudentPermPass123!',
        parentPassword: 'FreshParentResetPass99!',
        parentPhone: '01033334444',
        updatedAt: new Date().toISOString(), // Active parent reset!
      };

      await reservationsService.acceptReservation('enrollment-1', teacherUser as any, 'PAID');

      // Active parent reset is PRESERVED for printing
      expect(studentDb.pendingCredentials).not.toBeNull();
      expect(studentDb.pendingCredentials.parentPassword).toBe('FreshParentResetPass99!');
      expect(studentDb.pendingCredentials.studentPassword).toBeUndefined();
    });

    it('preserves pendingCredentials on acceptReservation if sendNotification throws an error, allowing retry', async () => {
      mockNotificationsService.sendNotification.mockRejectedValueOnce(
        new Error('WhatsApp Gateway Disconnected'),
      );

      await reservationsService.acceptReservation('enrollment-1', teacherUser as any, 'PAID');

      // Preserved for administrative retry
      expect(studentDb.pendingCredentials).not.toBeNull();
      expect(studentDb.pendingCredentials.studentPassword).toBe('StudentPermPass123!');
    });

    it('succeeds gracefully when acceptReservation is called on an account where pendingCredentials is already null', async () => {
      studentDb.pendingCredentials = null;

      const result = await reservationsService.acceptReservation('enrollment-1', teacherUser as any, 'PAID');

      expect(result).toBeDefined();
      expect(result.status).toBe(GroupEnrollmentStatus.ACTIVE);
      expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
      expect(studentDb.pendingCredentials).toBeNull();
    });
  });
});
