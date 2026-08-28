import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupEnrollmentStatus, UserRole } from '@prisma/client';

describe('AuthService — registerByGroup', () => {
  let service: AuthService;

  const groupId = 'group-uuid-1';
  const openGroup = {
    id: groupId,
    name: 'مجموعة الثانوية العامة أ',
    gradeLevel: 'الصف الثالث الثانوي',
    monthlyFee: 250,
    isActive: true,
    isRegistrationOpen: true,
    registrationLinkExpiry: null,
    registrationToken: 'invite-token-1',
  };

  const validDto = {
    token: 'invite-token-1',
    fullName: 'محمود أحمد علي',
    phone: '01012345678',
    parentName: 'محمد أحمد علي',
    parentPhone: '01098765432',
    password: 'Str0ngPass!',
  };

  const makeTx = () => ({
    user: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        // No pre-existing users by default
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: data.role === UserRole.PARENT ? 'parent-user-1' : 'student-user-1',
          fullName: data.fullName,
          phone: data.phone,
          role: data.role,
        }),
      ),
    },
    studentProfile: {
      count: jest.fn().mockResolvedValue(10),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    parentProfile: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    parentStudentLink: {
      create: jest.fn().mockResolvedValue({}),
    },
    groupEnrollment: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  });

  const mockPrismaService = {
    academicGroup: {
      findUnique: jest.fn(),
    },
    refreshTokenSession: {
      create: jest.fn().mockResolvedValue({ id: 'session-1' }),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: string) => defaultVal),
    getOrThrow: jest.fn((key: string) => 'test-secret-32-chars-long-for-jwt-signing'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync
      .mockResolvedValueOnce('mocked-access-token')
      .mockResolvedValueOnce('mocked-refresh-token');
  });

  it('should create the student, parent, and ACTIVE enrollment atomically in a single transaction', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(openGroup);

    const tx = makeTx();
    mockPrismaService.$transaction.mockImplementation(async (cb: (t: any) => Promise<unknown>) =>
      cb(tx),
    );

    const result = await service.registerByGroup(validDto);

    // Single atomic transaction boundary
    expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

    // Student User + StudentProfile created (role forced server-side)
    const studentCreateCall = tx.user.create.mock.calls[0][0];
    expect(tx.user.create).toHaveBeenCalledTimes(2);
    expect(studentCreateCall.data.role).toBe(UserRole.STUDENT);
    expect(studentCreateCall.data.phone).toBe('+201012345678');
    expect(studentCreateCall.data.studentProfile.create.gradeLevel).toBe('الصف الثالث الثانوي');
    expect(studentCreateCall.data.studentProfile.create.studentCode).toMatch(/^STU\d+/);

    // New parent created with the submitted parentName & parentPhone
    const parentCreateCall = tx.user.create.mock.calls[1][0];
    expect(parentCreateCall.data.role).toBe(UserRole.PARENT);
    expect(parentCreateCall.data.fullName).toBe('محمد أحمد علي');
    expect(parentCreateCall.data.phone).toBe('+201098765432');

    // Parent ↔ student link
    expect(tx.parentStudentLink.create).toHaveBeenCalledWith({
      data: { parentId: 'parent-user-1', studentId: 'student-user-1' },
    });

    // Active group enrollment inside the same transaction
    expect(tx.groupEnrollment.upsert).toHaveBeenCalledTimes(1);
    const upsertCall = tx.groupEnrollment.upsert.mock.calls[0][0];
    expect(upsertCall.create.groupId).toBe(groupId);
    expect(upsertCall.create.studentId).toBe('student-user-1');
    expect(upsertCall.create.status).toBe(GroupEnrollmentStatus.ACTIVE);
    expect(upsertCall.create.enrolledAt).toBeInstanceOf(Date);

    // Immediate sign-in tokens returned
    expect(result.accessToken).toBe('mocked-access-token');
    expect(result.refreshToken).toBe('mocked-refresh-token');
    expect(result.user.role).toBe(UserRole.STUDENT);
  });

  it('should link an existing parent instead of creating a new one', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(openGroup);

    const tx = makeTx();
    tx.user.findFirst.mockImplementation(({ where }: any) => {
      const phone = where.phone.in[0];
      if (phone.includes('98765432')) {
        return Promise.resolve({ id: 'existing-parent-user', role: UserRole.PARENT, deletedAt: null });
      }
      return Promise.resolve(null);
    });
    tx.parentProfile.findUnique.mockResolvedValue({ id: 'existing-parent-user' });
    mockPrismaService.$transaction.mockImplementation(async (cb: (t: any) => Promise<unknown>) =>
      cb(tx),
    );

    await service.registerByGroup(validDto);

    // Only the student user was created; parent was linked
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.parentProfile.create).not.toHaveBeenCalled();
    expect(tx.parentStudentLink.create).toHaveBeenCalledWith({
      data: { parentId: 'existing-parent-user', studentId: 'student-user-1' },
    });
  });

  it('should reject an invalid invite token without running the transaction', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(null);

    await expect(service.registerByGroup(validDto)).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('should reject registration when the group registration is closed', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      ...openGroup,
      isRegistrationOpen: false,
    });

    await expect(service.registerByGroup(validDto)).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('should reject registration when the registration link has expired', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      ...openGroup,
      registrationLinkExpiry: new Date(Date.now() - 60 * 60 * 1000),
    });

    await expect(service.registerByGroup(validDto)).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('should reject duplicate student phone numbers with ConflictException', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(openGroup);

    const tx = makeTx();
    tx.user.findFirst.mockResolvedValue({ id: 'existing-user', role: UserRole.STUDENT });
    mockPrismaService.$transaction.mockImplementation(async (cb: (t: any) => Promise<unknown>) =>
      cb(tx),
    );

    await expect(service.registerByGroup(validDto)).rejects.toThrow(ConflictException);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.groupEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('should reject identical student and parent phone numbers', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(openGroup);

    await expect(
      service.registerByGroup({ ...validDto, parentPhone: '01012345678' }),
    ).rejects.toThrow(ConflictException);
    expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
  });

  it('should roll back everything when the enrollment write fails', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(openGroup);

    const tx = makeTx();
    tx.groupEnrollment.upsert.mockRejectedValue(new Error('simulated failure'));
    mockPrismaService.$transaction.mockImplementation(async (cb: (t: any) => Promise<unknown>) =>
      cb(tx),
    );

    await expect(service.registerByGroup(validDto)).rejects.toThrow('simulated failure');
    // Transaction threw — nothing is committed
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });
});

describe('AuthService — getGroupInvite', () => {
  let service: AuthService;

  const mockPrismaService = {
    academicGroup: {
      findUnique: jest.fn(),
    },
    refreshTokenSession: { create: jest.fn() },
  };

  const mockJwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: string) => defaultVal),
    getOrThrow: jest.fn((key: string) => 'test-secret-32-chars-long-for-jwt-signing'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should return valid invite metadata for an open group', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      id: 'group-uuid-1',
      name: 'مجموعة الثانوية العامة أ',
      gradeLevel: 'الصف الثالث الثانوي',
      monthlyFee: 250,
      isActive: true,
      isRegistrationOpen: true,
      registrationLinkExpiry: null,
      teacher: { user: { fullName: 'الأستاذ أحمد' } },
    });

    const result = await service.getGroupInvite('invite-token-1');

    expect(result).toEqual({
      groupId: 'group-uuid-1',
      groupName: 'مجموعة الثانوية العامة أ',
      gradeLevel: 'الصف الثالث الثانوي',
      stage: 'المرحلة الثانوية',
      teacherName: 'الأستاذ أحمد',
      monthlyFee: 250,
      isValid: true,
    });
  });

  it('should return isValid=false for a closed registration', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue({
      id: 'group-uuid-1',
      name: 'مجموعة',
      gradeLevel: 'الصف الثاني الإعدادي',
      monthlyFee: 100,
      isActive: true,
      isRegistrationOpen: false,
      registrationLinkExpiry: null,
      teacher: { user: { fullName: 'الأستاذ أحمد' } },
    });

    const result = await service.getGroupInvite('invite-token-1');
    expect(result.isValid).toBe(false);
  });

  it('should return isValid=false for an unknown token', async () => {
    mockPrismaService.academicGroup.findUnique.mockResolvedValue(null);

    const result = await service.getGroupInvite('unknown-token');
    expect(result.isValid).toBe(false);
    expect(result.groupId).toBe('');
  });
});
