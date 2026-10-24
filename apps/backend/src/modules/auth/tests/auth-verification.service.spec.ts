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

  describe('SEC-10 & SEC-16: requestLoginOtp', () => {
    it('should throw BadRequestException if phone or identifier is malformed', async () => {
      await expect(service.requestLoginOtp('12345')).rejects.toThrow(BadRequestException);
      await expect(service.requestLoginOtp('')).rejects.toThrow(BadRequestException);
      await expect(service.requestLoginOtp('invalid-non-phone')).rejects.toThrow(BadRequestException);
    });

    it('should generate a cryptographically secure 6-digit OTP and dispatch WhatsApp message for registered user (SEC-10)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.requestLoginOtp('01098765432');

      expect(result.success).toBe(true);
      expect(result.cooldownSeconds).toBe(60);
      expect(mockWhatsAppService.sendTrackedProtectedMessage).toHaveBeenCalled();
      expect(mockPrismaService.authVerificationToken.create).toHaveBeenCalled();

      // Extract the dispatched message and verify 6-digit code structure
      const dispatchedCall = mockWhatsAppService.sendTrackedProtectedMessage.mock.calls[0];
      const dispatchedText: string = dispatchedCall[1];
      const codeMatch = dispatchedText.match(/\b\d{6}\b/);
      expect(codeMatch).not.toBeNull();
      const codeNum = parseInt(codeMatch![0], 10);
      expect(codeNum).toBeGreaterThanOrEqual(100000);
      expect(codeNum).toBeLessThanOrEqual(999999);
    });

    it('should normalize response and prevent account enumeration when phone is not registered (SEC-16)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);

      const nonExistingPhoneResult = await service.requestLoginOtp('01011112233');

      // Status payload must match existing user response exactly
      expect(nonExistingPhoneResult).toEqual({
        success: true,
        message: 'تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك بنجاح',
        cooldownSeconds: 60,
      });

      // Crucial: Must NOT dispatch WhatsApp or persist token for non-existing account
      expect(mockWhatsAppService.sendTrackedProtectedMessage).not.toHaveBeenCalled();
      expect(mockPrismaService.authVerificationToken.create).not.toHaveBeenCalled();
    });

    it('should return identical 200 OK response when WhatsApp number is not registered (no leak via 400)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockWhatsAppService.sendTrackedProtectedMessage.mockResolvedValueOnce({ outcome: 'not_registered' });

      const result = await service.requestLoginOtp('01098765432');

      expect(result).toEqual({
        success: true,
        message: 'تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك بنجاح',
        cooldownSeconds: 60,
      });
      expect(mockWhatsAppService.sendTrackedProtectedMessage).toHaveBeenCalled();
    });

    it('should return identical 200 OK response when WhatsApp gateway is disconnected (no leak via 503)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockWhatsAppService.sendTrackedProtectedMessage.mockResolvedValueOnce({
        outcome: 'not_connected',
        failureReason: 'Socket closed',
      });

      const result = await service.requestLoginOtp('01098765432');

      expect(result).toEqual({
        success: true,
        message: 'تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك بنجاح',
        cooldownSeconds: 60,
      });
    });

    it('should return identical 200 OK response when WhatsApp gateway encounters internal error or throws', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockWhatsAppService.sendTrackedProtectedMessage.mockRejectedValueOnce(new Error('Gateway network crash'));

      const result = await service.requestLoginOtp('01098765432');

      expect(result).toEqual({
        success: true,
        message: 'تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك بنجاح',
        cooldownSeconds: 60,
      });
    });

    it('should normalize response for non-existing plausible student code (SEC-16)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);

      const nonExistingStudentCodeResult = await service.requestLoginOtp('STU202699999');

      expect(nonExistingStudentCodeResult).toEqual({
        success: true,
        message: 'تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك بنجاح',
        cooldownSeconds: 60,
      });
      expect(mockWhatsAppService.sendTrackedProtectedMessage).not.toHaveBeenCalled();
    });

    it('should enforce 60s cooldown equally for existing and non-existing identifiers', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);

      await service.requestLoginOtp('01055554433');

      // Second request immediately for non-existing phone hits cooldown
      await expect(service.requestLoginOtp('01055554433')).rejects.toThrow(BadRequestException);
    });
  });

  describe('SEC-10: verifyLoginOtp Lifecycle & Security', () => {
    const validCode = '123456';
    const codeHash = createHash('sha256').update(validCode).digest('hex');

    it('should throw UnauthorizedException if no active token exists', async () => {
      mockPrismaService.authVerificationToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyLoginOtp('01098765432', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired OTP (TTL > 5 minutes) and mark token used', async () => {
      const expiredToken = {
        id: 'tok-expired',
        identifier: '+201098765432',
        tokenHash: codeHash,
        tokenType: 'LOGIN_OTP',
        expiresAt: new Date(Date.now() - 1000 * 60), // expired 1 min ago
        attempts: 0,
        usedAt: null,
      };
      mockPrismaService.authVerificationToken.findFirst.mockResolvedValue(expiredToken);

      await expect(service.verifyLoginOtp('01098765432', validCode)).rejects.toThrow(
        /انتهت صلاحية رمز التحقق/,
      );
      expect(mockPrismaService.authVerificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tok-expired' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
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
          data: expect.objectContaining({ attempts: 3, usedAt: expect.any(Date) }),
        }),
      );
    });

    it('should successfully verify code, mark token used and return user (single-use guarantee)', async () => {
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

  describe('SEC-16: Password Reset Anti-Enumeration & Execution', () => {
    it('should normalize response and prevent enumeration when phone is not registered for reset', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.studentProfile.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset('01044443322');

      expect(result).toEqual({
        success: true,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى رقم الواتساب الخاص بك',
        cooldownSeconds: 60,
      });
      expect(mockWhatsAppService.sendTrackedProtectedMessage).not.toHaveBeenCalled();
      expect(mockPrismaService.authVerificationToken.create).not.toHaveBeenCalled();
    });
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

    it('should return identical 200 OK response for password reset when WhatsApp is not registered', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockWhatsAppService.sendTrackedProtectedMessage.mockResolvedValueOnce({ outcome: 'not_registered' });

      const result = await service.requestPasswordReset('01098765432');

      expect(result).toEqual({
        success: true,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى رقم الواتساب الخاص بك',
        cooldownSeconds: 60,
      });
    });

    it('should return identical 200 OK response for password reset when WhatsApp is disconnected or errors', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockWhatsAppService.sendTrackedProtectedMessage.mockResolvedValueOnce({ outcome: 'not_connected' });

      const result = await service.requestPasswordReset('01098765432');

      expect(result).toEqual({
        success: true,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى رقم الواتساب الخاص بك',
        cooldownSeconds: 60,
      });
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
