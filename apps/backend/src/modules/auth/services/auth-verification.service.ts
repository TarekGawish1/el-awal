import {
  Injectable,
  Logger,
  NotFoundException,
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
  getPhoneVariants,
} from '../../../common/utils/phone.util';
import {
  formatLoginOtpMessage,
  formatPasswordResetMessage,
} from '../../../utils/spintax';

interface MemoryRateLimit {
  lastRequestedAt: number;
  hourlyCount: number;
  windowStart: number;
}

@Injectable()
export class AuthVerificationService implements OnModuleInit {
  private readonly logger = new Logger(AuthVerificationService.name);
  private readonly memoryRateLimits = new Map<string, MemoryRateLimit>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsAppService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

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
   * Enforces 60-second cooldown and max 5 requests per hour per phone
   */
  private async checkAndRecordRateLimit(phone: string, actionType: 'OTP' | 'RESET'): Promise<void> {
    const key = `rate:${actionType}:${phone}`;
    const now = Date.now();

    if (this.redisCache) {
      const cooldownKey = `cooldown:${actionType}:${phone}`;
      const isCooldown = await this.redisCache.get<string>(cooldownKey);
      if (isCooldown) {
        throw new BadRequestException('يرجى الانتظار دقيقة واحدة قبل طلب رمز أو رابط جديد.');
      }

      const countKey = `hourly:${actionType}:${phone}`;
      const hourlyCount = (await this.redisCache.get<number>(countKey)) || 0;
      if (hourlyCount >= 5) {
        throw new BadRequestException('تم تجاوز الحد الأقصى للطلبات (5 محاولات في الساعة). يرجى المحاولة لاحقاً.');
      }

      await this.redisCache.set(cooldownKey, '1', 60);
      await this.redisCache.set(countKey, hourlyCount + 1, 3600);
      return;
    }

    // In-memory rate limiting fallback
    const record = this.memoryRateLimits.get(key) || {
      lastRequestedAt: 0,
      hourlyCount: 0,
      windowStart: now,
    };

    if (now - record.lastRequestedAt < 60 * 1000) {
      const remainingSecs = Math.ceil((60 * 1000 - (now - record.lastRequestedAt)) / 1000);
      throw new BadRequestException(`يرجى الانتظار ${remainingSecs} ثانية قبل إعادة المحاولة.`);
    }

    if (now - record.windowStart > 60 * 60 * 1000) {
      record.hourlyCount = 0;
      record.windowStart = now;
    }

    if (record.hourlyCount >= 5) {
      throw new BadRequestException('تم تجاوز الحد الأقصى للطلبات (5 محاولات في الساعة). يرجى المحاولة لاحقاً.');
    }

    record.lastRequestedAt = now;
    record.hourlyCount += 1;
    this.memoryRateLimits.set(key, record);
  }

  /**
   * Finds active user by Egyptian phone variants
   */
  private async findUserByPhone(phone: string) {
    const phoneVariants = getPhoneVariants(phone);

    const user = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
        isActive: true,
        deletedAt: null,
      },
      include: {
        teacherProfile: { select: { id: true } },
        studentProfile: { select: { id: true, tempAccessPin: true, pinExpiresAt: true } },
        parentProfile: { select: { id: true } },
        secretariatProfile: { select: { id: true } },
      },
    });

    if (user) return user;

    // Fallback: check linked student emergency phone for parents
    const linkedStudent = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          { emergencyPhone: { in: phoneVariants } },
          { user: { phone: { in: phoneVariants }, isActive: true, deletedAt: null } },
        ],
      },
      select: {
        parentLinks: {
          take: 1,
          select: {
            parent: {
              select: {
                user: {
                  include: {
                    teacherProfile: { select: { id: true } },
                    studentProfile: { select: { id: true } },
                    parentProfile: { select: { id: true } },
                    secretariatProfile: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (linkedStudent?.parentLinks?.[0]?.parent?.user) {
      return linkedStudent.parentLinks[0].parent.user;
    }

    return null;
  }

  /**
   * Requests a 6-digit WhatsApp OTP code for quick login
   */
  async requestLoginOtp(rawPhone: string): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const trimmed = (rawPhone || '').trim();
    if (!trimmed) {
      throw new BadRequestException('رقم الهاتف مطلوب');
    }
    if (!isEgyptianPhone(trimmed)) {
      throw new BadRequestException('يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678)');
    }

    const normalizedPhone = normalizeEgyptianPhone(trimmed);
    const user = await this.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new NotFoundException('رقم الهاتف المدخل غير مسجل لدينا في أي حساب نشط');
    }

    await this.checkAndRecordRateLimit(normalizedPhone, 'OTP');

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
      throw new BadRequestException('رقم الهاتف المدخل غير مسجل على تطبيق واتساب');
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

    // Invalidate prior unused OTPs for this phone
    await this.prisma.authVerificationToken.updateMany({
      where: {
        identifier: normalizedPhone,
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
  async verifyLoginOtp(rawPhone: string, rawCode: string) {
    const trimmedPhone = (rawPhone || '').trim();
    const trimmedCode = (rawCode || '').trim();

    if (!trimmedPhone || !trimmedCode) {
      throw new BadRequestException('رقم الهاتف ورمز التحقق مطلوبان');
    }

    const normalizedPhone = normalizeEgyptianPhone(trimmedPhone);
    const tokenHash = this.hashToken(trimmedCode);

    const activeToken = await this.prisma.authVerificationToken.findFirst({
      where: {
        identifier: normalizedPhone,
        tokenType: 'LOGIN_OTP',
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

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

    const user = await this.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new UnauthorizedException('لم يتم العثور على الحساب المرتبط بهذا الرقم');
    }

    return user;
  }

  /**
   * Dispatches a secure password reset link via WhatsApp
   */
  async requestPasswordReset(rawPhone: string): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const trimmed = (rawPhone || '').trim();
    if (!trimmed) {
      throw new BadRequestException('رقم الهاتف مطلوب');
    }
    if (!isEgyptianPhone(trimmed)) {
      throw new BadRequestException('يرجى إدخال رقم هاتف محمول مصري صحيح');
    }

    const normalizedPhone = normalizeEgyptianPhone(trimmed);
    const user = await this.findUserByPhone(normalizedPhone);
    if (!user) {
      throw new NotFoundException('رقم الهاتف المدخل غير مسجل لدينا في أي حساب نشط');
    }

    await this.checkAndRecordRateLimit(normalizedPhone, 'RESET');

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
      throw new BadRequestException('رقم الهاتف المدخل غير مسجل على تطبيق واتساب');
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
        identifier: normalizedPhone,
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
        identifier: normalizedPhone,
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

    const user = await this.findUserByPhone(activeToken.identifier);
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
