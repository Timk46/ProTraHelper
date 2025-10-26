import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject, combineLatest, of } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  switchMap,
  shareReplay,
  takeUntil,
  take,
  tap,
  catchError,
  finalize,
} from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

// DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  CategoryRatingStatus,
  VoteLimitStatusDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  CreateEvaluationCommentDTO,
  EvaluationRatingDTO,
  CreateEvaluationRatingDTO,
  RatingStatsDTO,
  EvaluationPhase,
  VoteType,
} from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { UserService } from '../auth/user.service';
import { LoggerService } from '../logger/logger.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { EvaluationDiscussionStateService } from './evaluation-discussion-state.service';
import { EvaluationCommentStateService } from './evaluation-comment-state.service';
import { EvaluationRatingStateService } from './evaluation-rating-state.service';

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
 *
 * Core responsibilities (kept here):
 * - Submission state
 * - Category state and transitions
 * - Anonymous user management
 * - Loading & error state
 * - Service orchestration
 *
 * @implements {OnDestroy}
 * @since 2.0.0 (Refactored from monolithic service)
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
    VOTE_LIMITS: {
      MAX_VOTES_PER_CATEGORY: 10,
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
   * Currently active category ID
   */
  private activeCategorySubject = new BehaviorSubject<number | null>(null);

  /**
   * Comment statistics for the submission
   */
  private commentStatsSubject = new BehaviorSubject<CommentStatsDTO | null>(null);

  /**
   * Anonymous user for the current session
   */
  private anonymousUserSubject = new BehaviorSubject<AnonymousEvaluationUserDTO | null>(null);

  /**
   * Global loading state
   */
  private loadingSubject = new BehaviorSubject<boolean>(false);

  /**
   * Global error state
   */
  private errorSubject = new BehaviorSubject<string | null>(null);

  /**
   * Category transition loading state
   */
  private categoryTransitionLoadingSubject = new BehaviorSubject<boolean>(false);

  /**
   * Vote limit status per category
   */
  private voteLimitStatusSubject = new BehaviorSubject<Map<number, VoteLimitStatusDTO>>(new Map());

  /**
   * Vote limit loading state
   */
  private voteLimitLoadingSubject = new BehaviorSubject<boolean>(false);

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  readonly submission$ = this.submissionSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();
  readonly commentStats$ = this.commentStatsSubject.asObservable();
  readonly anonymousUser$ = this.anonymousUserSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly categoryTransitionLoading$ = this.categoryTransitionLoadingSubject.asObservable();
  readonly voteLimitStatus$ = this.voteLimitStatusSubject.asObservable();
  readonly voteLimitLoading$ = this.voteLimitLoadingSubject.asObservable();

  /**
   * Observable of active category ID
   * Returns null if no category is active or categories haven't loaded yet
   */
  get activeCategory$(): Observable<number | null> {
    return this.activeCategorySubject.asObservable().pipe(
      map(categoryId => {
        if (categoryId === null) {
          const categories = this.categoriesSubject.value;
          return categories.length > 0 ? categories[0].id : null;
        }
        return categoryId;
      }),
      distinctUntilChanged()
    );
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

  // =============================================================================
  // DELEGATED OBSERVABLES (Proxied from Feature Services)
  // =============================================================================

  /**
   * Observable of discussions for the active category
   * Delegated to: EvaluationDiscussionStateService
   */
  get activeDiscussions$(): Observable<EvaluationDiscussionDTO[]> {
    return this.discussionState.getActiveDiscussions$(this.submission$, this.activeCategory$);
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
    private userservice: UserService,
    private logger: LoggerService,
    private cache: EvaluationCacheService,
    private discussionState: EvaluationDiscussionStateService,
    private commentState: EvaluationCommentStateService,
    private ratingState: EvaluationRatingStateService
  ) {
    this.log.debug('EvaluationStateService initialized (Refactored)');
    this.initializeDefaultCategory();
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
   * @private
   */
  private initializeDefaultCategory(): void {
    this.categories$
      .pipe(
        filter(categories => categories.length > 0 && this.activeCategorySubject.value === null),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(categories => {
        const firstCategory = categories[0];
        this.activeCategorySubject.next(firstCategory.id);
        this.log.debug('Default category set', { categoryId: firstCategory.id });
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
        this.setError('Fehler beim Laden der Abgabe');
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

    // Load anonymous user
    this.evaluationService.getOrCreateAnonymousUser(String(submission.id), userId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: user => this.anonymousUserSubject.next(user),
      error: error => {
        this.log.error('Anonymous user loading failed', { error });
        this.setError('Fehler beim Laden des anonymen Benutzers');
      },
    });

    // Load categories
    this.evaluationService.getCategories(String(submission.sessionId)).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: categories => {
        this.categoriesSubject.next(categories);
        this.log.info('Categories loaded', { count: categories.length });
      },
      error: error => {
        this.log.error('Categories loading failed', { error });
        this.setError('Fehler beim Laden der Kategorien');
      },
    });

    // Load rating status (delegated to RatingStateService)
    this.ratingState.loadCategoryRatingStatus(String(submission.id), userId);

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
    const currentCategory = this.activeCategorySubject.value;
    const submissionId = this.submissionSubject.value?.id;
    const anonymousUserId = this.anonymousUserSubject.value?.id;

    // Skip transition if same category or invalid data
    if (currentCategory === categoryId || !submissionId || !anonymousUserId) {
      return of(void 0);
    }

    // Start transition loading state
    this.categoryTransitionLoadingSubject.next(true);

    this.log.info('Transitioning to category', { from: currentCategory, to: categoryId });

    // Load rating status first, then transition atomically
    return this.evaluationService.getUserRatingStatus(String(submissionId), anonymousUserId).pipe(
      take(1),
      map(statuses => {
        this.log.info('Rating statuses loaded for atomic transition', {
          statusCount: statuses.length,
        });

        // Atomic update: Set both category and rating status simultaneously
        this.activeCategorySubject.next(categoryId);

        // Update rating status via RatingStateService
        // (This is a bit awkward - the service should handle this internally)
        // For now, we'll let the transition complete

        // Load vote limits for the new category
        if (submissionId) {
          this.loadVoteLimitStatus(String(submissionId), categoryId).pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => this.log.info('Vote limits loaded for category transition', { categoryId }),
            error: (error) => this.log.error('Failed to load vote limits', { categoryId, error })
          });
        }

        return void 0;
      }),
      catchError((error: unknown) => {
        this.log.error('Error during atomic category transition', { error, categoryId });

        // Fallback: still transition to category
        this.activeCategorySubject.next(categoryId);

        // Handle errors intelligently
        if (error instanceof HttpErrorResponse && error.status >= 400) {
          this.setError('Fehler beim Laden des Bewertungsstatus. Bitte aktualisieren Sie die Seite.');
        }

        return of(void 0);
      }),
      finalize(() => {
        this.categoryTransitionLoadingSubject.next(false);
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
    const anonymousUser = this.anonymousUserSubject.value;

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
    const anonymousUser = this.anonymousUserSubject.value;

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
  // VOTE LIMIT MANAGEMENT
  // =============================================================================

  /**
   * Loads vote limit status for a category
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Observable<void> Completes when loading is finished
   */
  loadVoteLimitStatus(submissionId: string, categoryId: number): Observable<void> {
    this.voteLimitLoadingSubject.next(true);

    // Use default vote limits (backend endpoint not yet implemented)
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

    this.voteLimitLoadingSubject.next(false);
    return of(void 0);
  }

  // =============================================================================
  // DISCUSSION HELPERS (Delegated)
  // =============================================================================

  /**
   * Checks if user has commented in a category
   * Delegated to: EvaluationDiscussionStateService
   */
  hasCommentedInCategory(categoryId: number): Observable<boolean> {
    return this.discussionState.hasCommentedInCategory(categoryId);
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
    const currentActiveCategory = this.activeCategorySubject.value;
    if (currentActiveCategory && currentActiveCategory > 0) {
      this.discussionState.refreshDiscussions(submissionId, currentActiveCategory);
      this.log.info('Discussions refresh initiated', { categoryId: currentActiveCategory });
    }
  }
}
