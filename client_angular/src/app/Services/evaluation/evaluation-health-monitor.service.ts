import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

// Services
import { LoggerService } from '../logger/logger.service';

/**
 * Backend health status information
 */
export interface BackendHealthStatus {
  /** Whether the backend is currently healthy */
  isHealthy: boolean;

  /** Last error message if unhealthy */
  lastError: string | null;

  /** Timestamp of last health check */
  lastChecked: Date | null;
}

/**
 * Specialized service for backend health monitoring
 *
 * @description
 * Tracks the health status of backend operations, particularly for:
 * - Rating status endpoint monitoring
 * - Failed request tracking
 * - Error recovery guidance
 *
 * This service provides centralized health monitoring that can be reused
 * across different features and services.
 *
 * Extracted from EvaluationStateService for better separation of concerns
 * and reusability across the application.
 *
 * @architecture
 * This service follows HEFL best practices by:
 * - Providing Observable-based reactive API
 * - Centralized error tracking
 * - Automatic health status updates
 * - Reusable across multiple services
 *
 * @since 3.0.0 (Extracted from EvaluationStateService)
 */
@Injectable({
  providedIn: 'root',
})
export class EvaluationHealthMonitorService {
  private readonly log = this.logger.scope('EvaluationHealthMonitorService');

  // =============================================================================
  // STATE SUBJECTS
  // =============================================================================

  /**
   * Backend health status tracking
   */
  private backendHealthSubject = new BehaviorSubject<BackendHealthStatus>({
    isHealthy: true,
    lastError: null,
    lastChecked: null
  });

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for backend health status
   * Emits health status changes for UI feedback
   */
  get backendHealth$(): Observable<BackendHealthStatus> {
    return this.backendHealthSubject.asObservable();
  }

  /**
   * Observable that emits true if backend is healthy, false otherwise
   * Convenience observable for simple health checks
   */
  get isHealthy$(): Observable<boolean> {
    return this.backendHealth$.pipe(
      map(status => status.isHealthy)
    );
  }

  // =============================================================================
  // CONSTRUCTOR & INITIALIZATION
  // =============================================================================

  constructor(
    private logger: LoggerService
  ) {
    this.log.info('EvaluationHealthMonitorService initialized');
  }

  // =============================================================================
  // PUBLIC API - HEALTH MONITORING
  // =============================================================================

  /**
   * Records a successful backend operation
   *
   * @description
   * Updates the health status to indicate the backend is responding correctly.
   * Clears any previous error state.
   *
   * @example
   * ```typescript
   * this.healthMonitor.recordSuccess();
   * ```
   */
  recordSuccess(): void {
    const currentStatus = this.backendHealthSubject.value;

    // Only update if status changed (avoid unnecessary emissions)
    if (!currentStatus.isHealthy || currentStatus.lastError !== null) {
      this.backendHealthSubject.next({
        isHealthy: true,
        lastError: null,
        lastChecked: new Date()
      });
      this.log.info('Backend health restored');
    }
  }

  /**
   * Records a failed backend operation
   *
   * @description
   * Updates the health status to indicate a backend error occurred.
   * Stores the error message for debugging and UI display.
   *
   * @param error - Error message or Error object
   *
   * @example
   * ```typescript
   * this.healthMonitor.recordFailure('Rating status endpoint timeout');
   * ```
   */
  recordFailure(error: string | Error): void {
    const errorMessage = typeof error === 'string' ? error : error.message;

    this.backendHealthSubject.next({
      isHealthy: false,
      lastError: errorMessage,
      lastChecked: new Date()
    });

    this.log.warn('Backend health check failed', { error: errorMessage });
  }

  /**
   * Checks if a specific error indicates a backend health issue
   *
   * @description
   * Analyzes error responses to determine if they represent temporary
   * health issues vs. permanent errors.
   *
   * @param error - Error object to analyze
   * @returns True if error indicates health issue, false otherwise
   *
   * @example
   * ```typescript
   * if (this.healthMonitor.isHealthIssue(error)) {
   *   this.healthMonitor.recordFailure(error);
   * }
   * ```
   */
  isHealthIssue(error: any): boolean {
    // Network errors, timeouts, 5xx errors indicate health issues
    if (error?.status >= 500 || error?.status === 0) {
      return true;
    }

    // Connection refused, timeout, etc.
    if (error?.name === 'TimeoutError' || error?.name === 'HttpErrorResponse') {
      return true;
    }

    return false;
  }

  /**
   * Wraps an observable operation with automatic health monitoring
   *
   * @description
   * Automatically records success/failure for the wrapped operation.
   * Useful for monitoring critical backend calls.
   *
   * @param operation$ - Observable to monitor
   * @returns The same observable with health monitoring side effects
   *
   * @example
   * ```typescript
   * return this.healthMonitor.monitor(
   *   this.http.get('/api/rating-status')
   * );
   * ```
   */
  monitor<T>(operation$: Observable<T>): Observable<T> {
    return new Observable(subscriber => {
      const subscription = operation$.subscribe({
        next: value => {
          this.recordSuccess();
          subscriber.next(value);
        },
        error: error => {
          if (this.isHealthIssue(error)) {
            this.recordFailure(error);
          }
          subscriber.error(error);
        },
        complete: () => {
          subscriber.complete();
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  // =============================================================================
  // PUBLIC API - ACCESSORS
  // =============================================================================

  /**
   * Gets the current health status synchronously
   *
   * @returns Current backend health status
   *
   * @example
   * ```typescript
   * const status = this.healthMonitor.getHealthStatus();
   * if (!status.isHealthy) {
   *   console.warn('Backend unhealthy:', status.lastError);
   * }
   * ```
   */
  getHealthStatus(): BackendHealthStatus {
    return this.backendHealthSubject.value;
  }

  /**
   * Checks if backend is currently healthy (synchronous)
   *
   * @returns True if healthy, false otherwise
   */
  isHealthy(): boolean {
    return this.backendHealthSubject.value.isHealthy;
  }

  /**
   * Gets the last error message if backend is unhealthy
   *
   * @returns Error message or null if healthy
   */
  getLastError(): string | null {
    return this.backendHealthSubject.value.lastError;
  }

  // =============================================================================
  // PUBLIC API - STATE MANAGEMENT
  // =============================================================================

  /**
   * Resets the health status to healthy state
   *
   * @description
   * Useful for manual recovery or after user-initiated retry.
   */
  reset(): void {
    this.log.info('Resetting backend health status');
    this.backendHealthSubject.next({
      isHealthy: true,
      lastError: null,
      lastChecked: new Date()
    });
  }
}
