import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Options for storage operations
 */
export interface StorageOptions {
  /**
   * Time-to-live in milliseconds
   * If set, the item will expire after this duration
   */
  expirationMs?: number;
}

/**
 * Internal interface for items with expiration
 */
interface StorageItem<T> {
  value: T;
  expiresAt?: number;
}

/**
 * Local Storage Service
 *
 * @description
 * Provides a type-safe, centralized interface for localStorage operations.
 * Features:
 * - Type-safe get/set operations with TypeScript generics
 * - Automatic JSON serialization/deserialization
 * - Consistent error handling with fallback values
 * - SSR-compatible (checks for browser environment)
 * - Optional expiration support
 * - Specialized methods for common types (boolean, number, string, object)
 *
 * @example
 * ```typescript
 * // Boolean storage
 * this.storage.set('isDarkMode', true);
 * const isDarkMode = this.storage.getBoolean('isDarkMode', false);
 *
 * // Object storage
 * this.storage.set('userPrefs', { theme: 'dark', lang: 'de' });
 * const prefs = this.storage.getObject<UserPrefs>('userPrefs');
 *
 * // With expiration (5 minutes)
 * this.storage.set('tempData', data, { expirationMs: 5 * 60 * 1000 });
 * ```
 *
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  /**
   * The underlying storage mechanism (localStorage)
   * Can be overridden in derived classes (e.g., SessionStorageService)
   */
  protected get storage(): Storage | null {
    return this.isBrowser ? localStorage : null;
  }

  /**
   * Check if code is running in browser environment
   */
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor(@Inject(PLATFORM_ID) protected platformId: Object) {}

  // =============================================================================
  // CORE METHODS
  // =============================================================================

  /**
   * Gets a value from storage with optional expiration check
   *
   * @param key - The storage key
   * @returns The value or null if not found/expired/error
   *
   * @example
   * ```typescript
   * const value = storage.get<string>('myKey');
   * if (value !== null) {
   *   console.log('Value:', value);
   * }
   * ```
   */
  get<T>(key: string): T | null {
    if (!this.storage) {
      return null;
    }

    try {
      const item = this.storage.getItem(key);
      if (item === null) {
        return null;
      }

      // Try to parse as StorageItem (with expiration)
      try {
        const parsed = JSON.parse(item) as StorageItem<T>;

        // Check if it's a storage item with expiration
        if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          // Check expiration
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            this.remove(key);
            return null;
          }
          return parsed.value;
        }

        // Otherwise, it's just a plain value
        return parsed as T;
      } catch {
        // If parsing fails, return as string
        return item as T;
      }
    } catch (error) {
      console.warn(`LocalStorageService: Failed to get '${key}'`, error);
      return null;
    }
  }

  /**
   * Sets a value in storage with optional expiration
   *
   * @param key - The storage key
   * @param value - The value to store
   * @param options - Optional storage options (expiration, etc.)
   * @returns True if successful, false otherwise
   *
   * @example
   * ```typescript
   * // Simple set
   * storage.set('myKey', 'myValue');
   *
   * // With 5-minute expiration
   * storage.set('tempKey', data, { expirationMs: 5 * 60 * 1000 });
   * ```
   */
  set<T>(key: string, value: T, options?: StorageOptions): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      let itemToStore: string;

      if (options?.expirationMs) {
        // Store with expiration metadata
        const storageItem: StorageItem<T> = {
          value,
          expiresAt: Date.now() + options.expirationMs,
        };
        itemToStore = JSON.stringify(storageItem);
      } else {
        // Store value directly
        itemToStore = typeof value === 'string' ? value : JSON.stringify(value);
      }

      this.storage.setItem(key, itemToStore);
      return true;
    } catch (error) {
      console.warn(`LocalStorageService: Failed to set '${key}'`, error);
      return false;
    }
  }

  /**
   * Removes an item from storage
   *
   * @param key - The storage key to remove
   * @returns True if successful, false otherwise
   */
  remove(key: string): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      this.storage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`LocalStorageService: Failed to remove '${key}'`, error);
      return false;
    }
  }

  /**
   * Clears all items from storage
   *
   * @returns True if successful, false otherwise
   */
  clear(): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      this.storage.clear();
      return true;
    } catch (error) {
      console.warn('LocalStorageService: Failed to clear storage', error);
      return false;
    }
  }

  /**
   * Checks if a key exists in storage
   *
   * @param key - The storage key to check
   * @returns True if key exists, false otherwise
   */
  has(key: string): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      return this.storage.getItem(key) !== null;
    } catch (error) {
      console.warn(`LocalStorageService: Failed to check '${key}'`, error);
      return false;
    }
  }

  /**
   * Gets all storage keys
   *
   * @returns Array of all keys in storage
   */
  keys(): string[] {
    if (!this.storage) {
      return [];
    }

    try {
      const keys: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.warn('LocalStorageService: Failed to get keys', error);
      return [];
    }
  }

  // =============================================================================
  // SPECIALIZED TYPE-SAFE METHODS
  // =============================================================================

  /**
   * Gets a boolean value from storage
   *
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist or parsing fails
   * @returns The boolean value or defaultValue
   *
   * @example
   * ```typescript
   * const isDarkMode = storage.getBoolean('darkMode', false);
   * ```
   */
  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get<boolean | string>(key);

    if (value === null) {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value === 'true';
    }

    return defaultValue;
  }

  /**
   * Gets a number value from storage
   *
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist or parsing fails
   * @returns The number value or defaultValue
   *
   * @example
   * ```typescript
   * const count = storage.getNumber('nodeCount', 0);
   * ```
   */
  getNumber(key: string, defaultValue = 0): number {
    const value = this.get<number | string>(key);

    if (value === null) {
      return defaultValue;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    return defaultValue;
  }

  /**
   * Gets a string value from storage
   *
   * @param key - The storage key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The string value or defaultValue
   *
   * @example
   * ```typescript
   * const theme = storage.getString('theme', 'light');
   * ```
   */
  getString(key: string, defaultValue = ''): string {
    const value = this.get<string>(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Gets an object value from storage
   *
   * @param key - The storage key
   * @returns The parsed object or null if parsing fails
   *
   * @example
   * ```typescript
   * interface UserPrefs {
   *   theme: string;
   *   language: string;
   * }
   * const prefs = storage.getObject<UserPrefs>('userPreferences');
   * if (prefs) {
   *   console.log(prefs.theme);
   * }
   * ```
   */
  getObject<T>(key: string): T | null {
    return this.get<T>(key);
  }

  // =============================================================================
  // ADVANCED METHODS
  // =============================================================================

  /**
   * Clears all expired items from storage
   *
   * @description
   * Iterates through all keys and removes items with expired timestamps.
   * Useful for cleanup operations.
   *
   * @returns Number of items cleared
   *
   * @example
   * ```typescript
   * const cleared = storage.clearExpired();
   * console.log(`Cleared ${cleared} expired items`);
   * ```
   */
  clearExpired(): number {
    if (!this.storage) {
      return 0;
    }

    const keys = this.keys();
    let clearedCount = 0;

    keys.forEach((key) => {
      try {
        const item = this.storage!.getItem(key);
        if (item) {
          const parsed = JSON.parse(item) as StorageItem<unknown>;
          if (parsed && parsed.expiresAt && Date.now() > parsed.expiresAt) {
            this.remove(key);
            clearedCount++;
          }
        }
      } catch {
        // Ignore parsing errors
      }
    });

    return clearedCount;
  }

  /**
   * Gets storage size in bytes (approximate)
   *
   * @returns Approximate storage size in bytes
   */
  getStorageSize(): number {
    if (!this.storage) {
      return 0;
    }

    try {
      let size = 0;
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          const value = this.storage.getItem(key);
          if (value) {
            size += key.length + value.length;
          }
        }
      }
      return size;
    } catch (error) {
      console.warn('LocalStorageService: Failed to calculate storage size', error);
      return 0;
    }
  }
}
