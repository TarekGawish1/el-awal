import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { AuthVerificationService } from '../services/auth-verification.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { WhatsAppService } from '../../../services/whatsapp/whatsapp.service';
import { UserRole } from '@prisma/client';

describe('AuthVerificationService', () => {
  let service: AuthVerificationService;

  const mockUser = {
    id: 'user-uuid-1',
    fullName: 'أحمد محمود',
    phone: '+201098765432',
    role: UserRole.STUDENT,
    passwordHash: 'old-hash',
    isActive: true,
    deletedAt: null,
  };

  const mockPrismaService = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    $transaction: vi.fn(async (cb) => {
      if (Array.isArray(cb)) return Promise.all(cb);
      return cb(mockPrismaService);
    }),
    user: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'user-uuid-1' }),
    },
    studentProfile: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    authVerificationToken: {
      create: vi.fn().mockResolvedValue({ id: 'token-uuid-1' }),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'token-uuid-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    refreshTokenSession: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultVal: string) => defaultVal || 'https://al-awal.online'),
  };

  const mockWhatsAppService = {
    sendTrackedProtectedMessage: vi.fn().mockResolvedValue({ outcome: 'sent', providerMessageId: 'wa-msg-1' }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthVerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile();

    service = module.get<AuthVerificationService>(AuthVerificationService);
  });

  describe('requestLoginOtp', () => {
    it('should throw BadRequestException if phone is invalid', async () => {
      await expect(service.requestLoginOtp('12345')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      await expect(service.requestLoginOtp('01098765432')).rejects.toThrow(NotFoundException);
    });

    it('should generate OTP and dispatch WhatsApp message for registered user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.requestLoginOtp('01098765432');

      expect(result.success).toBe(true);
      expect(result.cooldownSeconds).toBe(60);
      expect(mockWhatsAppService.sendTrackedProtectedMessage).toHaveBeenCalled();
      expect(mockPrismaService.authVerificationToken.create).toHaveBeenCalled();
    });

    it('should enforce cooldown if requested again within 60s', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      await service.requestLoginOtp('01098765432');

      // Second request immediately
      await expect(service.requestLoginOtp('01098765432')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyLoginOtp', () => {
    const validCode = '123456';
    const codeHash = createHash('sha256').update(validCode).digest('hex');

    it('should throw UnauthorizedException if no active token exists', async () => {
      mockPrismaService.authVerificationToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyLoginOtp('01098765432', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('should increment attempt count and lock token if wrong code is entered 3 times', async () => {
      const activeToken = {
        id: 'tok-1',
        identifier: '+201098765432',
        tokenHash: codeHash,
        tokenType: 'LOGIN_OTP',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 2, // 2 prior attempts, this is the 3rd
        usedAt: null,
      };

      mockPrismaService.authVerificationToken.findFirst.mockResolvedValue(activeToken);

      await expect(service.verifyLoginOtp('01098765432', '999999')).rejects.toThrow(
        /تم استنفاد الحد الأقصى للمحاولات/,
      );

      expect(mockPrismaService.authVerificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tok-1' },
          data: expect.objectContaining({ attempts: 3 }),
        }),
      );
    });

    it('should successfully verify code, mark token used and return user', async () => {
      const activeToken = {
        id: 'tok-1',
        identifier: '+201098765432',
        tokenHash: codeHash,
        tokenType: 'LOGIN_OTP',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
        usedAt: null,
      };

      mockPrismaService.authVerificationToken.findFirst.mockResolvedValue(activeToken);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const user = await service.verifyLoginOtp('01098765432', validCode);

      expect(user.id).toBe(mockUser.id);
      expect(mockPrismaService.authVerificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tok-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('Password Reset Flow', () => {
    it('should generate secure reset link and dispatch via WhatsApp', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.requestPasswordReset('01098765432');

      expect(result.success).toBe(true);
      expect(mockWhatsAppService.sendTrackedProtectedMessage).toHaveBeenCalled();
      expect(mockPrismaService.authVerificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tokenType: 'PASSWORD_RESET',
          }),
        }),
      );
    });

    it('should confirm password reset, update user passwordHash and revoke refresh sessions', async () => {
      const rawToken = 'my-super-secret-token-1234567890';
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      const activeResetToken = {
        id: 'reset-tok-1',
        identifier: '+201098765432',
        tokenHash,
        tokenType: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: null,
      };

      mockPrismaService.authVerificationToken.findFirst.mockResolvedValue(activeResetToken);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.confirmPasswordReset(rawToken, 'BrandNewPass123!');

      expect(result.success).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ passwordHash: expect.any(String) }),
        }),
      );
      expect(mockPrismaService.refreshTokenSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });
  });
});
