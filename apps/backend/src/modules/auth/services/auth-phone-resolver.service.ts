import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import {
  isEgyptianPhone,
  normalizeEgyptianPhone,
  getPhoneVariants,
} from '../../../common/utils/phone.util';

interface MemoryRateLimit {
  lastRequestedAt: number;
  hourlyCount: number;
  windowStart: number;
}

@Injectable()
export class AuthPhoneResolverService {
  private readonly logger = new Logger(AuthPhoneResolverService.name);
  private readonly memoryRateLimits = new Map<string, MemoryRateLimit>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Enforces 60-second cooldown and max 5 requests per hour per phone
   */
  async checkAndRecordRateLimit(phone: string, actionType: 'OTP' | 'RESET'): Promise<void> {
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
   * Finds active user by Egyptian phone variants or student linkage for parents
   */
  async findUserByPhone(phone: string, targetRole?: string) {
    const phoneVariants = getPhoneVariants(phone);

    // If targetRole is PARENT, check parent user first!
    if (targetRole === 'PARENT') {
      const parentUser = await this.prisma.user.findFirst({
        where: {
          phone: { in: phoneVariants },
          OR: [
            { role: 'PARENT' },
            { parentProfile: { isNot: null } },
          ],
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

      if (parentUser) return parentUser;

      // Check linked student by phone, emergencyPhone, or studentCode
      const linkedStudent = await this.prisma.studentProfile.findFirst({
        where: {
          OR: [
            { user: { phone: { in: phoneVariants }, isActive: true, deletedAt: null } },
            { emergencyPhone: { in: phoneVariants } },
            { studentCode: phone },
          ],
        },
        select: {
          parentLinks: {
            orderBy: { createdAt: 'asc' },
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
    }

    // Default search for user
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
          { studentCode: phone },
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
   * Resolves raw phone or student code to a valid Egyptian phone and active User record
   */
  async resolveTargetUserAndPhone(
    rawPhone: string,
    role?: string,
  ): Promise<{ normalizedPhone: string; user: any; trimmed: string }> {
    const trimmed = (rawPhone || '').trim();
    if (!trimmed) {
      throw new BadRequestException('رقم الهاتف أو كود الطالب مطلوب');
    }

    let normalizedPhone: string;
    let user: any = null;

    if (isEgyptianPhone(trimmed)) {
      normalizedPhone = normalizeEgyptianPhone(trimmed);
      user = await this.findUserByPhone(normalizedPhone, role);
    } else {
      user = await this.findUserByPhone(trimmed, role);
      if (user?.phone && isEgyptianPhone(user.phone)) {
        normalizedPhone = normalizeEgyptianPhone(user.phone);
      } else {
        const student = await this.prisma.studentProfile.findFirst({
          where: { studentCode: trimmed },
          select: {
            emergencyPhone: true,
            user: { select: { phone: true } },
            parentLinks: {
              take: 1,
              select: { parent: { select: { user: { select: { phone: true } } } } },
            },
          },
        });
        const candidate =
          student?.parentLinks?.[0]?.parent?.user?.phone ||
          student?.emergencyPhone ||
          student?.user?.phone;
        if (candidate && isEgyptianPhone(candidate)) {
          normalizedPhone = normalizeEgyptianPhone(candidate);
        } else if (this.isPlausibleStudentCode(trimmed)) {
          normalizedPhone = trimmed.toUpperCase();
        } else {
          throw new BadRequestException(
            'يرجى إدخال رقم هاتف محمول مصري صحيح (مثال: 01012345678) أو كود طالب مسجل به رقم هاتف',
          );
        }
      }
    }

    return { normalizedPhone, user, trimmed };
  }

  private isPlausibleStudentCode(code: string): boolean {
    const clean = (code || '').trim().toUpperCase();
    return clean.startsWith('STU') && clean.length >= 6 && clean.length <= 30;
  }
}
