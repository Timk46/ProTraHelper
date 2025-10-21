import { LRUCache } from './lru-cache';

describe('LRUCache', () => {
  describe('Constructor', () => {
    it('should create cache with valid maxSize', () => {
      const cache = new LRUCache<string, number>(10);
      expect(cache).toBeDefined();
      expect(cache.maxSize).toBe(10);
      expect(cache.size).toBe(0);
    });

    it('should throw error for invalid maxSize', () => {
      expect(() => new LRUCache<string, number>(0)).toThrowError();
      expect(() => new LRUCache<string, number>(-1)).toThrowError();
    });
  });

  describe('Basic Operations', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(3);
    });

    it('should set and get values', () => {
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should update existing values', () => {
      cache.set('key1', 100);
      cache.set('key1', 200);
      expect(cache.get('key1')).toBe(200);
      expect(cache.size).toBe(1); // Size should not increase
    });

    it('should check if key exists', () => {
      cache.set('key1', 100);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('key1', 100);
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.size).toBe(0);
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('non-existent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    let cache: LRUCache<string, number>;
    let evictedKeys: string[];
    let evictedValues: number[];

    beforeEach(() => {
      evictedKeys = [];
      evictedValues = [];
      cache = new LRUCache<string, number>(3, (key, value) => {
        evictedKeys.push(key);
        evictedValues.push(value);
      });
    });

    it('should evict LRU entry when at capacity', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // Cache is at capacity (3/3)
      expect(cache.size).toBe(3);

      // Adding 4th entry should evict key1 (least recently used)
      cache.set('key4', 400);

      expect(cache.size).toBe(3);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);

      // Check eviction callback was invoked
      expect(evictedKeys).toEqual(['key1']);
      expect(evictedValues).toEqual([100]);
    });

    it('should update access order on get', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // Access key1 (makes it most recently used)
      cache.get('key1');

      // Adding 4th entry should now evict key2 (not key1)
      cache.set('key4', 400);

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);

      expect(evictedKeys).toEqual(['key2']);
    });

    it('should update access order on set (update)', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // Update key1 (makes it most recently used)
      cache.set('key1', 150);

      // Adding 4th entry should evict key2
      cache.set('key4', 400);

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should handle multiple evictions', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      cache.set('key4', 400); // Evicts key1
      cache.set('key5', 500); // Evicts key2
      cache.set('key6', 600); // Evicts key3

      expect(evictedKeys).toEqual(['key1', 'key2', 'key3']);
      expect(evictedValues).toEqual([100, 200, 300]);
      expect(cache.size).toBe(3);
    });
  });

  describe('Access Order Tracking', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(5);
    });

    it('should maintain correct access order', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      expect(cache.keys()).toEqual(['key1', 'key2', 'key3']);
    });

    it('should update order on get', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      cache.get('key1'); // Move key1 to end

      expect(cache.keys()).toEqual(['key2', 'key3', 'key1']);
    });

    it('should update order on set (update)', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      cache.set('key2', 250); // Move key2 to end

      expect(cache.keys()).toEqual(['key1', 'key3', 'key2']);
    });
  });

  describe('Collection Methods', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(5);
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
    });

    it('should return all keys', () => {
      expect(cache.keys()).toEqual(['key1', 'key2', 'key3']);
    });

    it('should return all values', () => {
      expect(cache.values()).toEqual([100, 200, 300]);
    });

    it('should return all entries', () => {
      expect(cache.entries()).toEqual([
        ['key1', 100],
        ['key2', 200],
        ['key3', 300]
      ]);
    });
  });

  describe('Statistics', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(3);
    });

    it('should track cache hits and misses', () => {
      cache.set('key1', 100);

      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      cache.get('key1'); // Hit
      cache.get('key3'); // Miss

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(50);
    });

    it('should track evictions', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      cache.set('key4', 400); // Eviction 1
      cache.set('key5', 500); // Eviction 2

      expect(cache.getEvictionCount()).toBe(2);
      expect(cache.getStatistics().evictions).toBe(2);
    });

    it('should calculate utilization rate', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);

      const stats = cache.getStatistics();
      expect(stats.utilizationRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it('should handle zero hits/misses', () => {
      expect(cache.getHitRate()).toBe(0);
    });

    it('should reset statistics', () => {
      cache.set('key1', 100);
      cache.get('key1');
      cache.get('key2');

      cache.resetStatistics();

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should provide complete statistics', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.get('key1');
      cache.get('key3');

      const stats = cache.getStatistics();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.evictions).toBe(0);
      expect(stats.hitRate).toBe(50);
      expect(stats.utilizationRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Cleanup Callbacks', () => {
    it('should invoke callback on eviction', () => {
      const evicted: Array<{ key: string; value: number }> = [];

      const cache = new LRUCache<string, number>(2, (key, value) => {
        evicted.push({ key, value });
      });

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300); // Evicts key1

      expect(evicted).toEqual([{ key: 'key1', value: 100 }]);
    });

    it('should invoke callback on manual delete', () => {
      const evicted: Array<{ key: string; value: number }> = [];

      const cache = new LRUCache<string, number>(5, (key, value) => {
        evicted.push({ key, value });
      });

      cache.set('key1', 100);
      cache.delete('key1');

      expect(evicted).toEqual([{ key: 'key1', value: 100 }]);
    });

    it('should invoke callback on clear', () => {
      const evicted: Array<{ key: string; value: number }> = [];

      const cache = new LRUCache<string, number>(5, (key, value) => {
        evicted.push({ key, value });
      });

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.clear();

      expect(evicted.length).toBe(2);
      expect(evicted.find(e => e.key === 'key1' && e.value === 100)).toBeDefined();
      expect(evicted.find(e => e.key === 'key2' && e.value === 200)).toBeDefined();
    });

    it('should handle cleanup of complex objects', () => {
      interface MockSubject {
        completed: boolean;
        complete(): void;
      }

      const subjects: MockSubject[] = [];

      const cache = new LRUCache<string, MockSubject>(2, (key, subject) => {
        subject.complete();
      });

      const subject1: MockSubject = { completed: false, complete() { this.completed = true; } };
      const subject2: MockSubject = { completed: false, complete() { this.completed = true; } };
      const subject3: MockSubject = { completed: false, complete() { this.completed = true; } };

      cache.set('key1', subject1);
      cache.set('key2', subject2);
      cache.set('key3', subject3); // Should evict and complete subject1

      expect(subject1.completed).toBe(true);
      expect(subject2.completed).toBe(false);
      expect(subject3.completed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cache size of 1', () => {
      const cache = new LRUCache<string, number>(1);

      cache.set('key1', 100);
      expect(cache.size).toBe(1);

      cache.set('key2', 200);
      expect(cache.size).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should handle repeated access of same key', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('key1', 100);
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(3);
      expect(cache.size).toBe(1);
    });

    it('should handle setting same key-value multiple times', () => {
      const evictions: string[] = [];
      const cache = new LRUCache<string, number>(2, (key) => evictions.push(key));

      cache.set('key1', 100);
      cache.set('key1', 100);
      cache.set('key1', 100);

      expect(cache.size).toBe(1);
      expect(evictions.length).toBe(0); // No evictions
    });

    it('should handle empty cache operations', () => {
      const cache = new LRUCache<string, number>(5);

      expect(cache.size).toBe(0);
      expect(cache.keys()).toEqual([]);
      expect(cache.values()).toEqual([]);
      expect(cache.entries()).toEqual([]);
      expect(cache.get('any')).toBeUndefined();
      expect(cache.has('any')).toBe(false);
      expect(cache.delete('any')).toBe(false);
    });

    it('should not invoke callback when no callback provided', () => {
      const cache = new LRUCache<string, number>(2); // No callback

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300); // Should evict without error

      expect(cache.size).toBe(2);
    });
  });

  describe('Performance', () => {
    it('should handle large number of entries efficiently', () => {
      const cache = new LRUCache<number, string>(1000);

      const startTime = performance.now();

      // Add 5000 entries (will trigger 4000 evictions)
      for (let i = 0; i < 5000; i++) {
        cache.set(i, `value-${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(cache.size).toBe(1000);
      expect(cache.getEvictionCount()).toBe(4000);
    });

    it('should handle rapid get operations efficiently', () => {
      const cache = new LRUCache<number, string>(100);

      // Populate cache
      for (let i = 0; i < 100; i++) {
        cache.set(i, `value-${i}`);
      }

      const startTime = performance.now();

      // Perform 10000 get operations
      for (let i = 0; i < 10000; i++) {
        cache.get(i % 100);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 50ms)
      expect(duration).toBeLessThan(50);
      expect(cache.getStatistics().hits).toBe(10000);
    });
  });
});
