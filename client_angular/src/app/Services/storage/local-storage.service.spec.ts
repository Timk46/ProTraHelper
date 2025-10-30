import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let mockStorage: Storage;

  beforeEach(() => {
    // Create a complete mock Storage implementation
    const store: { [key: string]: string } = {};

    mockStorage = {
      getItem: (key: string) => key in store ? store[key] : null,
      setItem: (key: string, value: string) => { store[key] = String(value); }, // Convert to string like real localStorage
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(key => delete store[key]); },
      key: (index: number) => Object.keys(store)[index] || null,
      get length() { return Object.keys(store).length; }
    };

    // Spy on the mock storage methods
    spyOn(mockStorage, 'getItem').and.callThrough();
    spyOn(mockStorage, 'setItem').and.callThrough();
    spyOn(mockStorage, 'removeItem').and.callThrough();
    spyOn(mockStorage, 'clear').and.callThrough();
    spyOn(mockStorage, 'key').and.callThrough();

    // Replace global localStorage with mock
    spyOnProperty(window, 'localStorage', 'get').and.returnValue(mockStorage);

    TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(LocalStorageService);
  });

  // =============================================================================
  // CORE METHODS
  // =============================================================================

  describe('get() and set()', () => {
    it('should store and retrieve a string value', () => {
      const key = 'testKey';
      const value = 'testValue';

      const setResult = service.set(key, value);
      expect(setResult).toBe(true);

      const retrieved = service.get<string>(key);
      expect(retrieved).toBe(value);
    });

    it('should store and retrieve a number value', () => {
      const key = 'numberKey';
      const value = 42;

      service.set(key, value);
      const retrieved = service.get<number>(key);

      expect(retrieved).toBe(value);
    });

    it('should store and retrieve a boolean value', () => {
      const key = 'boolKey';
      const value = true;

      service.set(key, value);
      const retrieved = service.get<boolean>(key);

      expect(retrieved).toBe(value);
    });

    it('should store and retrieve an object', () => {
      const key = 'objectKey';
      const value = { name: 'Test', count: 5, active: true };

      service.set(key, value);
      const retrieved = service.get<typeof value>(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent key', () => {
      const retrieved = service.get('nonExistent');
      expect(retrieved).toBeNull();
    });

    it('should handle null value', () => {
      const key = 'nullKey';
      service.set(key, null);
      const retrieved = service.get(key);

      expect(retrieved).toBeNull();
    });

    it('should handle undefined value', () => {
      const key = 'undefinedKey';
      service.set(key, undefined);
      const retrieved = service.get<any>(key);

      // JSON.stringify(undefined) returns undefined, which gets converted to string 'undefined'
      // When retrieved, it's parsed back as the string 'undefined'
      expect(retrieved).toBe('undefined');
    });

    it('should handle empty string', () => {
      const key = 'emptyKey';
      service.set(key, '');
      const retrieved = service.get<string>(key);

      expect(retrieved).toBe('');
    });

    it('should handle arrays', () => {
      const key = 'arrayKey';
      const value = [1, 2, 3, 'four', { five: 5 }];

      service.set(key, value);
      const retrieved = service.get<typeof value>(key);

      expect(retrieved).toEqual(value);
    });
  });

  describe('remove()', () => {
    it('should remove an existing item', () => {
      const key = 'testKey';
      service.set(key, 'value');

      expect(service.has(key)).toBe(true);

      const result = service.remove(key);
      expect(result).toBe(true);
      expect(service.has(key)).toBe(false);
    });

    it('should return true even if key does not exist', () => {
      const result = service.remove('nonExistent');
      expect(result).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should clear all items from storage', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      expect(service.keys().length).toBe(3);

      const result = service.clear();
      expect(result).toBe(true);
      expect(service.keys().length).toBe(0);
    });
  });

  describe('has()', () => {
    it('should return true for existing key', () => {
      const key = 'existingKey';
      service.set(key, 'value');

      expect(service.has(key)).toBe(true);
    });

    it('should return false for non-existing key', () => {
      expect(service.has('nonExistingKey')).toBe(false);
    });
  });

  describe('keys()', () => {
    it('should return all storage keys', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      const keys = service.keys();
      expect(keys.length).toBe(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array when storage is empty', () => {
      const keys = service.keys();
      expect(keys).toEqual([]);
    });
  });

  // =============================================================================
  // SPECIALIZED TYPE-SAFE METHODS
  // =============================================================================

  describe('getBoolean()', () => {
    it('should retrieve boolean true', () => {
      service.set('boolKey', true);
      const value = service.getBoolean('boolKey');
      expect(value).toBe(true);
    });

    it('should retrieve boolean false', () => {
      service.set('boolKey', false);
      const value = service.getBoolean('boolKey');
      expect(value).toBe(false);
    });

    it('should convert string "true" to boolean true', () => {
      mockStorage.setItem('boolKey', 'true');
      const value = service.getBoolean('boolKey');
      expect(value).toBe(true);
    });

    it('should convert string "false" to boolean false', () => {
      mockStorage.setItem('boolKey', 'false');
      const value = service.getBoolean('boolKey');
      expect(value).toBe(false);
    });

    it('should return default value for non-existent key', () => {
      const value = service.getBoolean('nonExistent', true);
      expect(value).toBe(true);
    });

    it('should return default value for invalid type', () => {
      service.set('invalidKey', { object: true });
      const value = service.getBoolean('invalidKey', false);
      expect(value).toBe(false);
    });
  });

  describe('getNumber()', () => {
    it('should retrieve number value', () => {
      service.set('numberKey', 42);
      const value = service.getNumber('numberKey');
      expect(value).toBe(42);
    });

    it('should retrieve negative number', () => {
      service.set('numberKey', -100);
      const value = service.getNumber('numberKey');
      expect(value).toBe(-100);
    });

    it('should retrieve zero', () => {
      service.set('numberKey', 0);
      const value = service.getNumber('numberKey');
      expect(value).toBe(0);
    });

    it('should convert numeric string to number', () => {
      mockStorage.setItem('numberKey', '123');
      const value = service.getNumber('numberKey');
      expect(value).toBe(123);
    });

    it('should return default value for non-existent key', () => {
      const value = service.getNumber('nonExistent', 99);
      expect(value).toBe(99);
    });

    it('should return default value for non-numeric string', () => {
      mockStorage.setItem('invalidKey', 'not a number');
      const value = service.getNumber('invalidKey', 50);
      expect(value).toBe(50);
    });

    it('should return default value for NaN', () => {
      service.set('nanKey', NaN);
      const value = service.getNumber('nanKey', 10);
      expect(value).toBe(10);
    });
  });

  describe('getString()', () => {
    it('should retrieve string value', () => {
      service.set('stringKey', 'hello world');
      const value = service.getString('stringKey');
      expect(value).toBe('hello world');
    });

    it('should retrieve empty string', () => {
      service.set('emptyKey', '');
      const value = service.getString('emptyKey');
      expect(value).toBe('');
    });

    it('should return default value for non-existent key', () => {
      const value = service.getString('nonExistent', 'default');
      expect(value).toBe('default');
    });

    it('should return empty string as default when not specified', () => {
      const value = service.getString('nonExistent');
      expect(value).toBe('');
    });
  });

  describe('getObject()', () => {
    it('should retrieve object with correct type', () => {
      interface TestObject {
        name: string;
        count: number;
        active: boolean;
      }

      const obj: TestObject = { name: 'Test', count: 5, active: true };
      service.set('objectKey', obj);

      const retrieved = service.getObject<TestObject>('objectKey');
      expect(retrieved).toEqual(obj);
    });

    it('should return null for non-existent key', () => {
      const retrieved = service.getObject<any>('nonExistent');
      expect(retrieved).toBeNull();
    });

    it('should handle nested objects', () => {
      const nested = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };

      service.set('nestedKey', nested);
      const retrieved = service.getObject<typeof nested>('nestedKey');

      expect(retrieved).toEqual(nested);
    });
  });

  // =============================================================================
  // EXPIRATION SUPPORT
  // =============================================================================

  describe('Expiration', () => {
    it('should store item with expiration', () => {
      const key = 'expiringKey';
      const value = 'testValue';
      const expirationMs = 5000; // 5 seconds

      const result = service.set(key, value, { expirationMs });
      expect(result).toBe(true);

      // Should be retrievable immediately
      const retrieved = service.get<string>(key);
      expect(retrieved).toBe(value);
    });

    it('should return null for expired item', (done) => {
      const key = 'expiredKey';
      const value = 'testValue';
      const expirationMs = 50; // 50ms

      service.set(key, value, { expirationMs });

      // Wait for expiration
      setTimeout(() => {
        const retrieved = service.get<string>(key);
        expect(retrieved).toBeNull();
        done();
      }, 100);
    });

    it('should auto-delete expired item on access', (done) => {
      const key = 'autoDeleteKey';
      const value = 'testValue';
      const expirationMs = 50;

      service.set(key, value, { expirationMs });

      setTimeout(() => {
        service.get(key); // Triggers deletion
        expect(service.has(key)).toBe(false);
        done();
      }, 100);
    });

    it('should handle items without expiration alongside expiring items', (done) => {
      const permanentKey = 'permanent';
      const expiringKey = 'expiring';

      service.set(permanentKey, 'permanent value');
      service.set(expiringKey, 'expiring value', { expirationMs: 50 });

      setTimeout(() => {
        expect(service.get(permanentKey)).toBe('permanent value');
        expect(service.get(expiringKey)).toBeNull();
        done();
      }, 100);
    });
  });

  describe('clearExpired()', () => {
    it('should remove only expired items', (done) => {
      service.set('permanent1', 'value1');
      service.set('expiring1', 'value2', { expirationMs: 50 });
      service.set('permanent2', 'value3');
      service.set('expiring2', 'value4', { expirationMs: 50 });

      setTimeout(() => {
        const clearedCount = service.clearExpired();
        expect(clearedCount).toBe(2);

        expect(service.has('permanent1')).toBe(true);
        expect(service.has('permanent2')).toBe(true);
        expect(service.has('expiring1')).toBe(false);
        expect(service.has('expiring2')).toBe(false);
        done();
      }, 100);
    });

    it('should return 0 when no expired items', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      const clearedCount = service.clearExpired();
      expect(clearedCount).toBe(0);
    });

    it('should handle malformed items gracefully', () => {
      mockStorage.setItem('malformed', 'not valid json {');
      mockStorage.setItem('valid', JSON.stringify('value'));

      const clearedCount = service.clearExpired();
      expect(clearedCount).toBe(0); // Malformed item is ignored
    });
  });

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  describe('getStorageSize()', () => {
    it('should return approximate storage size in bytes', () => {
      service.set('key1', 'value1'); // ~12 bytes
      service.set('key2', 'value2'); // ~12 bytes

      const size = service.getStorageSize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(1000); // Reasonable size for test data
    });

    it('should return 0 for empty storage', () => {
      const size = service.getStorageSize();
      expect(size).toBe(0);
    });

    it('should calculate size for complex objects', () => {
      const largeObject = {
        data: Array(100).fill('test'),
        nested: { more: { data: 'here' } },
      };

      service.set('largeKey', largeObject);
      const size = service.getStorageSize();

      expect(size).toBeGreaterThan(100);
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle localStorage.getItem errors gracefully', () => {
      (mockStorage.getItem as jasmine.Spy).and.throwError('Storage error');

      const value = service.get('anyKey');
      expect(value).toBeNull();
    });

    it('should handle localStorage.setItem errors gracefully', () => {
      (mockStorage.setItem as jasmine.Spy).and.throwError('Quota exceeded');

      const result = service.set('key', 'value');
      expect(result).toBe(false);
    });

    it('should handle localStorage.removeItem errors gracefully', () => {
      (mockStorage.removeItem as jasmine.Spy).and.throwError('Remove error');

      const result = service.remove('key');
      expect(result).toBe(false);
    });

    it('should handle localStorage.clear errors gracefully', () => {
      (mockStorage.clear as jasmine.Spy).and.throwError('Clear error');

      const result = service.clear();
      expect(result).toBe(false);
    });

    it('should handle malformed JSON gracefully', () => {
      mockStorage.setItem('malformedKey', '{invalid json}');

      const value = service.get<any>('malformedKey');
      expect(value).toBe('{invalid json}'); // Falls back to string
    });

    it('should handle circular reference objects', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;

      const result = service.set('circularKey', circular);
      expect(result).toBe(false); // JSON.stringify will fail
    });
  });

  // =============================================================================
  // SSR COMPATIBILITY
  // =============================================================================

  describe('SSR Compatibility', () => {
    let ssrService: LocalStorageService;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          LocalStorageService,
          { provide: PLATFORM_ID, useValue: 'server' }, // Simulate server
        ],
      });

      ssrService = TestBed.inject(LocalStorageService);
    });

    it('should return null when getting on server', () => {
      const value = ssrService.get('anyKey');
      expect(value).toBeNull();
    });

    it('should return false when setting on server', () => {
      const result = ssrService.set('key', 'value');
      expect(result).toBe(false);
    });

    it('should return false when removing on server', () => {
      const result = ssrService.remove('key');
      expect(result).toBe(false);
    });

    it('should return false when clearing on server', () => {
      const result = ssrService.clear();
      expect(result).toBe(false);
    });

    it('should return false when checking has on server', () => {
      const result = ssrService.has('key');
      expect(result).toBe(false);
    });

    it('should return empty array for keys on server', () => {
      const keys = ssrService.keys();
      expect(keys).toEqual([]);
    });

    it('should return 0 for storage size on server', () => {
      const size = ssrService.getStorageSize();
      expect(size).toBe(0);
    });

    it('should return default values for typed getters on server', () => {
      expect(ssrService.getBoolean('key', true)).toBe(true);
      expect(ssrService.getNumber('key', 99)).toBe(99);
      expect(ssrService.getString('key', 'default')).toBe('default');
      expect(ssrService.getObject('key')).toBeNull();
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should distinguish between null and missing keys', () => {
      service.set('nullKey', null);

      expect(service.has('nullKey')).toBe(true);
      expect(service.has('missingKey')).toBe(false);

      expect(service.get('nullKey')).toBeNull();
      expect(service.get('missingKey')).toBeNull();
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000);
      service.set(longKey, 'value');

      expect(service.get(longKey)).toBe('value');
    });

    it('should handle very long values', () => {
      const longValue = 'x'.repeat(10000);
      service.set('key', longValue);

      expect(service.get('key')).toBe(longValue);
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key@#$%^&*()[]{}|\\:";\'<>?,./';
      service.set(specialKey, 'value');

      expect(service.get(specialKey)).toBe('value');
    });

    it('should handle unicode characters', () => {
      const unicode = '你好世界 🌍 مرحبا';
      service.set('unicodeKey', unicode);

      expect(service.get('unicodeKey')).toBe(unicode);
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      service.set('dateKey', date);

      const retrieved = service.get<string>('dateKey');
      expect(retrieved).toBe(date.toISOString());
    });

    it('should overwrite existing key', () => {
      service.set('key', 'value1');
      expect(service.get('key')).toBe('value1');

      service.set('key', 'value2');
      expect(service.get('key')).toBe('value2');
    });

    it('should handle multiple rapid operations', () => {
      for (let i = 0; i < 100; i++) {
        service.set(`key${i}`, `value${i}`);
      }

      expect(service.keys().length).toBe(100);

      for (let i = 0; i < 100; i++) {
        expect(service.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });
});
