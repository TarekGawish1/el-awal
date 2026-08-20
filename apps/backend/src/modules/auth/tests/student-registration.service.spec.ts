import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StudentRegistrationService } from '../services/student-registration.service';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  generateStudentRegistrationCode,
  hashStudentRegistrationCode,
} from '../../../common/utils/student-registration-code.util';
import { UserRole } from '@prisma/client';

describe('StudentRegistrationService', () => {
  let service: StudentRegistrationService;
  let authService: AuthService;

  const STUDENT_ID = 'student-user-uuid-1';

  // Real (non-mocked) helpers so hash matching logic is exercised end-to-end
  const plainCode = generateStudentRegistrationCode();
  const codeHash = hashStudentRegistrationCode(plainCode);

  const mockPrismaService = {
    studentProfile: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('registration-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: string) => defaultVal),
    getOrThrow: jest.fn((key: string) => 'test-secret-32-chars-long-for-jwt-signing'),
  };

  const mockAuthService = {
    issueTokens: jest.fn(),
  };

  const pendingStudent = {
    id: STUDENT_ID,
    studentCode: 'STU-2026-0001',
    gradeLevel: 'الصف الثالث الثانوي',
    registrationCodeHash: codeHash,
    accountClaimedAt: null,
    user: { id: STUDENT_ID, fullName: 'محمود أحمد علي' },
  };

  /**
   * Wires $transaction to execute its callback against a recording mock `tx`
   * and exposes the recorded calls for assertions.
   */
  function mockTransaction(handlers: {
    claimCount?: number;
    existingUser?: { phone?: string | null; email?: string | null };
    identifierCollision?: boolean;
  } = {}) {
    const recorded = {
      studentUpdateMany: null as any,
      userUpdate: null as any,
    };

    mockJwtService.verifyAsync.mockResolvedValue({ sub: STUDENT_ID, typ: 'student_registration' });

    mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        studentProfile: {
          updateMany: jest.fn().mockImplementation(async (args: any) => {
            recorded.studentUpdateMany = args;
            return { count: handlers.claimCount ?? 1 };
          }),
          findUnique: jest.fn().mockResolvedValue({
            user: { id: STUDENT_ID, role: UserRole.STUDENT, ...(handlers.existingUser ?? { phone: null, email: null }) },
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(handlers.identifierCollision ? { id: 'other-user' } : null),
          update: jest.fn().mockImplementation(async (args: any) => {
            recorded.userUpdate = args;
            return {
              id: STUDENT_ID,
              fullName: 'محمود أحمد علي',
              email: args.data.email ?? null,
              phone: args.data.phone ?? null,
              role: UserRole.STUDENT,
              teacherProfile: null,
              studentProfile: { id: STUDENT_ID },
              parentProfile: null,
              secretariatProfile: null,
            };
          }),
        },
      };
      return fn(tx);
    });

    return recorded;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentRegistrationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<StudentRegistrationService>(StudentRegistrationService);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('registration-token');
    mockAuthService.issueTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: STUDENT_ID, fullName: 'محمود أحمد علي', role: UserRole.STUDENT },
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =====================================================
  // STEP 1 — verifyStudent
  // =====================================================
  describe('verifyStudent', () => {
    it('issues a registration token for a pending student with a matching activation code', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(pendingStudent);

      const result = await service.verifyStudent({
        studentCode: 'STU-2026-0001',
        registrationCode: plainCode,
      });

      expect(result.registrationToken).toBe('registration-token');
      expect(result.fullName).toBe('محمود أحمد علي');
      expect(result.gradeLevel).toBe('الصف الثالث الثانوي');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: STUDENT_ID, typ: 'student_registration' },
        expect.objectContaining({ secret: expect.any(String), expiresIn: '10m' }),
      );
    });

    it('accepts the activation code regardless of case and separators', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(pendingStudent);

      const result = await service.verifyStudent({
        studentCode: 'STU-2026-0001',
        registrationCode: plainCode.toLowerCase().replace(/-/g, ' '),
      });

      expect(result.registrationToken).toBe('registration-token');
    });

    it('rejects an unknown student code with a generic error (anti-enumeration)', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyStudent({ studentCode: 'STU-9999-9999', registrationCode: plainCode }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a student without an issued activation code with the same generic error', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        ...pendingStudent,
        registrationCodeHash: null,
      });

      await expect(
        service.verifyStudent({ studentCode: 'STU-2026-0001', registrationCode: plainCode }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a wrong activation code with the same generic error', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(pendingStudent);

      await expect(
        service.verifyStudent({
          studentCode: 'STU-2026-0001',
          registrationCode: generateStudentRegistrationCode(),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not reveal "already registered" before the code is verified', async () => {
      const claimedStudent = { ...pendingStudent, accountClaimedAt: new Date() };
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(claimedStudent);

      // Wrong code + claimed account => generic Unauthorized, NOT Conflict
      await expect(
        service.verifyStudent({
          studentCode: 'STU-2026-0001',
          registrationCode: generateStudentRegistrationCode(),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('reports STUDENT_ALREADY_REGISTERED only after a successful code match', async () => {
      const claimedStudent = { ...pendingStudent, accountClaimedAt: new Date() };
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(claimedStudent);

      await expect(
        service.verifyStudent({ studentCode: 'STU-2026-0001', registrationCode: plainCode }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =====================================================
  // STEP 2 — registerStudentAccount
  // =====================================================
  describe('registerStudentAccount', () => {
    const registerDto = {
      registrationToken: 'registration-token',
      phone: '01012345678',
      email: 'mahmoud@student.elawal.com',
      password: 'Password123!',
    };

    it('claims the student account, sets credentials and auto-authenticates with the STUDENT role', async () => {
      const recorded = mockTransaction();

      const result = await service.registerStudentAccount(registerDto);

      expect(result.accessToken).toBe('access-token');
      expect(result.user.id).toBe(STUDENT_ID);
      expect(result.user.role).toBe(UserRole.STUDENT);

      // The claim must be a single atomic conditional UPDATE
      expect(recorded.studentUpdateMany.where).toEqual({
        id: STUDENT_ID,
        accountClaimedAt: null,
        registrationCodeHash: { not: null },
      });
      expect(recorded.studentUpdateMany.data.accountClaimedAt).toBeInstanceOf(Date);
      expect(recorded.studentUpdateMany.data.registrationCodeHash).toBeNull();

      // Credentials only: role/academic identity are never touched
      expect(recorded.userUpdate.where).toEqual({ id: STUDENT_ID });
      expect(recorded.userUpdate.data.phone).toBe(registerDto.phone);
      expect(recorded.userUpdate.data.email).toBe(registerDto.email);
      expect(recorded.userUpdate.data.role).toBeUndefined();
      expect(recorded.userUpdate.data.fullName).toBeUndefined();

      // Password must be bcrypt-hashed, never plaintext
      const passwordHash = recorded.userUpdate.data.passwordHash as string;
      expect(passwordHash.startsWith('$2')).toBe(true);
      expect(passwordHash).not.toBe(registerDto.password);
      expect(await bcrypt.compare(registerDto.password, passwordHash)).toBe(true);

      expect(authService.issueTokens).toHaveBeenCalledTimes(1);
      expect((authService.issueTokens as jest.Mock).mock.calls[0][0]).toMatchObject({
        id: STUDENT_ID,
        role: UserRole.STUDENT,
        studentProfile: { id: STUDENT_ID },
      });
    });

    it('rejects registration when the student was already claimed concurrently', async () => {
      mockTransaction({ claimCount: 0 });

      await expect(service.registerStudentAccount(registerDto)).rejects.toThrow(ConflictException);
      expect(authService.issueTokens).not.toHaveBeenCalled();
    });

    it('rejects an invalid or expired registration token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.registerStudentAccount(registerDto)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token with the wrong type (e.g. a stolen access token)', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: STUDENT_ID, typ: 'access' });

      await expect(service.registerStudentAccount(registerDto)).rejects.toThrow(UnauthorizedException);
    });

    it('requires at least one login identifier when the user record has none', async () => {
      mockTransaction({ existingUser: { phone: null, email: null } });

      await expect(
        service.registerStudentAccount({
          registrationToken: 'registration-token',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a phone number already used by another account', async () => {
      mockTransaction({ identifierCollision: true });

      await expect(
        service.registerStudentAccount({ ...registerDto, email: undefined }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects an email already used by another account', async () => {
      mockTransaction({ identifierCollision: true });

      await expect(
        service.registerStudentAccount({ ...registerDto, phone: undefined }),
      ).rejects.toThrow(ConflictException);
    });

    it('keeps the identifier provided by the administration when the student submits none', async () => {
      const recorded = mockTransaction({ existingUser: { phone: '01012345678', email: null } });

      await service.registerStudentAccount({
        registrationToken: 'registration-token',
        password: 'Password123!',
      });

      expect(recorded.userUpdate.data.phone).toBeUndefined();
      expect(recorded.userUpdate.data.email).toBeUndefined();
      expect(recorded.userUpdate.data.passwordHash).toBeDefined();
    });
  });
});
