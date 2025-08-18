import { Injectable } from '@nestjs/common';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  size: number;
  hitRate: number;
  memoryUsage: number;
  totalHits: number;
  totalMisses: number;
}

@Injectable()
export class EvaluationCacheService {
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes in milliseconds
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cache entries
  private totalHits = 0;
  private totalMisses = 0;

  constructor() {
    // Background cleanup every 10 minutes
    setInterval(() => this.cleanupExpiredEntries(), 600000);
  }

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }

    // Track cache hit
    item.hits++;
    this.totalHits++;
    return item.data;
  }

  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or set cached data
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats(): CacheStats {
    const size = this.cache.size;
    const memoryUsage = JSON.stringify(Array.from(this.cache.entries())).length;
    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate = totalRequests > 0 ? (this.totalHits / totalRequests) * 100 : 0;

    return {
      size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
    };
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
  }

  /**
   * Evict least recently used entries (LRU)
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    let leastHits = Infinity;

    // Find the entry with least hits and oldest timestamp
    for (const [key, item] of this.cache.entries()) {
      if (item.hits < leastHits || (item.hits === leastHits && item.timestamp < oldestTime)) {
        oldestKey = key;
        oldestTime = item.timestamp;
        leastHits = item.hits;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * Preload cache with frequently accessed data
   */
  async preloadCache<T>(
    keys: string[],
    factory: (key: string) => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const data = await factory(key);
        this.set(key, data, ttl);
      } catch (error) {
        console.warn(`Failed to preload cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`🚀 Preloaded ${keys.length} cache entries`);
  }
}
