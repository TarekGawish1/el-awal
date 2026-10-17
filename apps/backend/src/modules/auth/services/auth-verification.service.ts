import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { WhatsAppService } from '../../../services/whatsapp/whatsapp.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import {
  isEgyptianPhone,
  normalizeEgyptianPhone,
} from '../../../common/utils/phone.util';
import {
  formatLoginOtpMessage,
  formatPasswordResetMessage,
} from '../../../utils/spintax';
import { AuthPhoneResolverService } from './auth-phone-resolver.service';

@Injectable()
export class AuthVerificationService implements OnModuleInit {
  private readonly logger = new Logger(AuthVerificationService.name);
  private readonly phoneResolver: AuthPhoneResolverService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsAppService,
    @Optional() private readonly redisCache?: RedisCacheService,
    @Optional() phoneResolver?: AuthPhoneResolverService,
  ) {
    this.phoneResolver =
      phoneResolver ??
      new AuthPhoneResolverService(this.prisma, this.redisCache);
  }

  /**
   * Initializes PostgreSQL enum and table for auth verification tokens safely
   */
  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_token_type') THEN
                CREATE TYPE "verification_token_type" AS ENUM ('LOGIN_OTP', 'PASSWORD_RESET');
            END IF;
        END$$;

        CREATE TABLE IF NOT EXISTS "auth_verification_tokens" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "identifier" VARCHAR(100) NOT NULL,
            "token_hash" VARCHAR(128) NOT NULL,
            "token_type" "verification_token_type" NOT NULL,
            "expires_at" TIMESTAMPTZ(6) NOT NULL,
            "attempts" INTEGER NOT NULL DEFAULT 0,
            "used_at" TIMESTAMPTZ(6),
            "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "auth_verification_tokens_pkey" PRIMARY KEY ("id")
        );

        CREATE INDEX IF NOT EXISTS "idx_auth_verification_lookup" ON "auth_verification_tokens"("identifier", "token_type", "used_at", "expires_at");
        CREATE INDEX IF NOT EXISTS "idx_auth_verification_token" ON "auth_verification_tokens"("token_hash", "token_type");
      `);
      this.logger.log('✅ Auth verification database schema verified successfully.');
    } catch (err: any) {
      this.logger.warn(`Notice on auth verification table bootstrap: ${err?.message}`);
    }
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw.trim()).digest('hex');
  }

  /**
   * Requests a 6-digit WhatsApp OTP code for quick login
   */
  async requestLoginOtp(
    rawPhone: string,
    role?: string,
  ): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const { normalizedPhone, user, trimmed } =
      await this.phoneResolver.resolveTargetUserAndPhone(rawPhone, role);

    await this.phoneResolver.checkAndRecordRateLimit(normalizedPhone, 'OTP');

    // 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = this.hashToken(code);

    const messageText = formatLoginOtpMessage({
      name: user.fullName,
      code,
      expiresInMinutes: 5,
    });

    // Anti-ban WhatsApp dispatch
    const sendResult = await this.whatsappService.sendTrackedProtectedMessage(normalizedPhone, messageText);

    if (sendResult.outcome === 'not_registered') {
      throw new BadRequestException('رقم الهاتف غير مسجل على تطبيق واتساب');
    }

    if (sendResult.outcome === 'not_connected') {
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        this.logger.warn(`⚠️ [DEV WhatsApp Sim] OTP for ${normalizedPhone} (${user.fullName}): [ ${code} ]`);
      } else {
        throw new ServiceUnavailableException('بوابة إرسال رسائل الواتساب غير متصلة حالياً، يرجى المحاولة بعد قليل أو الدخول بكلمة المرور');
      }
    } else if (sendResult.outcome === 'error') {
      this.logger.error(`Failed to dispatch OTP message to ${normalizedPhone}: ${sendResult.failureReason}`);
      throw new ServiceUnavailableException('تعذر إرسال رمز التحقق عبر واتساب حالياً. يرجى المحاولة لاحقاً');
    }

    // Invalidate prior unused OTPs for this phone and identifier
    await this.prisma.authVerificationToken.updateMany({
      where: {
        identifier: { in: [normalizedPhone, trimmed] },
        tokenType: 'LOGIN_OTP',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Create fresh OTP record (5-minute TTL)
    await this.prisma.authVerificationToken.create({
      data: {
        identifier: normalizedPhone,
        tokenHash,
        tokenType: 'LOGIN_OTP',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return {
      success: true,
      message: 'تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك بنجاح',
      cooldownSeconds: 60,
    };
  }

  /**
   * Verifies the 6-digit OTP code and returns the authenticated user
   */
  async verifyLoginOtp(rawPhone: string, rawCode: string, role?: string) {
    const trimmedPhone = (rawPhone || '').trim();
    const trimmedCode = (rawCode || '').trim();

    if (!trimmedPhone || !trimmedCode) {
      throw new BadRequestException('رقم الهاتف ورمز التحقق مطلوبان');
    }

    const normalizedPhone = isEgyptianPhone(trimmedPhone)
      ? normalizeEgyptianPhone(trimmedPhone)
      : trimmedPhone;
    const tokenHash = this.hashToken(trimmedCode);

    let activeToken = await this.prisma.authVerificationToken.findFirst({
      where: {
        identifier: { in: [normalizedPhone, trimmedPhone] },
        tokenType: 'LOGIN_OTP',
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeToken && !isEgyptianPhone(trimmedPhone)) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { studentCode: trimmedPhone },
        select: {
          emergencyPhone: true,
          user: { select: { phone: true } },
          parentLinks: { take: 1, select: { parent: { select: { user: { select: { phone: true } } } } } },
        },
      });
      const candidatePhone =
        student?.parentLinks?.[0]?.parent?.user?.phone ||
        student?.emergencyPhone ||
        student?.user?.phone;
      if (candidatePhone && isEgyptianPhone(candidatePhone)) {
        const normCandidate = normalizeEgyptianPhone(candidatePhone);
        activeToken = await this.prisma.authVerificationToken.findFirst({
          where: {
            identifier: normCandidate,
            tokenType: 'LOGIN_OTP',
            usedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (!activeToken) {
      throw new UnauthorizedException('رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى طلب رمز جديد');
    }

    if (new Date() > activeToken.expiresAt) {
      await this.prisma.authVerificationToken.update({
        where: { id: activeToken.id },
        data: { usedAt: new Date() },
      });
      throw new UnauthorizedException('انتهت صلاحية رمز التحقق (أكثر من 5 دقائق). يرجى طلب رمز جديد');
    }

    if (activeToken.tokenHash !== tokenHash) {
      const attempts = activeToken.attempts + 1;
      if (attempts >= 3) {
        await this.prisma.authVerificationToken.update({
          where: { id: activeToken.id },
          data: { attempts, usedAt: new Date() },
        });
        throw new UnauthorizedException('تم استنفاد الحد الأقصى للمحاولات (3 محاولات). يرجى طلب رمز جديد');
      }

      await this.prisma.authVerificationToken.update({
        where: { id: activeToken.id },
        data: { attempts },
      });
      throw new UnauthorizedException(`رمز التحقق غير صحيح. متبقي ${3 - attempts} محاولات`);
    }

    // Mark as used
    await this.prisma.authVerificationToken.update({
      where: { id: activeToken.id },
      data: { usedAt: new Date() },
    });

    const user = await this.phoneResolver.findUserByPhone(activeToken.identifier, role);
    if (!user) {
      throw new UnauthorizedException('لم يتم العثور على الحساب المرتبط بهذا الرقم');
    }

    return user;
  }

  /**
   * Dispatches a secure password reset link via WhatsApp
   */
  async requestPasswordReset(
    rawPhone: string,
    role?: string,
  ): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const { normalizedPhone, user, trimmed } =
      await this.phoneResolver.resolveTargetUserAndPhone(rawPhone, role);

    await this.phoneResolver.checkAndRecordRateLimit(normalizedPhone, 'RESET');

    // Cryptographically secure 32-byte hex token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const platformUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL', 'https://al-awal.online');
    const resetUrl = `${platformUrl}/reset-password?token=${rawToken}`;

    const messageText = formatPasswordResetMessage({
      name: user.fullName,
      resetUrl,
      expiresInMinutes: 15,
    });

    // Anti-ban WhatsApp dispatch
    const sendResult = await this.whatsappService.sendTrackedProtectedMessage(normalizedPhone, messageText);

    if (sendResult.outcome === 'not_registered') {
      throw new BadRequestException('رقم الهاتف غير مسجل على تطبيق واتساب');
    }

    if (sendResult.outcome === 'not_connected') {
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        this.logger.warn(`⚠️ [DEV WhatsApp Sim] Password Reset Link for ${normalizedPhone}: [ ${resetUrl} ]`);
      } else {
        throw new ServiceUnavailableException('بوابة إرسال رسائل الواتساب غير متصلة حالياً، يرجى المحاولة بعد قليل');
      }
    } else if (sendResult.outcome === 'error') {
      this.logger.error(`Failed to dispatch reset link to ${normalizedPhone}: ${sendResult.failureReason}`);
      throw new ServiceUnavailableException('تعذر إرسال رابط الاستعادة عبر واتساب حالياً. يرجى المحاولة لاحقاً');
    }

    // Invalidate prior unused reset tokens
    await this.prisma.authVerificationToken.updateMany({
      where: {
        identifier: { in: [`USER:${user.id}:${normalizedPhone}`, normalizedPhone, trimmed] },
        tokenType: 'PASSWORD_RESET',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Create fresh password reset token (15-minute TTL)
    await this.prisma.authVerificationToken.create({
      data: {
        identifier: `USER:${user.id}:${normalizedPhone}`,
        tokenHash,
        tokenType: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return {
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى رقم الواتساب الخاص بك',
      cooldownSeconds: 60,
    };
  }

  /**
   * Confirms password reset using valid cryptographic token and updates user passwordHash
   */
  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const trimmedToken = (rawToken || '').trim();
    const trimmedPassword = (newPassword || '').trim();

    if (!trimmedToken) {
      throw new BadRequestException('رمز استعادة كلمة المرور مطلوب');
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      throw new BadRequestException('يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام');
    }

    const tokenHash = this.hashToken(trimmedToken);

    const activeToken = await this.prisma.authVerificationToken.findFirst({
      where: {
        tokenHash,
        tokenType: 'PASSWORD_RESET',
        usedAt: null,
      },
    });

    if (!activeToken) {
      throw new BadRequestException('رابط استعادة كلمة المرور غير صالح أو تم استخدامه مسبقاً');
    }

    if (new Date() > activeToken.expiresAt) {
      await this.prisma.authVerificationToken.update({
        where: { id: activeToken.id },
        data: { usedAt: new Date() },
      });
      throw new BadRequestException('انتهت صلاحية رابط الاستعادة (صالح لمدة 15 دقيقة فقط). يرجى طلب رابط جديد');
    }

    let user: any = null;
    if (activeToken.identifier.startsWith('USER:')) {
      const parts = activeToken.identifier.split(':');
      const userId = parts[1];
      user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true, deletedAt: null },
      });
    }

    if (!user) {
      user = await this.phoneResolver.findUserByPhone(activeToken.identifier);
    }

    if (!user) {
      throw new BadRequestException('الحساب المرتبط برابط الاستعادة غير موجود أو تم تعطيله');
    }

    const passwordHash = await bcrypt.hash(trimmedPassword, 10);

    // Atomically update password, mark token used, and revoke existing refresh sessions
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.authVerificationToken.update({
        where: { id: activeToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshTokenSession.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    this.logger.log(`🔑 Password successfully reset for user [${user.id}] (${user.fullName}) via WhatsApp reset link`);

    return {
      success: true,
      message: 'تم تعيين كلمة المرور الجديدة بنجاح. يمكنك الآن تسجيل الدخول بها.',
    };
  }
}
