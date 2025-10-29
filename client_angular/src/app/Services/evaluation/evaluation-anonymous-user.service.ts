import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import {
  map,
  tap,
  catchError,
  takeUntil,
} from 'rxjs/operators';

// DTOs
import { AnonymousEvaluationUserDTO } from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Specialized service for anonymous user management in evaluation system
 *
 * @description
 * Handles all anonymous user related operations including:
 * - Loading/creating anonymous users for evaluation sessions
 * - Managing anonymous user lifecycle
 * - Providing user ID for discussions and comments
 *
 * Extracted from EvaluationStateService for better separation of concerns.
 *
 * @architecture
 * This service follows HEFL best practices by:
 * - Using DTOs from @DTOs/index
 * - Providing Observable-based reactive API
 * - Implementing proper error handling with fallbacks
 * - Automatic user creation if not exists
 *
 * @since 3.0.0 (Extracted from EvaluationStateService)
 */
@Injectable({
  providedIn: 'root',
})
export class EvaluationAnonymousUserService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationAnonymousUserService');

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // =============================================================================
  // STATE SUBJECTS
  // =============================================================================

  /**
   * Anonymous user for the current evaluation session
   */
  private anonymousUserSubject = new BehaviorSubject<AnonymousEvaluationUserDTO | null>(null);

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for anonymous user
   * Emits the current anonymous user or null if not loaded
   */
  readonly anonymousUser$ = this.anonymousUserSubject.asObservable();

  /**
   * Observable for anonymous user ID
   * Emits the current anonymous user's ID or null if not loaded
   */
  readonly anonymousUserId$: Observable<number | null> = this.anonymousUser$.pipe(
    map(user => user?.id ?? null)
  );

  // =============================================================================
  // CONSTRUCTOR & INITIALIZATION
  // =============================================================================

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private logger: LoggerService
  ) {
    this.log.info('EvaluationAnonymousUserService initialized');
  }

  // =============================================================================
  // PUBLIC API - ANONYMOUS USER LOADING
  // =============================================================================

  /**
   * Loads or creates anonymous user for evaluation session
   *
   * @description
   * Fetches the anonymous user from backend or creates one if it doesn't exist.
   * The anonymous user is used for:
   * - Posting comments in discussions
   * - Voting on comments
   * - Submitting ratings
   * - Tracking user activity without revealing real identity
   *
   * @param submissionId - The submission ID for the evaluation session
   * @returns Observable<void> Completes when loading is finished
   *
   * @example
   * ```typescript
   * this.anonymousUserService.loadAnonymousUser('123').subscribe({
   *   next: () => console.log('Anonymous user loaded'),
   *   error: (err) => console.error('Failed to load', err)
   * });
   * ```
   */
  loadAnonymousUser(submissionId: string): Observable<void> {
    this.log.info('Loading anonymous user', { submissionId });

    return this.evaluationService.getOrCreateAnonymousUser(submissionId).pipe(
      tap(user => {
        this.anonymousUserSubject.next(user);
        this.log.info('Anonymous user loaded successfully', { userId: user.id });
      }),
      catchError(error => {
        this.log.error('Failed to load anonymous user', { submissionId, error });
        this.anonymousUserSubject.next(null);
        throw error; // Re-throw for caller to handle
      }),
      map(() => void 0)
    );
  }

  // =============================================================================
  // PUBLIC API - ACCESSORS
  // =============================================================================

  /**
   * Gets the current anonymous user synchronously
   *
   * @description
   * Returns the current anonymous user value from the subject.
   * Useful when you need the user immediately without subscribing.
   *
   * @returns AnonymousEvaluationUserDTO | null - Current user or null if not loaded
   *
   * @example
   * ```typescript
   * const user = this.anonymousUserService.getCurrentAnonymousUser();
   * if (user) {
   *   console.log('User ID:', user.id);
   * }
   * ```
   */
  getCurrentAnonymousUser(): AnonymousEvaluationUserDTO | null {
    return this.anonymousUserSubject.value;
  }

  /**
   * Gets the current anonymous user ID synchronously
   *
   * @description
   * Returns the current anonymous user's ID.
   * Convenient shorthand for getCurrentAnonymousUser()?.id
   *
   * @returns number | null - Current user ID or null if not loaded
   *
   * @example
   * ```typescript
   * const userId = this.anonymousUserService.getUserId();
   * if (userId) {
   *   console.log('User ID:', userId);
   * }
   * ```
   */
  getUserId(): number | null {
    const user = this.anonymousUserSubject.value;
    return user ? user.id : null;
  }

  /**
   * Checks if anonymous user is loaded
   *
   * @returns boolean - True if user is loaded, false otherwise
   */
  isUserLoaded(): boolean {
    return this.anonymousUserSubject.value !== null;
  }

  // =============================================================================
  // PUBLIC API - STATE MANAGEMENT
  // =============================================================================

  /**
   * Clears the current anonymous user
   *
   * @description
   * Resets the anonymous user state. Useful when navigating away from
   * evaluation or switching submissions.
   */
  clearUser(): void {
    this.log.info('Clearing anonymous user');
    this.anonymousUserSubject.next(null);
  }

  // =============================================================================
  // LIFECYCLE CLEANUP
  // =============================================================================

  /**
   * Cleanup on service destruction
   *
   * @description
   * Completes all active observables to prevent memory leaks.
   * Called automatically by Angular when service is destroyed.
   */
  ngOnDestroy(): void {
    this.log.info('EvaluationAnonymousUserService destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
