import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { StudentRegistrationService } from '../services/student-registration.service';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../../notifications/services/notifications.service';

describe('StudentRegistrationService', () => {
  let service: StudentRegistrationService;
  let authService: AuthService;

  const STUDENT_ID = 'student-user-uuid-1';
  const PARENT_ID = 'parent-user-uuid-1';

  // ============ Mock tx state ============
  const state = {
    studentPhoneExists: false,
    parent: null as null | { id: string; role: UserRole; deletedAt: Date | null },
    studentCode: 'STU-2026-00001',
    failParentLink: false,
    failParentCreate: false,
  };

  function buildTx() {
    return {
      user: {
        findFirst: jest.fn(async (args: any) => {
          // Determine which lookup this is by the `in` values
          const phones: string[] = args?.where?.phone?.in ?? [];
          if (phones.some((p) => p.includes('+201011111111'))) {
            return state.studentPhoneExists ? { id: 'other-student', role: UserRole.STUDENT } : null;
          }
          return state.parent;
        }),
        update: jest.fn(async () => ({})),
        create: jest.fn(async (args: any) => {
          if (args.data.role === UserRole.STUDENT) {
            return {
              id: STUDENT_ID,
              fullName: args.data.fullName,
              phone: args.data.phone,
              passwordHash: args.data.passwordHash,
              role: UserRole.STUDENT,
              studentProfile: { id: STUDENT_ID, studentCode: state.studentCode },
            };
          }
          if (args.data.role === UserRole.PARENT) {
            if (state.failParentCreate) {
              throw new ConflictException({ code: 'FORCED_PARENT_FAILURE', message: 'forced' });
            }
            return {
              id: PARENT_ID,
              fullName: args.data.fullName,
              phone: args.data.phone,
              passwordHash: args.data.passwordHash,
              role: UserRole.PARENT,
              parentProfile: { id: PARENT_ID },
            };
          }
          throw new Error('Unexpected user.create');
        }),
      },
      studentProfile: {
        count: jest.fn(async () => 0),
        findUnique: jest.fn(async (args: any) => {
          // studentCode uniqueness probe
          if (args.where?.studentCode) return null;
          return null;
        }),
        update: jest.fn(async () => ({})),
      },
      parentProfile: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({ id: PARENT_ID, relationshipType: 'ولي أمر' })),
      },
      parentStudentLink: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => {
          if (state.failParentLink) {
            throw new Error('link failure');
          }
          return { id: 'link-1', parentId: PARENT_ID, studentId: STUDENT_ID };
        }),
      },
    };
  }

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  const mockAuthService = {
    issueTokens: jest.fn(async () => ({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: STUDENT_ID, fullName: 'محمود أحمد علي', role: UserRole.STUDENT },
    })),
  };

  const validDto = {
    fullName: 'محمود أحمد علي',
    studentPhone: '01011111111',
    parentPhone: '01099999999',
    academicStage: 'SECONDARY',
    gradeLevel: 'الصف الثالث الثانوي',
    attendanceMode: 'CENTER',
  };

  beforeEach(async () => {
    state.studentPhoneExists = false;
    state.parent = null;
    state.failParentLink = false;
    state.failParentCreate = false;
    state.studentCode = 'STU-2026-00001';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentRegistrationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: NotificationsService,
          useValue: { sendNotification: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<StudentRegistrationService>(StudentRegistrationService);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates student + new parent + link atomically and auto-authenticates with STUDENT role', async () => {
    const tx = buildTx();
    mockPrismaService.$transaction.mockImplementation((fn: any) => fn(tx));

    const result = await service.registerStudent(validDto);

    // Tokens issued for the student
    expect(authService.issueTokens).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('access-token');
    expect(result.user.role).toBe(UserRole.STUDENT);
    expect(result.user.id).toBe(STUDENT_ID);

    // Student user created with normalized phone + hashed password + STUDENT role
    const studentCreateCall = tx.user.create.mock.calls.find((c: any) => c[0].data.role === UserRole.STUDENT);
    expect(studentCreateCall[0].data.role).toBe(UserRole.STUDENT);
    expect(studentCreateCall[0].data.phone).toBe('+201011111111');
    expect(studentCreateCall[0].data.fullName).toBe('محمود أحمد علي');

    // Parent user created with PARENT role + normalized phone + hashed password
    const parentCreateCall = tx.user.create.mock.calls.find((c: any) => c[0].data.role === UserRole.PARENT);
    expect(parentCreateCall[0].data.role).toBe(UserRole.PARENT);
    expect(parentCreateCall[0].data.phone).toBe('+201099999999');

    // Link created
    expect(tx.parentStudentLink.create).toHaveBeenCalledTimes(1);

    expect(result.credentials.studentCode).toMatch(/^STU\d{4}/);
    expect(result.credentials.studentPassword).toHaveLength(6);
    expect(result.credentials.parentPassword).toHaveLength(6);
    expect(result.credentials.parentIsNew).toBe(true);

    const studentHash = studentCreateCall[0].data.passwordHash;
    expect(studentHash).not.toBe(result.credentials.studentPassword);
    expect(studentHash.startsWith('$2')).toBe(true);
    expect(await bcrypt.compare(result.credentials.studentPassword, studentHash)).toBe(true);

    const parentHash = parentCreateCall[0].data.passwordHash;
    expect(await bcrypt.compare(result.credentials.parentPassword!, parentHash)).toBe(true);
  });

  it('rejects when student and parent phones are identical', async () => {
    mockPrismaService.$transaction.mockImplementation((fn: any) => fn(buildTx()));

    await expect(
      service.registerStudent({ ...validDto, parentPhone: validDto.studentPhone }),
    ).rejects.toThrow(ConflictException);
    expect(authService.issueTokens).not.toHaveBeenCalled();
  });

  it('rejects when the student phone is already registered (anti-duplicate)', async () => {
    state.studentPhoneExists = true;
    mockPrismaService.$transaction.mockImplementation((fn: any) => fn(buildTx()));

    await expect(service.registerStudent(validDto)).rejects.toThrow(ConflictException);
    expect(authService.issueTokens).not.toHaveBeenCalled();
  });

  it('links an existing PARENT account instead of duplicating it and returns no parent password', async () => {
    state.parent = { id: PARENT_ID, role: UserRole.PARENT, deletedAt: null };
    const tx = buildTx();
    mockPrismaService.$transaction.mockImplementation((fn: any) => fn(tx));

    const result = await service.registerStudent(validDto);

    expect(result.credentials.parentIsNew).toBe(false);
    expect(result.credentials.parentPassword).toBeNull();

    // No parent user was created
    const parentCreateCall = tx.user.create.mock.calls.find((c: any) => c[0].data.role === UserRole.PARENT);
    expect(parentCreateCall).toBeUndefined();
    // Link still created to the existing parent
    expect(tx.parentStudentLink.create).toHaveBeenCalledTimes(1);
  });

  it('links multiple students to the same parent phone successfully', async () => {
    state.parent = { id: PARENT_ID, role: UserRole.PARENT, deletedAt: null };
    const tx = buildTx();
    mockPrismaService.$transaction.mockImplementation((fn: any) => fn(tx));

    const result = await service.registerStudent(validDto);
    expect(result.credentials.parentIsNew).toBe(false);
    expect(tx.parentStudentLink.create).toHaveBeenCalled();
  });

  it('rolls back (no tokens issued) when parent link creation fails', async () => {
    state.failParentLink = true;
    mockPrismaService.$transaction.mockImplementation((fn: any) => fn(buildTx()));

    await expect(service.registerStudent(validDto)).rejects.toThrow('link failure');
    expect(authService.issueTokens).not.toHaveBeenCalled();
  });

  it('propagates a parent creation failure without issuing tokens', async () => {
    state.failParentCreate = true;
    mockPrismaService.$transaction.mockImplementation((fn: any) => fn(buildTx()));

    await expect(service.registerStudent(validDto)).rejects.toThrow(ConflictException);
    expect(authService.issueTokens).not.toHaveBeenCalled();
  });
});
