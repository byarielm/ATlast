/**
 * Generic in-memory cache with TTL support
 * Used for both server-side caching (config, profiles) and client-side caching
 **/
export class CacheService<T = any> {
  private cache = new Map<string, { value: T; expires: number }>();
  private readonly defaultTTL: number;

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTLMs;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });

    // Auto-cleanup if cache grows too large
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  get(key: string, ttlMs?: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ttl = ttlMs ?? this.defaultTTL;
    if (Date.now() - (entry.expires - ttl) > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton instances for common use cases
export const configCache = new CacheService<any>(5 * 60 * 1000); // 5 min
export const profileCache = new CacheService<any>(5 * 60 * 1000); // 5 min
