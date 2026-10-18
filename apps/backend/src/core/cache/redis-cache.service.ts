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
   * Retrieve item with L1 in-memory check followed by L2 Redis.
   * L1 RAM delivers sub-millisecond responses (<0.1ms), avoiding external network round-trips.
   */
  async get<T>(key: string): Promise<T | null> {
    const memVal = this.memoryFallback.get(key);
    if (memVal !== undefined && memVal !== null) {
      return memVal as T;
    }

    if (this.isRedisHealthy && this.redis) {
      try {
        const val = await this.redis.get<T>(key);
        if (val !== null && val !== undefined) {
          // Warm L1 in-memory cache for fast repeated reads (up to 60s)
          this.memoryFallback.set(key, val, 60);
          return val;
        }
        return null;
      } catch (err: any) {
        this.logger.warn(`Redis GET error for key [${key}]: ${err?.message}.`);
      }
    }
    return null;
  }

  /**
   * Set cache item into both L1 memory cache and L2 Redis.
   */
  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    // Populate L1 memory cache immediately
    const l1Ttl = Math.min(ttlSeconds, 120);
    this.memoryFallback.set(key, value, l1Ttl);

    if (this.isRedisHealthy && this.redis) {
      try {
        await this.redis.set(key, value, { ex: ttlSeconds });
      } catch (err: any) {
        this.logger.warn(`Redis SET error for key [${key}]: ${err?.message}.`);
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
    this.memoryFallback.clear();
    if (this.isRedisHealthy && this.redis) {
      try {
        let cursor = '0';
        do {
          const res = await this.redis.scan(cursor, { match: pattern, count: 100 });
          cursor = String(res[0]);
          const keys = res[1];
          if (keys && keys.length > 0) {
            await this.redis.del(...keys);
          }
        } while (cursor !== '0');
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
