import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import * as bcrypt from 'bcrypt';
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
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: string) => defaultVal),
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
  });

  describe('refreshToken', () => {
    it('should verify token and issue new token pair', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-1',
        email: 'teacher@elawal.com',
        role: UserRole.TEACHER,
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
});
