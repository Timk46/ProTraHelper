import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject, of, forkJoin } from 'rxjs';
import {
  map,
  tap,
  catchError,
  finalize,
  takeUntil,
} from 'rxjs/operators';

// DTOs
import {
  VoteLimitStatusDTO,
  VoteLimitResponseDTO,
  EvaluationSubmissionDTO
} from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Specialized service for vote limit management
 *
 * @description
 * Handles all vote limit related operations including:
 * - Loading vote limit status with smart caching
 * - Preloading vote limits for multiple categories
 * - Voting with limit enforcement and optimistic updates
 * - Backend synchronization of vote limits
 *
 * Extracted from EvaluationStateService for better separation of concerns.
 *
 * @architecture
 * This service follows HEFL best practices by:
 * - Using DTOs from @DTOs/index
 * - Providing Observable-based reactive API
 * - Implementing proper error handling with fallbacks
 * - Supporting optimistic UI updates
 * - Smart caching to minimize backend calls
 *
 * @since 3.0.0 (Extracted from EvaluationStateService)
 */
@Injectable({
  providedIn: 'root',
})
export class EvaluationVoteLimitService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationVoteLimitService');

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  private readonly CONFIG = {
    VOTE_LIMITS: {
      MAX_VOTES_PER_CATEGORY: 10,
    },
  } as const;

  // =============================================================================
  // STATE SUBJECTS
  // =============================================================================

  /**
   * Vote limit status per category
   * Maps categoryId → VoteLimitStatusDTO
   */
  private voteLimitStatusSubject = new BehaviorSubject<Map<number, VoteLimitStatusDTO>>(new Map());

  /**
   * Vote limit loading state
   * Indicates if vote limit data is currently being loaded
   */
  private voteLimitLoadingSubject = new BehaviorSubject<boolean>(false);

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for vote limit status per category
   * Emits Map of categoryId → VoteLimitStatusDTO
   */
  readonly voteLimitStatus$ = this.voteLimitStatusSubject.asObservable();

  /**
   * Observable for vote limit loading state
   * Emits true while loading, false when idle
   */
  readonly voteLimitLoading$ = this.voteLimitLoadingSubject.asObservable();

  // =============================================================================
  // CONSTRUCTOR & INITIALIZATION
  // =============================================================================

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private logger: LoggerService
  ) {
    this.log.info('EvaluationVoteLimitService initialized');
  }

  // =============================================================================
  // PUBLIC API - VOTE LIMIT LOADING
  // =============================================================================

  /**
   * Loads vote limit status for a category with smart caching
   *
   * @description
   * Fetches vote limit information from backend including:
   * - Maximum votes allowed
   * - Remaining votes available
   * - Already voted comment IDs
   * - Display text for UI
   *
   * Uses smart caching - returns immediately if data exists unless forceReload is true.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param forceReload - Force reload even if cached (default: false)
   * @returns Observable<void> Completes when loading is finished
   *
   * @example
   * ```typescript
   * this.voteLimitService.loadVoteLimitStatus('123', 5).subscribe({
   *   next: () => console.log('Vote limits loaded'),
   *   error: (err) => console.error('Failed to load', err)
   * });
   * ```
   */
  loadVoteLimitStatus(submissionId: string, categoryId: number, forceReload = false): Observable<void> {
    // CACHE CHECK: Return immediately if data exists and not forcing reload
    const currentStatusMap = this.voteLimitStatusSubject.value;
    if (!forceReload && currentStatusMap.has(categoryId)) {
      this.log.debug('Vote limit status found in cache', { categoryId });
      return of(void 0);
    }

    this.voteLimitLoadingSubject.next(true);

    // Load actual vote status from backend
    return this.evaluationService.getVoteLimitStatus(submissionId, String(categoryId)).pipe(
      tap(voteLimitStatus => {
        // Update status map with actual data from backend
        const currentStatusMap = new Map(this.voteLimitStatusSubject.value);
        currentStatusMap.set(categoryId, voteLimitStatus);
        this.voteLimitStatusSubject.next(currentStatusMap);
        this.log.debug('Vote limit status loaded and cached', { categoryId });
      }),
      catchError(error => {
        this.log.error('Failed to load vote limit status, using defaults', { submissionId, categoryId, error });

        // Fallback to defaults only on error
        const defaultVoteLimitStatus: VoteLimitStatusDTO = {
          maxVotes: this.CONFIG.VOTE_LIMITS.MAX_VOTES_PER_CATEGORY,
          remainingVotes: this.CONFIG.VOTE_LIMITS.MAX_VOTES_PER_CATEGORY,
          votedCommentIds: [],
          canVote: true,
          displayText: `${this.CONFIG.VOTE_LIMITS.MAX_VOTES_PER_CATEGORY}/${this.CONFIG.VOTE_LIMITS.MAX_VOTES_PER_CATEGORY} verfügbar`,
        };

        const currentStatusMap = new Map(this.voteLimitStatusSubject.value);
        currentStatusMap.set(categoryId, defaultVoteLimitStatus);
        this.voteLimitStatusSubject.next(currentStatusMap);

        return of(void 0);
      }),
      finalize(() => this.voteLimitLoadingSubject.next(false)),
      map(() => void 0)
    );
  }

  /**
   * Preloads vote limit status for multiple categories in parallel
   *
   * @description
   * Optimizes navigation by loading vote limits for all categories at once.
   * Uses forkJoin to execute all loads in parallel. Continues even if individual loads fail.
   *
   * @param submissionId - The submission ID
   * @param categoryIds - Array of category IDs to preload
   * @returns Observable<void> Completes when all categories are loaded
   *
   * @example
   * ```typescript
   * this.voteLimitService.preloadVoteLimitStatus('123', [1, 2, 3, 4, 5])
   *   .subscribe(() => console.log('All vote limits preloaded'));
   * ```
   */
  preloadVoteLimitStatus(submissionId: string, categoryIds: number[]): Observable<void> {
    if (!categoryIds || categoryIds.length === 0) {
      return of(void 0);
    }

    this.log.info('Preloading vote limits for categories', { categoryIds });

    // Load all categories in parallel using forkJoin
    const loadObservables = categoryIds.map(categoryId =>
      this.loadVoteLimitStatus(submissionId, categoryId).pipe(
        catchError(error => {
          this.log.warn('Failed to preload vote limit for category', { categoryId, error });
          return of(void 0); // Continue with other categories even if one fails
        })
      )
    );

    return forkJoin(loadObservables).pipe(
      map(() => {
        this.log.info('Vote limits preloaded successfully', { count: categoryIds.length });
        return void 0;
      })
    );
  }

  // =============================================================================
  // PUBLIC API - VOTING WITH LIMITS
  // =============================================================================

  /**
   * Enhanced vote method that integrates with backend API and enforces vote limits
   *
   * @description
   * Submits a vote with:
   * - Optimistic UI updates for immediate feedback
   * - Automatic vote limit tracking
   * - Backend synchronization
   * - Rollback on error
   *
   * This is the main voting method used by CommentVoteManagerService.
   *
   * Flow:
   * 1. Apply optimistic update (decrease/increase remaining votes immediately)
   * 2. Submit vote to backend
   * 3. Update vote limit status from backend response
   * 4. On error: rollback optimistic update
   *
   * @param commentId - The comment ID to vote on
   * @param voteType - The vote type ('UP' to add vote, null to remove vote)
   * @param categoryId - The category ID
   * @param submissionId - The submission ID (for fallback loading)
   * @returns Observable with vote limit response from backend
   *
   * @throws Error if vote submission fails (after rollback)
   *
   * @example
   * ```typescript
   * this.voteLimitService.voteCommentWithEnhancedLimits('456', 'UP', 5, '123')
   *   .subscribe({
   *     next: (response) => console.log('Vote successful', response),
   *     error: (error) => console.error('Vote failed', error)
   *   });
   * ```
   *
   * @since 2.0.0
   */
  voteCommentWithEnhancedLimits(
    commentId: string,
    voteType: 'UP' | null,
    categoryId: number,
    submissionId?: string
  ): Observable<VoteLimitResponseDTO> {
    const isAdding = voteType !== null;

    // Optimistic update for immediate UI feedback
    this.updateVoteLimitState(categoryId, isAdding, Number(commentId));

    return this.evaluationService.voteCommentWithLimits(commentId, voteType).pipe(
      tap(response => {
        // Update vote limit status from backend response
        if (response.voteLimitStatus) {
          this.updateVoteLimitStatus(categoryId, response.voteLimitStatus);
          this.log.info('Updated vote limit status from backend', { voteLimitStatus: response.voteLimitStatus });
        } else if (submissionId) {
          // Fallback: If backend doesn't provide voteLimitStatus, load it explicitly
          this.loadVoteLimitStatus(String(submissionId), categoryId).pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => this.log.info('Fallback vote limit status loaded successfully'),
            error: (error) => this.log.error('Failed to load vote limits', { categoryId, error })
          });
        }
      }),
      catchError(error => {
        // Rollback optimistic update on error
        this.updateVoteLimitState(categoryId, !isAdding, Number(commentId));
        this.log.error('Failed to vote with enhanced limits, rolling back optimistic update', { error });
        throw error;
      })
    );
  }

  // =============================================================================
  // PRIVATE METHODS - VOTE LIMIT STATE MANAGEMENT
  // =============================================================================

  /**
   * Updates vote limit state for a category (optimistic updates)
   *
   * @description
   * Immediately updates the UI state before backend confirmation.
   * Tracks voted comment IDs and calculates remaining votes.
   *
   * @param categoryId - The category ID
   * @param isAdding - Whether vote is being added (true) or removed (false)
   * @param commentId - Optional comment ID for tracking voted comments
   * @private
   */
  private updateVoteLimitState(
    categoryId: number,
    isAdding: boolean,
    commentId?: number
  ): void {
    const change = isAdding ? -1 : 1;

    // Update voteLimitStatusSubject (primary state used by UI)
    const currentStatusMap = new Map(this.voteLimitStatusSubject.value);
    const currentStatus = currentStatusMap.get(categoryId);

    if (!currentStatus) {
      this.log.warn('Vote limit status not found for category', { categoryId });
      return;
    }

    // Track voted comment IDs if commentId provided (for optimistic updates)
    const newVotedIds = new Set(currentStatus.votedCommentIds);
    if (commentId !== undefined && isAdding) {
      newVotedIds.add(commentId);
    }

    const remainingVotes = Math.max(0, Math.min(
      currentStatus.maxVotes,
      currentStatus.remainingVotes + change
    ));

    const updatedStatus: VoteLimitStatusDTO = {
      ...currentStatus,
      remainingVotes,
      votedCommentIds: Array.from(newVotedIds),
      canVote: remainingVotes > 0,
      displayText: `${remainingVotes}/${currentStatus.maxVotes}`
    };

    currentStatusMap.set(categoryId, updatedStatus);
    this.voteLimitStatusSubject.next(currentStatusMap);
  }

  /**
   * Updates vote limit status from backend response
   *
   * @description
   * Replaces the cached vote limit status with authoritative data from backend.
   * Called after successful backend operations.
   *
   * @param categoryId - The category ID
   * @param status - The vote limit status from backend
   * @private
   */
  private updateVoteLimitStatus(categoryId: number, status: VoteLimitStatusDTO): void {
    const currentStatusMap = new Map(this.voteLimitStatusSubject.value);
    currentStatusMap.set(categoryId, status);
    this.voteLimitStatusSubject.next(currentStatusMap);
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
    this.log.info('EvaluationVoteLimitService destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
