import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    studentProfile: {
      findFirst: jest.fn(),
    },
    refreshTokenSession: {
      create: jest.fn().mockResolvedValue({ id: 'session-1' }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'session-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
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
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully authenticate user and return access & refresh tokens', async () => {
      const plainPassword = 'Password123!';
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      const mockUser = {
        id: 'user-uuid-1',
        fullName: 'أ. طارق عبد الله',
        email: 'teacher@elawal.com',
        phone: '+201000000001',
        passwordHash,
        role: UserRole.TEACHER,
        isActive: true,
        deletedAt: null,
        teacherProfile: { id: 'teacher-profile-1' },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('mocked-access-token')
        .mockResolvedValueOnce('mocked-refresh-token');

      const result = await service.login({
        identifier: 'teacher@elawal.com',
        password: plainPassword,
      });

      expect(result.accessToken).toBe('mocked-access-token');
      expect(result.refreshToken).toBe('mocked-refresh-token');
      expect(result.user.id).toBe('user-uuid-1');
      expect(result.user.teacherProfileId).toBe('teacher-profile-1');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ identifier: 'nonexistent@elawal.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword!', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-uuid-1',
        passwordHash,
        isActive: true,
      });

      await expect(
        service.login({ identifier: 'teacher@elawal.com', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('requires and verifies the generated password for normal parent login', async () => {
      const plainPassword = 'ParentGenerated9!';
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'parent-user-1',
        fullName: 'أحمد علي إبراهيم',
        email: null,
        phone: '+201099999991',
        passwordHash,
        role: UserRole.PARENT,
        isActive: true,
        deletedAt: null,
        parentProfile: { id: 'parent-user-1' },
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('parent-access-token')
        .mockResolvedValueOnce('parent-refresh-token');

      const result = await service.login({
        identifier: '+201099999991',
        password: plainPassword,
      });

      expect(result.user.role).toBe(UserRole.PARENT);
      expect(result.user.parentProfileId).toBe('parent-user-1');
    });

    it('rejects a normal parent login without a password', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'parent-user-1',
        fullName: 'أحمد علي إبراهيم',
        email: null,
        phone: '+201099999991',
        passwordHash: '$2b$10$placeholder',
        role: UserRole.PARENT,
        isActive: true,
        deletedAt: null,
        parentProfile: { id: 'parent-user-1' },
      });

      await expect(
        service.login({ identifier: '+201099999991', password: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should verify token and issue new token pair', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-1',
        email: 'teacher@elawal.com',
        role: UserRole.TEACHER,
        typ: 'refresh',
      });

      mockPrismaService.refreshTokenSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-uuid-1',
        tokenHash: 'somehash',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        isActive: true,
        deletedAt: null,
        role: UserRole.TEACHER,
      });

      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken({ refreshToken: 'valid-refresh-token' });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });
  });

  describe('parentAccess', () => {
    it('authenticates the parent linked to a registered student phone with valid password', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue({
        user: { passwordHash: 'student-hashed-pass' },
        parentLinks: [
          {
            parent: {
              user: {
                id: 'parent-user-1',
                fullName: 'أحمد محمود',
                email: 'parent@elawal.com',
                phone: '+201099999991',
                passwordHash: 'parent-hashed-pass',
                role: UserRole.PARENT,
                isActive: true,
                deletedAt: null,
                parentProfile: { id: 'parent-profile-1' },
              },
            },
          },
        ],
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('parent-access-token')
        .mockResolvedValueOnce('parent-refresh-token');

      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);

      const result = await service.parentAccess({ studentPhone: '01011111111', password: 'secretpassword' });

      expect(result.user.role).toBe(UserRole.PARENT);
      expect(result.user.parentProfileId).toBe('parent-profile-1');
      expect(mockPrismaService.studentProfile.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                user: expect.objectContaining({
                  phone: { in: expect.arrayContaining(['01011111111', '+201011111111']) },
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('rejects when password is missing', async () => {
      await expect(
        service.parentAccess({ studentPhone: '01011111111' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unregistered student phone', async () => {
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.parentAccess({ studentPhone: '01011111111', password: 'secretpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
