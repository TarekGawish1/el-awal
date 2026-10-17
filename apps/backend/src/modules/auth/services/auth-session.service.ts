import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);
  private readonly failedAttempts = new Map<string, { count: number; lockedUntil?: number; lastAttemptAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: AuthTokenService,
  ) {}

  checkAccountLockout(identifier: string): void {
    const key = identifier.trim().toLowerCase();
    const record = this.failedAttempts.get(key);
    if (!record) return;

    const now = Date.now();
    if (record.lockedUntil) {
      if (now < record.lockedUntil) {
        const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
        throw new UnauthorizedException(
          `تم قفل الحساب مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`,
        );
      } else {
        this.failedAttempts.delete(key);
      }
    }
  }

  recordFailedAttempt(identifier: string): never {
    const key = identifier.trim().toLowerCase();
    const now = Date.now();
    const record = this.failedAttempts.get(key) || { count: 0, lastAttemptAt: now };

    if (now - record.lastAttemptAt > 15 * 60 * 1000) {
      record.count = 0;
    }

    record.count += 1;
    record.lastAttemptAt = now;

    if (record.count >= 5) {
      record.lockedUntil = now + 5 * 60 * 1000;
      this.failedAttempts.set(key, record);
      this.logger.warn(`Account [${key}] locked for 5 minutes due to 5 consecutive failed login attempts.`);
      throw new UnauthorizedException(
        'تم قفل الحساب مؤقتاً لمدة 5 دقائق بسبب تكرار المحاولات الخاطئة (5 محاولات).',
      );
    }

    this.failedAttempts.set(key, record);
    const remainingAttempts = 5 - record.count;
    throw new UnauthorizedException(
      `بيانات الدخول غير صحيحة أو الحساب غير مفعل. (متبقي ${remainingAttempts} محاولات قبل القفل المؤقت)`,
    );
  }

  clearFailedAttempts(identifier: string): void {
    const key = identifier.trim().toLowerCase();
    this.failedAttempts.delete(key);

    if (this.failedAttempts.size > 5000) {
      const now = Date.now();
      for (const [k, v] of this.failedAttempts.entries()) {
        if ((v.lockedUntil && now >= v.lockedUntil) || now - v.lastAttemptAt > 30 * 60 * 1000) {
          this.failedAttempts.delete(k);
        }
      }
    }
  }

  /**
   * Revokes the given refresh token session on logout.
   */
  async logout(dto: RefreshTokenDto): Promise<{ success: boolean; message: string }> {
    const tokenHash = this.tokenService.hashToken(dto.refreshToken);
    await this.prisma.refreshTokenSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Revokes all active refresh token sessions for a specific user.
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.refreshTokenSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
