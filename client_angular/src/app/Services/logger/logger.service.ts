import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Log severity levels (ordered by priority)
 */
export enum LogLevel {
  ERROR = 0,   // Critical errors requiring immediate attention
  WARN = 1,    // Important warnings (performance issues, potential bugs)
  INFO = 2,    // Important state changes (phase switches, submissions)
  DEBUG = 3,   // Detailed debugging information
}

/**
 * Centralized logging service with environment-based level control
 *
 * @description
 * - Production: Only ERROR and WARN (minimal noise)
 * - Development: Full logging including INFO and DEBUG
 *
 * Features:
 * - Clean production console
 * - Rich debugging in development
 * - Scoped logger memoization (no memory leaks)
 * - Circular reference protection
 * - Early exit optimization
 * - Sensitive data sanitization
 *
 * @example
 * ```typescript
 * constructor(private logger: LoggerService) {}
 * private readonly log = this.logger.scope('EvaluationService');
 *
 * // Critical error (always logged)
 * this.log.error('Failed to load submission', { submissionId, error });
 *
 * // Performance warning (logged in production)
 * this.log.warn('Slow render detected', { duration: 250 });
 *
 * // State change (development only)
 * this.log.info('Category switched', { categoryId: 5 });
 *
 * // Debug trace (development only)
 * this.log.debug('Vote limit calculated', { maxVotes: 10, remaining: 3 });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  // Production: WARN level (ERROR + WARN only)
  // Development: DEBUG level (all logs)
  private readonly currentLevel: LogLevel = environment.production
    ? LogLevel.WARN
    : LogLevel.DEBUG;

  // BLOCKER #3 FIX: Memoization cache for scoped loggers (prevents memory leaks)
  private readonly scopedLoggers = new Map<string, ScopedLogger>();

  // Sensitive keys that should be redacted from logs (GDPR compliance)
  private readonly SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'authorization'];

  /**
   * Log critical errors that require immediate attention
   * Always logged in both production and development
   *
   * Use for: API failures, data corruption, null pointer errors
   *
   * @performance Early exit prevents unnecessary operations
   * @security Circular references are handled gracefully
   */
  error(message: string, data?: unknown): void {
    if (this.currentLevel < LogLevel.ERROR) return;
    const safeData = this.serializeSafe(data);
    const sanitizedData = this.sanitize(safeData);
    console.error(`[ERROR] ${message}`, sanitizedData !== undefined ? sanitizedData : '');
  }

  /**
   * Log important warnings about potential issues
   * Logged in production and development
   *
   * Use for: Performance issues, memory leaks, deprecated API usage
   *
   * @performance Early exit prevents unnecessary operations
   */
  warn(message: string, data?: unknown): void {
    if (this.currentLevel < LogLevel.WARN) return;
    const safeData = this.serializeSafe(data);
    const sanitizedData = this.sanitize(safeData);
    console.warn(`[WARN] ${message}`, sanitizedData !== undefined ? sanitizedData : '');
  }

  /**
   * Log significant state changes and business events
   * Only logged in development
   *
   * Use for: Phase switches, rating submissions, category changes
   *
   * @performance Early exit prevents unnecessary operations
   */
  info(message: string, data?: unknown): void {
    if (this.currentLevel < LogLevel.INFO) return;
    const safeData = this.serializeSafe(data);
    console.log(`[INFO] ${message}`, safeData !== undefined ? safeData : '');
  }

  /**
   * Log detailed debugging information
   * Only logged in development
   *
   * Use for: Function entry/exit, data transformations, cache operations
   *
   * @performance Early exit prevents unnecessary operations
   */
  debug(message: string, data?: unknown): void {
    if (this.currentLevel < LogLevel.DEBUG) return;
    const safeData = this.serializeSafe(data);
    console.log(`[DEBUG] ${message}`, safeData !== undefined ? safeData : '');
  }

  /**
   * Create a scoped logger with prefix for better traceability
   *
   * BLOCKER #3 FIX: Returns cached instance to prevent memory leaks
   * BLOCKER #4 FIX: Early exit in scoped methods before string concatenation
   *
   * @param scope - Scope name (e.g., 'EvaluationService', 'VoteTracking')
   * @returns Scoped logger instance with automatic prefix
   *
   * @example
   * ```typescript
   * private readonly log = this.logger.scope('EvaluationService');
   * this.log.debug('Loading submission', { id: 123 });
   * // Output: [DEBUG] [EvaluationService] Loading submission {id: 123}
   * ```
   */
  scope(scope: string): ScopedLogger {
    // Return cached instance if exists (prevents memory leak)
    if (this.scopedLoggers.has(scope)) {
      return this.scopedLoggers.get(scope)!;
    }

    // Create new scoped logger with early exit optimization
    const scopedLogger: ScopedLogger = {
      error: (msg: string, data?: unknown) => {
        // BLOCKER #4 FIX: Early exit BEFORE string concatenation
        if (this.currentLevel < LogLevel.ERROR) return;
        this.error(`[${scope}] ${msg}`, data);
      },
      warn: (msg: string, data?: unknown) => {
        if (this.currentLevel < LogLevel.WARN) return;
        this.warn(`[${scope}] ${msg}`, data);
      },
      info: (msg: string, data?: unknown) => {
        if (this.currentLevel < LogLevel.INFO) return;
        this.info(`[${scope}] ${msg}`, data);
      },
      debug: (msg: string, data?: unknown) => {
        if (this.currentLevel < LogLevel.DEBUG) return;
        this.debug(`[${scope}] ${msg}`, data);
      },
    };

    // Cache for future calls
    this.scopedLoggers.set(scope, scopedLogger);
    return scopedLogger;
  }

  /**
   * BLOCKER #5 FIX: Safe serialization with circular reference detection
   *
   * Handles circular objects gracefully without crashing
   *
   * @param data - Data to serialize
   * @returns Safe data or string representation
   */
  private serializeSafe(data: unknown): unknown {
    if (data === undefined) return undefined;
    if (data === null) return null;
    if (typeof data !== 'object') return data;

    try {
      // Test if object can be serialized (will throw on circular refs)
      JSON.stringify(data);
      return data; // Safe to pass to console
    } catch {
      // Circular reference detected - return safe string representation
      return `[Circular Reference: ${Object.prototype.toString.call(data)}]`;
    }
  }

  /**
   * BLOCKER #2 FIX: Sanitize sensitive data from logs (GDPR compliance)
   *
   * Redacts sensitive keys like passwords, tokens, etc.
   *
   * @param data - Data to sanitize
   * @returns Sanitized data with sensitive keys redacted
   */
  private sanitize(data: unknown): unknown {
    if (data === undefined || data === null) return data;
    if (typeof data !== 'object') return data;

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    // Handle objects
    const sanitized = { ...(data as Record<string, unknown>) };
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }
    return sanitized;
  }
}

/**
 * Scoped logger interface for type safety
 */
export interface ScopedLogger {
  error(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
}
