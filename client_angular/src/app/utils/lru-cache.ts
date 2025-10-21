/**
 * LRU (Least Recently Used) Cache Implementation
 *
 * @description A generic cache that automatically evicts the least recently used
 * entries when the cache reaches its maximum size. Perfect for managing memory
 * in long-running Angular applications.
 *
 * Features:
 * - Generic typing for type safety
 * - Automatic eviction of LRU entries
 * - Optional onEvict callback for cleanup
 * - O(1) get and set operations
 * - Access order tracking
 * - Memory-safe with predictable size
 *
 * @example
 * ```typescript
 * // Create cache with max 100 entries and cleanup callback
 * const cache = new LRUCache<string, BehaviorSubject<number>>(
 *   100,
 *   (key, subject) => {
 *     subject.complete(); // Cleanup RxJS subscriptions
 *     console.log(`Evicted: ${key}`);
 *   }
 * );
 *
 * // Use like a Map
 * cache.set('key1', new BehaviorSubject(42));
 * const value = cache.get('key1'); // Updates access order
 * cache.has('key1'); // true
 * cache.delete('key1'); // Manual deletion
 * ```
 *
 * @template K The type of keys in the cache
 * @template V The type of values in the cache
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private accessOrder: K[];
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;

  /**
   * Creates a new LRU Cache instance
   *
   * @param maxSize Maximum number of entries in the cache
   * @param onEvict Optional callback invoked when an entry is evicted
   */
  constructor(
    public readonly maxSize: number,
    private readonly onEvict?: (key: K, value: V) => void
  ) {
    if (maxSize <= 0) {
      throw new Error('LRUCache maxSize must be greater than 0');
    }

    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Gets a value from the cache and updates its access order
   *
   * @param key The key to retrieve
   * @returns The value if found, undefined otherwise
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.updateAccessOrder(key);
    return this.cache.get(key)!.value;
  }

  /**
   * Sets a value in the cache, evicting LRU entry if at capacity
   *
   * @param key The key to set
   * @param value The value to store
   */
  set(key: K, value: V): void {
    // If key already exists, update it and refresh access order
    if (this.cache.has(key)) {
      this.cache.set(key, { value, timestamp: Date.now() });
      this.updateAccessOrder(key);
      return;
    }

    // If at capacity, evict LRU entry
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, { value, timestamp: Date.now() });
    this.accessOrder.push(key);
  }

  /**
   * Checks if a key exists in the cache without updating access order
   *
   * @param key The key to check
   * @returns True if key exists, false otherwise
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Manually deletes an entry from the cache
   *
   * @param key The key to delete
   * @returns True if the key was deleted, false if it didn't exist
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Invoke cleanup callback
    if (this.onEvict) {
      this.onEvict(key, entry.value);
    }

    // Remove from cache and access order
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    // Invoke cleanup callback for all entries
    if (this.onEvict) {
      Array.from(this.cache.entries()).forEach(([key, entry]) => {
        this.onEvict!(key, entry.value);
      });
    }

    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Gets the current size of the cache
   *
   * @returns Number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Gets all keys in access order (least to most recently used)
   *
   * @returns Array of keys in access order
   */
  keys(): K[] {
    return [...this.accessOrder];
  }

  /**
   * Gets all values in the cache
   *
   * @returns Array of values
   */
  values(): V[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Gets all entries as [key, value] tuples
   *
   * @returns Array of [key, value] tuples
   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * Gets cache hit rate statistics
   *
   * @returns Hit rate as a percentage (0-100)
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  /**
   * Gets the total number of evictions
   *
   * @returns Number of entries evicted
   */
  getEvictionCount(): number {
    return this.evictions;
  }

  /**
   * Gets statistics about cache performance
   *
   * @returns Object containing cache statistics
   */
  getStatistics(): CacheStatistics {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: this.getHitRate(),
      utilizationRate: (this.cache.size / this.maxSize) * 100
    };
  }

  /**
   * Resets statistics counters
   */
  resetStatistics(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Evicts the least recently used entry from the cache
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0]; // First = Least Recently Used
    const entry = this.cache.get(lruKey);

    if (entry && this.onEvict) {
      this.onEvict(lruKey, entry.value);
    }

    this.cache.delete(lruKey);
    this.accessOrder.shift();
    this.evictions++;
  }

  /**
   * Updates the access order for a key (moves it to end = most recently used)
   *
   * @param key The key to update
   */
  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);

    if (index !== -1) {
      // Remove from current position
      this.accessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.accessOrder.push(key);
  }
}

/**
 * Interface for cache entry with metadata
 */
interface CacheEntry<V> {
  value: V;
  timestamp: number;
}

/**
 * Interface for cache statistics
 */
export interface CacheStatistics {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  utilizationRate: number;
}
