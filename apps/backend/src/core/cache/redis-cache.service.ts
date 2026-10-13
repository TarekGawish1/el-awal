import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { MemoryCache } from '../../common/utils/memory-cache.util';

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis | null = null;
  private readonly memoryFallback = new MemoryCache<any>(300, 500);
  private isRedisHealthy = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      this.logger.warn('Upstash Redis credentials not configured. Falling back to in-memory cache.');
      return;
    }

    try {
      this.redis = new Redis({ url, token });
      const pong = await this.redis.ping();
      if (pong === 'PONG') {
        this.isRedisHealthy = true;
        this.logger.log('Upstash Redis connected successfully (eu-west-1 Ireland).');
      } else {
        this.logger.warn(`Unexpected Redis ping response: ${pong}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to connect to Upstash Redis: ${err?.message}. Using in-memory fallback.`);
      this.isRedisHealthy = false;
    }
  }

  /**
   * Retrieve item from Redis with local fallback.
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisHealthy && this.redis) {
      try {
        const val = await this.redis.get<T>(key);
        if (val !== null && val !== undefined) {
          return val;
        }
        return null;
      } catch (err: any) {
        this.logger.warn(`Redis GET error for key [${key}]: ${err?.message}. Falling back to memory.`);
      }
    }
    const memVal = this.memoryFallback.get(key);
    return memVal !== undefined ? memVal : null;
  }

  /**
   * Set cache item with expiration TTL (in seconds).
   */
  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    this.memoryFallback.set(key, value, ttlSeconds);

    if (this.isRedisHealthy && this.redis) {
      try {
        await this.redis.set(key, value, { ex: ttlSeconds });
      } catch (err: any) {
        this.logger.warn(`Redis SET error for key [${key}]: ${err?.message}`);
      }
    }
  }

  /**
   * Delete an exact cache key from both Redis and local memory.
   */
  async del(key: string): Promise<void> {
    this.memoryFallback.delete(key);
    if (this.isRedisHealthy && this.redis) {
      try {
        await this.redis.del(key);
      } catch (err: any) {
        this.logger.warn(`Redis DEL error for key [${key}]: ${err?.message}`);
      }
    }
  }

  /**
   * Invalidate multiple keys matching a pattern (e.g. 'groups:*' or 'student:dashboard:*').
   */
  async delPattern(pattern: string): Promise<void> {
    // Clear from memory fallback
    const prefix = pattern.replace(/\*$/, '');
    // In Upstash Redis
    if (this.isRedisHealthy && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (err: any) {
        this.logger.warn(`Redis DEL PATTERN error for [${pattern}]: ${err?.message}`);
      }
    }
  }

  /**
   * Read-through cache helper: returns cached entry if present, otherwise
   * executes fetchFn, stores the result, and returns it.
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const fresh = await fetchFn();
    await this.set<T>(key, fresh, ttlSeconds);
    return fresh;
  }
}
