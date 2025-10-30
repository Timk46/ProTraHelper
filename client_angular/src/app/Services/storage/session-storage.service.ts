import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from './local-storage.service';

/**
 * Session Storage Service
 *
 * @description
 * Provides a type-safe interface for sessionStorage operations.
 * Inherits all functionality from LocalStorageService but uses sessionStorage
 * instead of localStorage.
 *
 * Key difference from LocalStorageService:
 * - sessionStorage: Data persists only for the browser session (cleared when tab closes)
 * - localStorage: Data persists across browser sessions
 *
 * Use sessionStorage for:
 * - Temporary data that should not persist after tab close
 * - Session-specific state (e.g., form data, temporary calculations)
 * - Security-sensitive data that should be cleared automatically
 *
 * @example
 * ```typescript
 * // Store temporary session data
 * this.sessionStorage.set('formData', { name: 'John', email: 'john@example.com' });
 *
 * // Retrieve session data
 * const formData = this.sessionStorage.getObject<FormData>('formData');
 *
 * // Store numeric session counter
 * this.sessionStorage.set('pageViews', 5);
 * const views = this.sessionStorage.getNumber('pageViews', 0);
 * ```
 *
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class SessionStorageService extends LocalStorageService {
  /**
   * Override storage mechanism to use sessionStorage instead of localStorage
   */
  protected override get storage(): Storage | null {
    return isPlatformBrowser(this.platformId) ? sessionStorage : null;
  }

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    super(platformId);
  }
}
