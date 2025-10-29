import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject, combineLatest, of, forkJoin } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  takeUntil,
  take,
  tap,
  catchError,
  finalize,
  filter,
  switchMap,
} from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

// DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  CategoryRatingStatus,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  EvaluationRatingDTO,
  RatingStatsDTO,
  EvaluationPhase,
  VoteType
} from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { LoggerService } from '../logger/logger.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { EvaluationDiscussionStateService } from './evaluation-discussion-state.service';
import { EvaluationCommentStateService } from './evaluation-comment-state.service';
import { EvaluationRatingStateService } from './evaluation-rating-state.service';
import { EvaluationVoteLimitService } from './evaluation-vote-limit.service';
import { EvaluationAnonymousUserService } from './evaluation-anonymous-user.service';
import { EvaluationHealthMonitorService, BackendHealthStatus } from './evaluation-health-monitor.service';
import { EvaluationCategoryNavigationService } from './evaluation-category-navigation.service';

/**
 * Core evaluation state management service (Refactored)
 *
 * @description
 * This is the main orchestration service for evaluation features.
 * It manages core state (submission, categories) and coordinates
 * between specialized feature services.
 *
 * Delegated responsibilities:
 * - Cache: EvaluationCacheService
 * - Discussions: EvaluationDiscussionStateService
 * - Comments: EvaluationCommentStateService
 * - Ratings: EvaluationRatingStateService
 * - Vote Limits: EvaluationVoteLimitService
 * - Anonymous Users: EvaluationAnonymousUserService
 * - Health Monitoring: EvaluationHealthMonitorService
 * - Category Navigation: EvaluationCategoryNavigationService
 *
 * Core responsibilities (kept here):
 * - Submission state
 * - Category transition orchestration (complex loading logic)
 * - Loading & error state
 * - Service orchestration
 *
 * @implements {OnDestroy}
 * @since 2.0.0 (Refactored from monolithic service)
 * @since 3.0.0 (Extracted vote limits and anonymous user management)
 */
@Injectable({
  providedIn: 'root',
})
export class EvaluationStateService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationStateService');

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  private readonly CONFIG = {
    TIMEOUTS: {
      FRESHNESS_THRESHOLD_MS: 2 * 60 * 1000, // 2 minutes
    },
  } as const;

  // =============================================================================
  // CORE STATE SUBJECTS
  // =============================================================================

  /**
   * Current submission being evaluated
   */
  private submissionSubject = new BehaviorSubject<EvaluationSubmissionDTO | null>(null);

  /**
   * All categories for the current submission
   */
  private categoriesSubject = new BehaviorSubject<EvaluationCategoryDTO[]>([]);

  /**
   * Comment statistics for the submission
   */
  private commentStatsSubject = new BehaviorSubject<CommentStatsDTO | null>(null);

  /**
   * Global loading state
   */
  private loadingSubject = new BehaviorSubject<boolean>(false);

  /**
   * Global error state
   */
  private errorSubject = new BehaviorSubject<string | null>(null);

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  readonly submission$ = this.submissionSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();
  readonly commentStats$ = this.commentStatsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  /**
   * Anonymous user observable
   * Delegated to: EvaluationAnonymousUserService
   */
  get anonymousUser$(): Observable<AnonymousEvaluationUserDTO | null> {
    return this.anonymousUserService.anonymousUser$;
  }

  /**
   * Observable for backend health status
   * Tracks if rating status endpoint is responding correctly
   * Delegated to: EvaluationHealthMonitorService
   */
  get backendHealth$(): Observable<BackendHealthStatus> {
    return this.healthMonitor.backendHealth$;
  }

  /**
   * Observable of active category ID
   * Returns null if no category is active or categories haven't loaded yet
   * Delegated to: EvaluationCategoryNavigationService
   */
  get activeCategory$(): Observable<number | null> {
    return this.categoryNav.activeCategory$;
  }

  /**
   * Observable for category transition loading state
   * Emits true while transitioning between categories
   * Delegated to: EvaluationCategoryNavigationService
   */
  get categoryTransitionLoading$(): Observable<boolean> {
    return this.categoryNav.categoryTransitionLoading$;
  }

  /**
   * Observable of active category information
   */
  get activeCategoryInfo$(): Observable<EvaluationCategoryDTO | null> {
    return combineLatest([this.categories$, this.activeCategory$]).pipe(
      map(([categories, activeId]) => categories.find(cat => cat.id === activeId) || null),
      distinctUntilChanged()
    );
  }

  /**
   * Observable for the current evaluation phase
   * @returns Observable<EvaluationPhase | null> The current phase derived from submission
   */
  get currentPhase$(): Observable<EvaluationPhase | null> {
    return this.submission$.pipe(
      map(submission => submission?.phase ?? null),
      distinctUntilChanged()
    );
  }

  /**
   * Observable for rating status loading state
   * Delegated to: EvaluationRatingStateService
   */
  get ratingStatusLoading$(): Observable<boolean> {
    return this.ratingState.ratingStatusLoading$;
  }

  // =============================================================================
  // DELEGATED OBSERVABLES (Proxied from Feature Services)
  // =============================================================================

  /**
   * Observable of discussions for the active category
   * Delegated to: EvaluationDiscussionStateService
   */
  get activeDiscussions$(): Observable<EvaluationDiscussionDTO[]> {
    // Map anonymousUser to just the ID for the discussion state service
    // Allow null values - comment status is now loaded directly from backend API
    const anonymousUserId$ = this.anonymousUser$.pipe(
      map(user => user?.id ?? null),  // Allow null during initial loading
      distinctUntilChanged()  // Avoid duplicate emissions
    );

    return this.discussionState.getActiveDiscussions$(
      this.submission$,
      this.activeCategory$,
      anonymousUserId$
    );
  }

  /**
   * Observable of rating status per category
   * Delegated to: EvaluationRatingStateService
   */
  get categoryRatingStatus$(): Observable<Map<number, CategoryRatingStatus>> {
    return this.ratingState.categoryRatingStatus$;
  }

  /**
   * Observable of comment status per category
   * Delegated to: EvaluationDiscussionStateService
   */
  get categoryCommentStatus$(): Observable<Map<number, boolean>> {
    return this.discussionState.categoryCommentStatus$;
  }

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private logger: LoggerService,
    private cache: EvaluationCacheService,
    private discussionState: EvaluationDiscussionStateService,
    private commentState: EvaluationCommentStateService,
    private ratingState: EvaluationRatingStateService,
    private voteLimitService: EvaluationVoteLimitService,
    private anonymousUserService: EvaluationAnonymousUserService,
    private healthMonitor: EvaluationHealthMonitorService,
    private categoryNav: EvaluationCategoryNavigationService
  ) {
    this.log.debug('EvaluationStateService initialized (Refactored)');
    this.initializeDefaultCategory();
    // Comment status detection now handled via direct backend API call in loadSubmissionDependencies()
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnDestroy(): void {
    this.log.debug('Service destroying - cleanup started');

    // Complete all subjects
    this.destroy$.next();
    this.destroy$.complete();

    // Clear all caches via cache service
    this.cache.clearAll();

    this.log.debug('Service destroyed - cleanup completed');
  }

  /**
   * Initializes default category when categories are loaded
   * Delegated to: EvaluationCategoryNavigationService
   * @private
   */
  private initializeDefaultCategory(): void {
    this.categories$
      .pipe(
        filter((categories: EvaluationCategoryDTO[]) => categories.length > 0),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe((categories: EvaluationCategoryDTO[]) => {
        this.categoryNav.initializeDefaultCategory(categories);
      });
  }

  // =============================================================================
  // SUBMISSION LOADING
  // =============================================================================

  /**
   * Loads submission and all related data
   *
   * @description
   * Orchestrates loading of:
   * - Submission details
   * - Comment statistics
   * - Anonymous user
   * - Categories
   * - Rating status (via RatingStateService)
   *
   * @param submissionId - The submission ID
   * @param userId - The user ID
   */
  loadSubmission(submissionId: string, userId: number): void {
    this.setLoading(true);
    this.clearError();

    this.log.info('Loading submission', { submissionId, userId });

    this.evaluationService.getSubmission(submissionId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: submission => {
        this.submissionSubject.next(submission);
        this.log.info('Submission loaded', { submissionId: submission.id });

        // Load dependent data in parallel
        this.loadSubmissionDependencies(submission, userId);
      },
      error: error => {
        this.log.error('Submission loading failed', { error });
        this.setError('Error loading submission');
        this.setLoading(false);
      },
    });
  }

  /**
   * Loads all submission dependencies in parallel
   * @private
   */
  private loadSubmissionDependencies(
    submission: EvaluationSubmissionDTO,
    userId: number
  ): void {
    // Load comment stats
    this.evaluationService.getCommentStats(String(submission.id)).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: stats => this.commentStatsSubject.next(stats),
      error: () => this.commentStatsSubject.next(null),
    });

    // Load anonymous user (delegated to EvaluationAnonymousUserService)
    this.anonymousUserService.loadAnonymousUser(String(submission.id)).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.log.debug('Anonymous user loaded successfully'),
      error: error => {
        this.log.error('Anonymous user loading failed', { error });
        this.setError('Error loading anonymous user');
      },
    });

    // Load categories and preload vote limits for first 3 + last 2
    this.evaluationService.getCategories(submission.sessionId).pipe(
      takeUntil(this.destroy$),
      switchMap(categories => {
        this.categoriesSubject.next(categories);
        this.log.info('Categories loaded', { count: categories.length });

        // PRELOAD: Load vote limits for first 3 + last 2 categories immediately
        // This covers both forward navigation and jumps to the last category
        const first3 = categories.slice(0, 3).map(cat => cat.id);
        const last2 = categories.length > 3 ? categories.slice(-2).map(cat => cat.id) : [];

        // Combine and deduplicate (in case of small category lists)
        const categoryIdsToPreload = [...new Set([...first3, ...last2])];

        if (categoryIdsToPreload.length > 0) {
          return this.voteLimitService.preloadVoteLimitStatus(String(submission.id), categoryIdsToPreload);
        }
        return of(void 0);
      })
    ).subscribe({
      next: () => {
        this.log.info('Initial vote limits preloaded');
      },
      error: error => {
        this.log.error('Categories loading or preloading failed', { error });
        this.setError('Error loading categories');
      },
    });

    // Load rating status (delegated to RatingStateService)
    this.ratingState.loadCategoryRatingStatus(String(submission.id), Number(userId));

    // Load comment status from backend (API-based detection like DEPRECATED version)
    this.evaluationService.getUserCommentStatusForAllCategories(String(submission.id)).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: commentStatusObj => {
        const commentStatusMap = new Map<number, boolean>();
        Object.entries(commentStatusObj).forEach(([categoryId, hasCommented]) => {
          commentStatusMap.set(Number(categoryId), hasCommented as boolean);
        });
        this.discussionState.categoryCommentStatusSubject.next(commentStatusMap);

        const categoriesWithComments = Array.from(commentStatusMap.entries())
          .filter(([_, hasCommented]) => hasCommented)
          .map(([categoryId]) => categoryId);

        this.log.info('Comment status loaded from backend', {
          totalCategories: commentStatusMap.size,
          categoriesWithComments,
          submissionId: submission.id
        });
      },
      error: error => {
        this.log.error('Failed to load comment status', { error, submissionId: submission.id });
        // Fallback to empty map - detection will run from discussions as backup
        this.discussionState.categoryCommentStatusSubject.next(new Map());
      },
    });

    this.setLoading(false);
  }

  // =============================================================================
  // CATEGORY MANAGEMENT
  // =============================================================================

  /**
   * Transitions to a new category atomically
   *
   * @description
   * Performs atomic category transition with rating status loading.
   * Prevents race conditions and UI flicker.
   *
   * @param categoryId - The category ID to transition to
   * @returns Observable<void> Completes when transition is finished
   */
  transitionToCategory(categoryId: number): Observable<void> {
    const currentCategory = this.categoryNav.getCurrentActiveCategory();
    const submissionId = this.submissionSubject.value?.id;
    const anonymousUserId = this.anonymousUserService.getUserId();

    // Skip transition if same category or invalid data
    if (currentCategory === categoryId || !submissionId || !anonymousUserId) {
      return of(void 0);
    }

    // Start transition loading state (delegated to CategoryNavigationService)
    this.categoryNav.startTransition();

    this.log.info('Transitioning to category', { from: currentCategory, to: categoryId });

    // Load rating status first, then transition atomically
    return this.evaluationService.getUserRatingStatus(String(submissionId), anonymousUserId).pipe(
      take(1),
      map(statuses => {
        this.log.info('Rating statuses loaded for atomic transition', {
          statusCount: statuses.length,
        });

        // Atomic update: Set category (delegated to CategoryNavigationService)
        this.categoryNav.setActiveCategory(categoryId);

        // SMART CACHING: Only load vote limits if not already cached
        // This prevents unnecessary backend calls during category switches
        this.voteLimitService.loadVoteLimitStatus(String(submissionId), categoryId).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: () => this.log.info('Vote limits loaded for category transition', { categoryId }),
          error: (error: any) => this.log.error('Failed to load vote limits', { categoryId, error })
        });

        return void 0;
      }),
      catchError((error: unknown) => {
        this.log.error('Error during atomic category transition', { error, categoryId });

        // Fallback: still transition to category (delegated to CategoryNavigationService)
        this.categoryNav.setActiveCategory(categoryId);

        // Handle errors intelligently
        if (error instanceof HttpErrorResponse && error.status >= 400) {
          this.setError('Error loading rating status. Please refresh the page.');
        }

        return of(void 0);
      }),
      finalize(() => {
        // End transition loading state (delegated to CategoryNavigationService)
        this.categoryNav.endTransition();
        this.log.info('Atomic category transition completed', { categoryId });
      })
    );
  }

  // =============================================================================
  // COMMENT MANAGEMENT (Delegated)
  // =============================================================================

  /**
   * Adds a comment to a specific category
   * Delegated to: EvaluationCommentStateService
   */
  addComment(
    submissionId: string,
    categoryId: number,
    content: string,
    parentId?: string
  ): Observable<EvaluationCommentDTO> {
    const anonymousUser = this.anonymousUserService.getCurrentAnonymousUser();

    if (!anonymousUser) {
      throw new Error('Anonymous user not available. Please reload the page.');
    }

    return this.commentState.addComment(
      submissionId,
      categoryId,
      content,
      anonymousUser,
      parentId
    ).pipe(
      tap(comment => {
        // Mark category as commented
        this.discussionState.markCategoryAsCommented(categoryId, submissionId);
      })
    );
  }

  /**
   * Adds a reply to an existing comment
   * Delegated to: EvaluationCommentStateService
   */
  addReply(
    submissionId: string,
    categoryId: number,
    parentCommentId: string,
    content: string
  ): Observable<EvaluationCommentDTO> {
    const anonymousUser = this.anonymousUserService.getCurrentAnonymousUser();

    if (!anonymousUser) {
      throw new Error('Anonymous user not available. Please reload the page.');
    }

    return this.commentState.addReply(
      submissionId,
      categoryId,
      parentCommentId,
      content,
      anonymousUser
    );
  }

  /**
   * Gets user vote count for a comment
   * Wrapper method for backward compatibility
   */
  getUserVoteCountForComment(commentId: string): Observable<number> {
    return this.evaluationService.getUserVoteCountForComment(commentId);
  }

  /**
   * Gets user vote status for a comment
   * Wrapper method for backward compatibility
   */
  getUserVoteStatus(commentId: string): Observable<VoteType | null> {
    return this.evaluationService.getUserVoteForComment(commentId).pipe(
      catchError(error => {
        this.log.error('Failed to load user vote status', { error, commentId });
        return of(null);
      })
    );
  }

  // =============================================================================
  // RATING MANAGEMENT (Delegated)
  // =============================================================================

  /**
   * Submits a rating for a specific category
   * Delegated to: EvaluationRatingStateService
   */
  submitRating(
    submissionId: string,
    categoryId: number,
    score: number
  ): Observable<EvaluationRatingDTO> {
    return this.ratingState.submitRating(submissionId, categoryId, score);
  }

  /**
   * Checks if a category has been rated
   * Delegated to: EvaluationRatingStateService
   */
  isCategoryRated$(categoryId: number): Observable<boolean> {
    return this.ratingState.isCategoryRated$(categoryId);
  }

  /**
   * Gets rating stats for a category
   * Delegated to: EvaluationRatingStateService
   */
  getRatingStats(submissionId: string, categoryId: number): Observable<RatingStatsDTO> {
    return this.ratingState.getRatingStats(submissionId, categoryId);
  }

  // =============================================================================
  // DISCUSSION HELPERS (Delegated)
  // =============================================================================

  /**
   * Checks if user has commented in a category
   * Delegated to: EvaluationDiscussionStateService
   */
  hasCommentedInCategory$(categoryId: number): Observable<boolean> {
    return this.discussionState.hasCommentedInCategory(categoryId);
  }

  /**
   * Marks a category as commented
   * Delegated to: EvaluationDiscussionStateService
   */
  markCategoryAsCommented(categoryId: number, submissionId: string): void {
    this.discussionState.markCategoryAsCommented(categoryId, submissionId);
  }

  // =============================================================================
  // UI STATE MANAGEMENT
  // =============================================================================

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private setError(error: string): void {
    this.errorSubject.next(error);
  }

  private clearError(): void {
    this.errorSubject.next(null);
  }

  // =============================================================================
  // PUBLIC STATE ACCESSORS (for Facade)
  // =============================================================================

  /**
   * Gets the current submission synchronously
   *
   * @returns The current submission or null if not loaded
   */
  getCurrentSubmission(): EvaluationSubmissionDTO | null {
    return this.submissionSubject.value;
  }

  /**
   * Gets the current active category ID synchronously
   * Delegated to: EvaluationCategoryNavigationService
   *
   * @returns The current active category ID or null if not set
   */
  getCurrentActiveCategory(): number | null {
    return this.categoryNav.getCurrentActiveCategory();
  }

  /**
   * Gets the current anonymous user synchronously
   * Delegated to: EvaluationAnonymousUserService
   *
   * @returns The current anonymous user or null if not loaded
   */
  getCurrentAnonymousUser(): AnonymousEvaluationUserDTO | null {
    return this.anonymousUserService.getCurrentAnonymousUser();
  }

  /**
   * Gets the current anonymous user ID for rating operations
   * Delegated to: EvaluationAnonymousUserService
   *
   * @returns The anonymous user ID or null if not available
   */
  getUserId(): number | null {
    return this.anonymousUserService.getUserId();
  }

  /**
   * Gets the current category rating status map (synchronous)
   * Delegated to: EvaluationRatingStateService
   * @returns Current Map of category rating statuses
   */
  getCurrentCategoryRatingStatusMap(): Map<number, CategoryRatingStatus> {
    return this.ratingState.getCurrentCategoryRatingStatusMap();
  }

  /**
   * Loads category rating status with backend health monitoring
   * Delegates to RatingStateService and updates backend health status
   */
  loadCategoryRatingStatus(submissionId: string, userId: number): void {
    this.log.info('Loading category rating status with health monitoring', { submissionId, userId });

    // Delegate to RatingStateService
    this.ratingState.loadCategoryRatingStatus(submissionId, userId);

    // Monitor the rating status observable for backend health (delegated to HealthMonitorService)
    this.ratingState.categoryRatingStatus$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.healthMonitor.recordSuccess();
      },
      error: (error: unknown) => {
        const errorMessage = error instanceof HttpErrorResponse
          ? `HTTP ${error.status}: ${error.statusText}`
          : 'Unknown error';
        this.healthMonitor.recordFailure(errorMessage);
      }
    });
  }

  /**
   * Refreshes rating status from the server
   * @param submissionId - The submission ID to refresh
   * @param userId - The user ID
   */
  refreshRatingStatus(submissionId: string, userId: number): void {
    this.loadCategoryRatingStatus(submissionId, userId);
  }

  /**
   * Retries loading rating status after backend health issue
   * Called by user action (retry button click)
   */
  retryRatingStatusLoad(submissionId: string, userId: number): void {
    this.log.info('User initiated retry for rating status');
    this.loadCategoryRatingStatus(submissionId, userId);
  }

  // =============================================================================
  // CACHE MANAGEMENT (Delegated)
  // =============================================================================

  /**
   * Clears all caches
   * Delegated to: EvaluationCacheService
   */
  clearCache(): void {
    this.cache.clearAll();
    this.discussionState.invalidateAllDiscussions();
  }

  /**
   * Refreshes all data for a submission
   */
  refreshAll(submissionId: string, userId: number): void {
    this.loadSubmission(submissionId, userId);
    this.clearCache();
  }

  /**
   * Refreshes discussions for current submission
   */
  refreshDiscussions(submissionId: string): void {
    const currentActiveCategory = this.categoryNav.getCurrentActiveCategory();
    const anonymousUser = this.anonymousUserService.getCurrentAnonymousUser();

    if (currentActiveCategory && currentActiveCategory > 0) {
      this.discussionState.refreshDiscussions(
        submissionId,
        currentActiveCategory,
        anonymousUser?.id
      );
      this.log.info('Discussions refresh initiated', { categoryId: currentActiveCategory });
    }
  }

  // =============================================================================
  // RATING OPERATIONS (Delegated to RatingStateService)
  // =============================================================================

  /**
   * Deletes a category rating
   * Delegated to: EvaluationRatingStateService
   */
  deleteCategoryRating(submissionId: string, categoryId: number): Observable<void> {
    return this.ratingState.deleteCategoryRating(submissionId, categoryId);
  }

  /**
   * Gets the current rating for a specific category
   * Delegated to: EvaluationRatingStateService
   */
  getCurrentRating(categoryId: number): Observable<EvaluationRatingDTO | null> {
    return this.ratingState.getCurrentRating(categoryId);
  }

  /**
   * Updates rating status for a specific category after user submits a rating
   *
   * NOTE: This method is temporarily included here for backward compatibility.
   * In a future refactoring, it should be moved to EvaluationRatingStateService.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID that was rated
   * @param rating - The rating value submitted
   */
  updateCategoryRatingStatus(submissionId: string, categoryId: number, rating: number): void {
    this.ratingState.markCategoryAsRated(categoryId, rating, submissionId);
  }
}
