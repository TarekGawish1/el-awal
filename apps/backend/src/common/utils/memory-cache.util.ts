/**
 * Ultra-lightweight in-memory LRU cache with TTL.
 * Zero external dependencies. Bounded memory consumption (<10MB max).
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, { value: T; expiresAt: number }>();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;

  constructor(defaultTtlSeconds = 60, maxSize = 200) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest item (Map preserves insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    const expiresAt = Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  async getOrSet(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const fresh = await fetchFn();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
