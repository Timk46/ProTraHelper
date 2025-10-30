import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SessionStorageService } from './session-storage.service';

describe('SessionStorageService', () => {
  let service: SessionStorageService;
  let mockStorage: Storage;

  beforeEach(() => {
    // Create a complete mock Storage implementation
    const store: { [key: string]: string } = {};

    mockStorage = {
      getItem: (key: string) => key in store ? store[key] : null,
      setItem: (key: string, value: string) => { store[key] = String(value); }, // Convert to string like real sessionStorage
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

    // Replace global sessionStorage with mock
    spyOnProperty(window, 'sessionStorage', 'get').and.returnValue(mockStorage);

    TestBed.configureTestingModule({
      providers: [
        SessionStorageService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(SessionStorageService);
  });

  // =============================================================================
  // CORE FUNCTIONALITY (inherited from LocalStorageService)
  // =============================================================================

  describe('Core Functionality', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should use sessionStorage instead of localStorage', () => {
      const key = 'testKey';
      const value = 'testValue';

      service.set(key, value);

      // Should call sessionStorage
      expect(mockStorage.setItem).toHaveBeenCalledWith(key, value);
    });

    it('should store and retrieve string values', () => {
      const key = 'stringKey';
      const value = 'hello session';

      service.set(key, value);
      const retrieved = service.get<string>(key);

      expect(retrieved).toBe(value);
    });

    it('should store and retrieve objects', () => {
      const key = 'objectKey';
      const value = { sessionData: 'test', count: 42 };

      service.set(key, value);
      const retrieved = service.get<typeof value>(key);

      expect(retrieved).toEqual(value);
    });

    it('should remove items from sessionStorage', () => {
      const key = 'removeKey';
      service.set(key, 'value');

      expect(service.has(key)).toBe(true);

      service.remove(key);
      expect(service.has(key)).toBe(false);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('should clear all items from sessionStorage', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      expect(service.keys().length).toBe(2);

      service.clear();
      expect(service.keys().length).toBe(0);
      expect(mockStorage.clear).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // SPECIALIZED TYPE-SAFE METHODS
  // =============================================================================

  describe('Type-Safe Methods', () => {
    it('should handle boolean values', () => {
      service.set('boolKey', true);
      expect(service.getBoolean('boolKey')).toBe(true);

      service.set('boolKey', false);
      expect(service.getBoolean('boolKey')).toBe(false);
    });

    it('should handle number values', () => {
      service.set('numberKey', 123);
      expect(service.getNumber('numberKey')).toBe(123);

      service.set('numberKey', 0);
      expect(service.getNumber('numberKey')).toBe(0);
    });

    it('should handle string values', () => {
      service.set('stringKey', 'session value');
      expect(service.getString('stringKey')).toBe('session value');
    });

    it('should handle object values with type safety', () => {
      interface SessionData {
        userId: string;
        timestamp: number;
      }

      const data: SessionData = { userId: 'user123', timestamp: Date.now() };
      service.set('sessionData', data);

      const retrieved = service.getObject<SessionData>('sessionData');
      expect(retrieved).toEqual(data);
    });
  });

  // =============================================================================
  // EXPIRATION SUPPORT (inherited)
  // =============================================================================

  describe('Expiration Support', () => {
    it('should support expiration in sessionStorage', (done) => {
      const key = 'expiringSession';
      const value = 'temporary data';

      service.set(key, value, { expirationMs: 50 });

      // Should be available immediately
      expect(service.get(key)).toBe(value);

      // Should expire after timeout
      setTimeout(() => {
        expect(service.get(key)).toBeNull();
        done();
      }, 100);
    });

    it('should auto-delete expired items', (done) => {
      service.set('expired1', 'value1', { expirationMs: 50 });
      service.set('expired2', 'value2', { expirationMs: 50 });
      service.set('permanent', 'value3');

      setTimeout(() => {
        const clearedCount = service.clearExpired();
        expect(clearedCount).toBe(2);
        expect(service.has('permanent')).toBe(true);
        done();
      }, 100);
    });
  });

  // =============================================================================
  // SESSION-SPECIFIC BEHAVIOR
  // =============================================================================

  describe('Session-Specific Behavior', () => {
    it('should isolate data from localStorage', () => {
      const key = 'isolationTest';
      const sessionValue = 'session value';

      // Store in sessionStorage via service
      service.set(key, sessionValue);

      // Verify it's in sessionStorage
      expect(service.get(key)).toBe(sessionValue);
      expect(mockStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('should handle typical session use cases', () => {
      // Typical session data scenarios
      service.set('hefl-previous-node-count', 42); // Memory leak detector
      service.set('form-draft', { field1: 'value', field2: 123 }); // Form state
      service.set('temp-calculation', [1, 2, 3, 4, 5]); // Temporary data

      expect(service.getNumber('hefl-previous-node-count')).toBe(42);
      expect(service.getObject('form-draft')).toEqual({ field1: 'value', field2: 123 });
      expect(service.get('temp-calculation')).toEqual([1, 2, 3, 4, 5]);
    });

    it('should support security-sensitive temporary data', () => {
      // Session storage is better for security-sensitive data
      // as it's cleared when tab closes
      const sensitiveData = {
        token: 'temp-auth-token',
        expiresAt: Date.now() + 3600000,
      };

      service.set('temp-auth', sensitiveData);
      expect(service.getObject('temp-auth')).toEqual(sensitiveData);

      // Cleanup
      service.remove('temp-auth');
      expect(service.has('temp-auth')).toBe(false);
    });
  });

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  describe('Utility Methods', () => {
    it('should get all keys from sessionStorage', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      const keys = service.keys();
      expect(keys.length).toBe(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should check if key exists', () => {
      service.set('existingKey', 'value');

      expect(service.has('existingKey')).toBe(true);
      expect(service.has('nonExistingKey')).toBe(false);
    });

    it('should calculate storage size', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      const size = service.getStorageSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle sessionStorage.setItem errors gracefully', () => {
      (mockStorage.setItem as jasmine.Spy).and.throwError('Quota exceeded');

      const result = service.set('key', 'value');
      expect(result).toBe(false);
    });

    it('should handle sessionStorage.getItem errors gracefully', () => {
      (mockStorage.getItem as jasmine.Spy).and.throwError('Storage error');

      const value = service.get('key');
      expect(value).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      mockStorage.setItem('malformed', '{invalid json}');

      const value = service.get('malformed');
      expect(value).toBe('{invalid json}'); // Falls back to string
    });
  });

  // =============================================================================
  // SSR COMPATIBILITY
  // =============================================================================

  describe('SSR Compatibility', () => {
    let ssrService: SessionStorageService;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionStorageService,
          { provide: PLATFORM_ID, useValue: 'server' }, // Simulate server
        ],
      });

      ssrService = TestBed.inject(SessionStorageService);
    });

    it('should return null when getting on server', () => {
      const value = ssrService.get('anyKey');
      expect(value).toBeNull();
    });

    it('should return false when setting on server', () => {
      const result = ssrService.set('key', 'value');
      expect(result).toBe(false);
    });

    it('should return false for has() on server', () => {
      const result = ssrService.has('key');
      expect(result).toBe(false);
    });

    it('should return default values for typed getters on server', () => {
      expect(ssrService.getBoolean('key', true)).toBe(true);
      expect(ssrService.getNumber('key', 99)).toBe(99);
      expect(ssrService.getString('key', 'default')).toBe('default');
      expect(ssrService.getObject('key')).toBeNull();
    });
  });

  // =============================================================================
  // INHERITANCE VERIFICATION
  // =============================================================================

  describe('Inheritance from LocalStorageService', () => {
    it('should inherit all public methods', () => {
      // Verify all inherited methods are available
      expect(typeof service.get).toBe('function');
      expect(typeof service.set).toBe('function');
      expect(typeof service.remove).toBe('function');
      expect(typeof service.clear).toBe('function');
      expect(typeof service.has).toBe('function');
      expect(typeof service.keys).toBe('function');
      expect(typeof service.getBoolean).toBe('function');
      expect(typeof service.getNumber).toBe('function');
      expect(typeof service.getString).toBe('function');
      expect(typeof service.getObject).toBe('function');
      expect(typeof service.clearExpired).toBe('function');
      expect(typeof service.getStorageSize).toBe('function');
    });

    it('should override storage property correctly', () => {
      // This is tested implicitly by checking that sessionStorage is called
      service.set('test', 'value');
      expect(mockStorage.setItem).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // REAL-WORLD HEFL USE CASES
  // =============================================================================

  describe('HEFL Use Cases', () => {
    it('should handle memory leak detector node tracking', () => {
      const nodeCount = 1234;
      service.set('hefl-previous-node-count', nodeCount);

      const retrieved = service.getNumber('hefl-previous-node-count', 0);
      expect(retrieved).toBe(nodeCount);
    });

    it('should handle temporary form state', () => {
      const formState = {
        content: 'Draft comment text',
        categoryId: 5,
        isInitial: true,
        timestamp: Date.now(),
      };

      service.set('comment-draft', formState);

      const retrieved = service.getObject<typeof formState>('comment-draft');
      expect(retrieved).toEqual(formState);
    });

    it('should handle temporary calculations', () => {
      const calculations = {
        scores: [85, 90, 78, 92],
        average: 86.25,
        median: 87.5,
      };

      service.set('temp-calculations', calculations);
      expect(service.getObject('temp-calculations')).toEqual(calculations);

      // Clear after use
      service.remove('temp-calculations');
      expect(service.has('temp-calculations')).toBe(false);
    });

    it('should support session-scoped feature flags', () => {
      service.set('feature-experimental-ui', true);
      service.set('feature-debug-mode', false);

      expect(service.getBoolean('feature-experimental-ui')).toBe(true);
      expect(service.getBoolean('feature-debug-mode')).toBe(false);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 50; i++) {
        service.set(`session-key-${i}`, `value-${i}`);
      }

      expect(service.keys().length).toBe(50);

      for (let i = 0; i < 50; i++) {
        expect(service.get(`session-key-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should handle overwriting existing keys', () => {
      service.set('key', 'value1');
      expect(service.get('key')).toBe('value1');

      service.set('key', 'value2');
      expect(service.get('key')).toBe('value2');
    });

    it('should handle special characters in session keys', () => {
      const specialKey = 'session@key#with$special%chars';
      service.set(specialKey, 'value');

      expect(service.get(specialKey)).toBe('value');
    });

    it('should handle unicode in session data', () => {
      const unicode = { message: '你好世界 🌍', emoji: '😀🎉' };
      service.set('unicode-session', unicode);

      expect(service.getObject('unicode-session')).toEqual(unicode);
    });
  });
});
