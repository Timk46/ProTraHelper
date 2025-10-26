import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { map, switchMap, shareReplay, takeUntil } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

// DTOs
import { EvaluationDiscussionDTO } from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Manages discussion loading and state for evaluation categories
 *
 * @description
 * This service is responsible for:
 * - Loading discussions for specific categories
 * - Caching discussion data via EvaluationCacheService
 * - Tracking comment-to-category mapping for quick lookups
 * - Detecting if user has commented in a category
 * - Preventing duplicate concurrent loads
 *
 * @example
 * ```typescript
 * constructor(private discussionState: EvaluationDiscussionStateService) {}
 *
 * // Get discussions for active category
 * this.discussionState.getDiscussions(submissionId, categoryId)
 *   .subscribe(discussions => console.log(discussions));
 * ```
 *
 * @implements {OnDestroy}
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationDiscussionStateService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationDiscussionStateService');

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // =============================================================================
  // STATE SUBJECTS
  // =============================================================================

  /**
   * Map of commentId → categoryId for quick lookups
   * Used to determine which category a comment belongs to
   */
  private commentIdToCategoryIdMap = new Map<string, number>();

  /**
   * Tracks loading state per category to prevent concurrent loads
   */
  private categoryLoadingStates = new Map<number, boolean>();

  /**
   * Tracks whether user has commented in each category
   * Key: categoryId, Value: hasCommented (boolean)
   */
  private categoryCommentStatusSubject = new BehaviorSubject<Map<number, boolean>>(new Map());

  /**
   * Observable stream of comment status per category
   */
  readonly categoryCommentStatus$ = this.categoryCommentStatusSubject.asObservable();

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private cache: EvaluationCacheService,
    private logger: LoggerService
  ) {
    this.log.debug('EvaluationDiscussionStateService initialized');
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnDestroy(): void {
    this.log.debug('Service destroying - cleanup started');
    this.destroy$.next();
    this.destroy$.complete();
    this.commentIdToCategoryIdMap.clear();
    this.categoryLoadingStates.clear();
    this.log.debug('Service destroyed - cleanup completed');
  }

  // =============================================================================
  // PUBLIC API - DISCUSSION LOADING
  // =============================================================================

  /**
   * Gets discussions for a specific category
   *
   * @description
   * Returns an observable stream of discussions. If cache is empty,
   * triggers a load from the backend. Subsequent calls return cached data.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Observable<EvaluationDiscussionDTO[]> Stream of discussions
   */
  getDiscussions(submissionId: string, categoryId: number): Observable<EvaluationDiscussionDTO[]> {
    const subject = this.cache.getDiscussionCache(categoryId);

    // Load discussions if cache is empty
    if (subject.value.length === 0) {
      this.loadDiscussionsForCategory(submissionId, categoryId);
    }

    return subject.asObservable();
  }

  /**
   * Gets discussions for active category with automatic loading
   *
   * @description
   * Convenience method that combines submission and active category observables
   * to automatically load discussions when either changes.
   *
   * @param submission$ - Observable of current submission
   * @param activeCategory$ - Observable of active category ID
   * @returns Observable<EvaluationDiscussionDTO[]> Stream of active discussions
   */
  getActiveDiscussions$(
    submission$: Observable<{ id: string | number } | null>,
    activeCategory$: Observable<number | null>
  ): Observable<EvaluationDiscussionDTO[]> {
    return combineLatest([submission$, activeCategory$]).pipe(
      map(([submission, categoryId]) => {
        if (!submission || categoryId === null) return of([]);
        return this.getDiscussions(String(submission.id), categoryId);
      }),
      switchMap(discussions$ => discussions$),
      shareReplay(1),
    );
  }

  /**
   * Refreshes discussions for a category by clearing cache and reloading
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   */
  refreshDiscussions(submissionId: string, categoryId: number): void {
    this.log.info('Refreshing discussions', { submissionId, categoryId });
    this.cache.clearDiscussionCache(categoryId);
    this.loadDiscussionsForCategory(submissionId, categoryId);
  }

  /**
   * Invalidates all discussion caches
   *
   * @description
   * Clears all cached discussions. Use when switching submissions
   * or when data becomes stale.
   */
  invalidateAllDiscussions(): void {
    this.log.info('Invalidating all discussions');
    this.cache.clearAll();
    this.commentIdToCategoryIdMap.clear();
    this.categoryLoadingStates.clear();
  }

  // =============================================================================
  // PUBLIC API - COMMENT TRACKING
  // =============================================================================

  /**
   * Gets the category ID for a given comment ID
   *
   * @param commentId - The comment ID
   * @returns The category ID or undefined if not found
   */
  getCategoryForComment(commentId: string): number | undefined {
    return this.commentIdToCategoryIdMap.get(commentId);
  }

  /**
   * Checks if user has commented in a specific category
   *
   * @param categoryId - The category ID
   * @returns Observable<boolean> True if user has commented, false otherwise
   */
  hasCommentedInCategory(categoryId: number): Observable<boolean> {
    return this.categoryCommentStatus$.pipe(
      map(statusMap => statusMap.get(categoryId) ?? false)
    );
  }

  /**
   * Marks a category as commented by user
   *
   * @description
   * Updates the comment status for a category. Called after user
   * successfully submits a comment.
   *
   * @param categoryId - The category ID
   * @param submissionId - The submission ID (for logging)
   */
  markCategoryAsCommented(categoryId: number, submissionId: string): void {
    const currentStatusMap = new Map(this.categoryCommentStatusSubject.value);
    const wasAlreadyMarked = currentStatusMap.get(categoryId);

    currentStatusMap.set(categoryId, true);
    this.categoryCommentStatusSubject.next(currentStatusMap);

    this.log.info('Category marked as commented', {
      categoryId,
      submissionId,
      wasAlreadyMarked,
    });
  }

  // =============================================================================
  // PUBLIC API - DISCUSSION UPDATES
  // =============================================================================

  /**
   * Updates discussions in cache after a comment is added
   *
   * @description
   * Immutably updates the discussion cache with new comment data.
   * Preserves existing discussions and only updates the affected thread.
   *
   * @param categoryId - The category ID
   * @param discussionId - The discussion ID
   * @param newDiscussions - Updated discussions array from backend
   */
  updateDiscussionsAfterComment(
    categoryId: number,
    discussionId: string,
    newDiscussions: EvaluationDiscussionDTO[]
  ): void {
    const subject = this.cache.getDiscussionCache(categoryId);
    const currentDiscussions = subject.value;

    // Find and update the affected discussion
    const updatedDiscussions = currentDiscussions.map(discussion => {
      if (String(discussion.id) === discussionId) {
        const newDiscussion = newDiscussions.find(d => String(d.id) === discussionId);
        return newDiscussion || discussion;
      }
      return discussion;
    });

    subject.next(updatedDiscussions);

    // Update comment-to-category mapping
    newDiscussions.forEach(discussion => {
      discussion.comments.forEach(comment => {
        this.commentIdToCategoryIdMap.set(String(comment.id), categoryId);
      });
    });

    this.log.debug('Discussions updated after comment', {
      categoryId,
      discussionId,
      updatedCount: updatedDiscussions.length,
    });
  }

  // =============================================================================
  // PRIVATE METHODS - DISCUSSION LOADING
  // =============================================================================

  /**
   * Loads discussions for a specific category from backend
   *
   * @description
   * Prevents concurrent loads for the same category. Updates cache,
   * comment-to-category mapping, and comment status after successful load.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @private
   */
  private loadDiscussionsForCategory(submissionId: string, categoryId: number): void {
    // Prevent concurrent loading of the same category
    if (this.categoryLoadingStates.get(categoryId)) {
      this.log.debug('Category already loading, skipping', { categoryId });
      return;
    }

    // Mark category as loading
    this.categoryLoadingStates.set(categoryId, true);
    this.log.debug('Loading discussions for category', { submissionId, categoryId });

    this.evaluationService.getDiscussionsByCategory(submissionId, categoryId.toString()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: discussions => {
        // Update cache
        this.cache.setDiscussionCache(categoryId, discussions);

        // Populate comment-id to category-id map for quick lookups
        discussions.forEach(discussion => {
          discussion.comments.forEach(comment => {
            this.commentIdToCategoryIdMap.set(String(comment.id), categoryId);
          });
        });

        this.log.info('Discussions loaded successfully', {
          categoryId,
          submissionId,
          discussionCount: discussions.length,
          commentCount: discussions.reduce((sum, d) => sum + d.comments.length, 0),
        });
      },
      error: error => {
        this.log.error('Failed to load discussions for category', { categoryId, error });

        // Provide fallback empty state instead of leaving cache in undefined state
        const subject = this.cache.getDiscussionCache(categoryId);
        if (subject.value.length === 0) {
          subject.next([]);
        }
      },
      complete: () => {
        // Always clean up loading state
        this.categoryLoadingStates.set(categoryId, false);
      },
    });
  }

  /**
   * Detects if user has commented in loaded discussions
   *
   * @description
   * Scans discussions for comments by the anonymous user.
   * Updates comment status if user has commented.
   *
   * @param discussions - The discussions to scan
   * @param categoryId - The category ID
   * @param anonymousUserId - The anonymous user ID
   * @param submissionId - The submission ID (for logging)
   * @private
   */
  detectUserComment(
    discussions: EvaluationDiscussionDTO[],
    categoryId: number,
    anonymousUserId: string,
    submissionId: string
  ): void {
    if (discussions.length === 0) return;

    const hasUserCommented = discussions.some(discussion =>
      discussion.comments.some(comment => comment.authorId === anonymousUserId)
    );

    if (hasUserCommented) {
      this.markCategoryAsCommented(categoryId, submissionId);
    }
  }

  // =============================================================================
  // DIAGNOSTICS & DEBUGGING
  // =============================================================================

  /**
   * Gets current state for debugging
   *
   * @returns Object containing current state information
   */
  getDebugState() {
    return {
      commentToCategoryMap: {
        size: this.commentIdToCategoryIdMap.size,
        sampleEntries: Array.from(this.commentIdToCategoryIdMap.entries()).slice(0, 5),
      },
      loadingStates: {
        activeLoads: Array.from(this.categoryLoadingStates.entries())
          .filter(([_, loading]) => loading)
          .map(([categoryId]) => categoryId),
      },
      commentStatus: {
        commentedCategories: Array.from(this.categoryCommentStatusSubject.value.entries())
          .filter(([_, hasCommented]) => hasCommented)
          .map(([categoryId]) => categoryId),
      },
    };
  }
}
