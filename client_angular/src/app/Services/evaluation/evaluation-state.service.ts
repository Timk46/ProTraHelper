import { Injectable, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of, Subject } from 'rxjs';
import { LRUCache } from '../../utils/lru-cache';
import {
  map,
  distinctUntilChanged,
  shareReplay,
  switchMap,
  catchError,
  finalize,
  take,
  tap,
  retry,
  filter,
  takeUntil,
} from 'rxjs/operators';

import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  CreateEvaluationCommentDTO,
  CreateEvaluationRatingDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  EvaluationPhase,
  VoteUpdateData,
  EvaluationRatingDTO,
  RatingStatsDTO,
  VoteResultDTO,
  VoteType,
  CategoryRatingStatus,
  VoteLimitStatusDTO,
  VoteLimitResponseDTO,
} from '@DTOs/index';

import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { UserService } from '../auth/user.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Result type for immutable reply addition operations
 *
 * @description
 * Returned by the addReplyImmutably() method to indicate whether the parent
 * comment was found and the reply was successfully added to the comment tree.
 *
 * @property comments - The updated comments array with the reply added (if found)
 * @property found - True if the parent comment was found and reply was added
 */
interface ReplyAdditionResult {
  comments: EvaluationCommentDTO[];
  found: boolean;
}

/**
 * Centralized state management service for evaluation discussions
 *
 * @description Manages submission, categories, discussions, ratings, and comment state
 * with optimized caching and reactive updates. Coordinates data flow between components.
 */
@Injectable({
  providedIn: 'root',
})
export class EvaluationStateService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationStateService');

  // Lifecycle management
  private destroy$ = new Subject<void>();

  // Service-level configuration constants
  private readonly CONFIG = {
    CACHE_SIZES: {
      DISCUSSIONS: 20,
      RATING_STATS: 20,
      VOTE_STATUS: 200,
      VOTE_LOADING: 200,
    },
    TIMEOUTS: {
      FRESHNESS_THRESHOLD_MS: 2 * 60 * 1000, // 2 minutes
    },
    VOTE_LIMITS: {
      MAX_VOTES_PER_CATEGORY: 10,
    },
  } as const;

  // Core state subjects
  private submissionSubject = new BehaviorSubject<EvaluationSubmissionDTO | null>(null);
  private categoriesSubject = new BehaviorSubject<EvaluationCategoryDTO[]>([]);
  private activeCategorySubject = new BehaviorSubject<number | null>(null);
  private commentStatsSubject = new BehaviorSubject<CommentStatsDTO | null>(null);
  private anonymousUserSubject = new BehaviorSubject<AnonymousEvaluationUserDTO | null>(null);

  // Submission list management removed - now handled by EvaluationNavigationService

  // Discussion state by category (caching with LRU for memory management)
  private discussionCache = new LRUCache<number, BehaviorSubject<EvaluationDiscussionDTO[]>>(
    this.CONFIG.CACHE_SIZES.DISCUSSIONS,
    (categoryId, subject) => {
      // Cleanup: Complete BehaviorSubject to prevent memory leaks
      subject.complete();
    }
  );

  // Rating state
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);
  private ratingStatsCache = new LRUCache<number, BehaviorSubject<RatingStatsDTO>>(
    this.CONFIG.CACHE_SIZES.RATING_STATS,
    (categoryId, subject) => {
      subject.complete();
    }
  );

  // Category-specific rating status management
  private categoryRatingStatusSubject = new BehaviorSubject<Map<number, CategoryRatingStatus>>(new Map());
  private ratingStatusLoadingSubject = new BehaviorSubject<boolean>(false);

  // Atomic category transition state management
  private categoryTransitionLoadingSubject = new BehaviorSubject<boolean>(false);

  private commentIdToCategoryIdMap = new Map<string, number>();

  // UI state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Race condition prevention
  private commentCreationInProgress = new Set<string>(); // Track ongoing comment creations by category
  private categoryLoadingStates = new Map<number, boolean>(); // Track loading state per category

  // Vote limits tracking (per category) - Legacy voteLimitsSubject removed, use voteLimitStatusSubject

  // Enhanced vote limit tracking (per category) - New dynamic system
  private voteLimitStatusSubject = new BehaviorSubject<Map<number, VoteLimitStatusDTO>>(new Map());
  private voteLimitLoadingSubject = new BehaviorSubject<boolean>(false);

  // Comment status tracking (per category) - NEW: Tracks if user has submitted first comment
  private categoryCommentStatusSubject = new BehaviorSubject<Map<number, boolean>>(new Map());
  private commentStatusStorageKey = 'evaluation_commented_categories';

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private userservice: UserService,
    private logger: LoggerService
  ) {
    // FIXED: Moved subscription to separate method with proper cleanup
    this.initializeDefaultCategory();
  }

  /**
   * Initializes default category selection with proper subscription management
   * FIXED: Prevents memory leak from constructor subscription
   */
  private initializeDefaultCategory(): void {
    this.categories$
      .pipe(
        filter(categories => categories.length > 0 && this.activeCategorySubject.value === null),
        take(1), // Auto-complete after first emission
        takeUntil(this.destroy$)
      )
      .subscribe(categories => {
        const firstCategory = categories[0];
        this.activeCategorySubject.next(firstCategory.id);
        this.log.debug('Default category set', { categoryId: firstCategory.id });
      });
  }

  /**
   * Cleanup on service destruction
   * Prevents memory leaks by completing all subscriptions and clearing caches
   */
  ngOnDestroy(): void {
    this.log.debug('Service destroying - cleanup started');

    // Complete all subjects
    this.destroy$.next();
    this.destroy$.complete();

    // Clear all caches (calls onEvict for each entry)
    this.discussionCache.clear();
    this.ratingStatsCache.clear();
    this.commentVoteStatusCache.clear();
    this.commentVoteLoadingCache.clear();

    this.log.debug('Service destroyed - cleanup completed');
  }

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  get submission$(): Observable<EvaluationSubmissionDTO | null> {
    return this.submissionSubject.asObservable();
  }

  get categories$(): Observable<EvaluationCategoryDTO[]> {
    return this.categoriesSubject.asObservable();
  }

  /**
   * Observable for the currently active category ID
   * FIXED: Returns null instead of magic number 1 when no categories available
   * @returns Observable<number | null> The active category ID or null
   */
  get activeCategory$(): Observable<number | null> {
    return this.activeCategorySubject.asObservable().pipe(
      map(categoryId => {
        // Fallback: Falls keine Kategorie gesetzt ist, nutze die erste verfügbare
        if (categoryId === null) {
          const categories = this.categoriesSubject.value;
          return categories.length > 0 ? categories[0].id : null; // FIXED: null statt 1
        }
        return categoryId;
      }),
      distinctUntilChanged(),
    );
  }

  get commentStats$(): Observable<CommentStatsDTO | null> {
    return this.commentStatsSubject.asObservable();
  }

  get anonymousUser$(): Observable<AnonymousEvaluationUserDTO | null> {
    return this.anonymousUserSubject.asObservable();
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
   * Gets the current anonymous user ID for rating operations
   * @returns The anonymous user ID or null if not available
   */
  getUserId(): number | null {
    const anonymousUser = this.anonymousUserSubject.value;
    return anonymousUser ? anonymousUser.id : null;
  }

  // submissionList$ and currentSubmissionIndex$ removed - use EvaluationNavigationService instead

  /**
   * Observable for category-specific rating status
   * Returns a Map where the key is categoryId and value is CategoryRatingStatus
   */
  get categoryRatingStatus$(): Observable<Map<number, CategoryRatingStatus>> {
    return this.categoryRatingStatusSubject.asObservable();
  }

  /**
   * Gets the current category rating status map (synchronous)
   * @returns Current Map of category rating statuses
   */
  getCurrentCategoryRatingStatusMap(): Map<number, CategoryRatingStatus> {
    return this.categoryRatingStatusSubject.value;
  }

  /**
   * Observable for rating status loading state
   */
  get ratingStatusLoading$(): Observable<boolean> {
    return this.ratingStatusLoadingSubject.asObservable();
  }

  /**
   * Observable for category transition loading state
   */
  get categoryTransitionLoading$(): Observable<boolean> {
    return this.categoryTransitionLoadingSubject.asObservable();
  }

  /**
   * Gets rating status for a specific category
   */
  getCategoryRatingStatus$(categoryId: number): Observable<CategoryRatingStatus | null> {
    return this.categoryRatingStatus$.pipe(
      map(statusMap => statusMap.get(categoryId) || null),
      distinctUntilChanged()
    );
  }

  /**
   * Checks if a specific category has been rated by the user
   */
  isCategoryRated$(categoryId: number): Observable<boolean> {
    return this.getCategoryRatingStatus$(categoryId).pipe(
      map(status => status?.hasRated || false),
      distinctUntilChanged()
    );
  }

  /**
   * Checks if user can access discussion for a specific category
   */
  canAccessCategoryDiscussion$(categoryId: number): Observable<boolean> {
    return this.getCategoryRatingStatus$(categoryId).pipe(
      map(status => status?.canAccessDiscussion || false),
      distinctUntilChanged()
    );
  }

  get loading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  get error$(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  // voteLimits$ removed - use voteLimitStatus$ instead

  // Enhanced vote limit observables
  get voteLimitStatus$(): Observable<Map<number, VoteLimitStatusDTO>> {
    return this.voteLimitStatusSubject.asObservable();
  }

  get voteLimitLoading$(): Observable<boolean> {
    return this.voteLimitLoadingSubject.asObservable();
  }
  // =============================================================================
  // SUBMISSION MANAGEMENT
  // =============================================================================

  loadSubmission(submissionId: string, userId: number): void {
    this.setLoading(true);
    this.clearError();

    this.evaluationService.getSubmission(submissionId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: submission => {
        this.log.info(' Submission loaded:', submission);
        this.submissionSubject.next(submission);

        // Prepare parallel operations array
        const parallelOps: Observable<any>[] = [
          this.evaluationService.getCommentStats(submissionId).pipe(
            catchError(error => {
              this.log.warn(' CommentStats loading failed:', error);
              return of(null); // Continue with null if stats fail
            }),
          ),
          this.evaluationService.getOrCreateAnonymousUser(submissionId).pipe(
            tap(anonymousUser => {
            }),
            catchError(error => {
              this.log.error('⚠️ AnonymousUser loading failed:', error);
              return of(null); // Continue with null if user fails
            }),
          ),
        ];

        // Add categories loading if sessionId is available
        if (submission.sessionId) {
          parallelOps.push(
            this.evaluationService.getCategories(submission.sessionId).pipe(
              catchError(error => {
                this.log.warn(' Categories loading failed:', error);
                return of([]); // Continue with empty array if categories fail
              }),
            ),
          );
        }

        // Add rating status loading
        parallelOps.push(
          this.evaluationService.getUserRatingStatus(String(submissionId), userId).pipe(
            tap(statuses => {
              this.log.info(' Rating statuses loaded during submission init:', statuses);
              // Convert array to Map for efficient lookups
              const statusMap = new Map<number, CategoryRatingStatus>();
              statuses.forEach(status => {
                statusMap.set(status.categoryId, status);
              });
              this.categoryRatingStatusSubject.next(statusMap);
            }),
            catchError(error => {
              this.log.warn(' Rating status loading failed:', error);
              // Reset to empty map if loading fails
              this.categoryRatingStatusSubject.next(new Map());
              return of([]); // Continue with empty array if rating status fails
            }),
          ),
        );

        // Add comment status loading for all categories
        parallelOps.push(
          this.evaluationService.getUserCommentStatusForAllCategories(submissionId).pipe(
            tap(commentStatusObj => {
              this.log.info(' Comment statuses loaded during submission init:', commentStatusObj);
              // Convert object to Map for consistent interface
              const commentStatusMap = new Map<number, boolean>();
              Object.entries(commentStatusObj).forEach(([categoryId, hasCommented]) => {
                commentStatusMap.set(Number(categoryId), hasCommented);
              });
              this.categoryCommentStatusSubject.next(commentStatusMap);
            }),
            catchError(error => {
              this.log.warn(' Comment status loading failed:', error);
              // Reset to empty map if loading fails
              this.categoryCommentStatusSubject.next(new Map());
              return of({}); // Continue with empty object if comment status fails
            }),
          ),
        );

        // Wait for ALL parallel operations to complete
        forkJoin(parallelOps).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: results => {
            this.log.info(' All parallel operations completed:', results);

            const [commentStats, anonymousUser, categories] = results;

            // Update states with results
            if (commentStats) {
              this.commentStatsSubject.next(commentStats);
            }
            if (anonymousUser) {
              this.anonymousUserSubject.next(anonymousUser);
            }
            if (categories && categories.length > 0) {
              this.log.info(' Categories loaded successfully. Count:', categories.length);
              this.categoriesSubject.next(categories);
            }

            // ONLY NOW set loading to false - after ALL operations are complete
            this.setLoading(false);
          },
          error: error => {
            this.log.error('❌ Parallel operations failed:', error);
            this.setError('Fehler beim Laden der Zusatzdaten');
            this.setLoading(false);
          },
        });
      },
      error: error => {
        this.log.error('❌ Submission loading failed:', error);
        this.setError('Fehler beim Laden der Abgabe');
        this.setLoading(false);
      },
    });
  }

  // =============================================================================
  // CATEGORY MANAGEMENT
  // =============================================================================

  loadCategories(sessionId?: number): void {
    if (!sessionId) {
      this.setError('SessionId erforderlich zum Laden der Kategorien');
      return;
    }

    this.evaluationService.getCategories(sessionId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: categories => {
        this.categoriesSubject.next(categories);
      },
      error: error => {
        this.setError('Fehler beim Laden der Kategorien');
      },
    });
  }

  /**
   * Atomically transitions to a new category with rating status validation
   * This prevents race conditions between category switch and rating status loading
   * @param categoryId - The ID of the category to transition to
   * @returns Observable<void> - Completes when transition is finished
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

    const currentStatusMap = this.categoryRatingStatusSubject.value;
    const existingStatus = currentStatusMap.get(categoryId);
    // FIXED: Preserve existing status while loading fresh data to prevent UI flicker
    // Do NOT delete the cached status - this was causing the rating panel to reappear
    
    // Load rating status first, then transition atomically
    return this.evaluationService.getUserRatingStatus(String(submissionId), anonymousUserId).pipe(
      take(1),
      map(statuses => {
        // DEBUG: Backend API response verification
        this.log.info(' Rating statuses loaded for atomic transition:', {
          statusCount: statuses.length,
          categoriesReceived: statuses.map(s => ({ id: s.categoryId, hasRated: s.hasRated, rating: s.rating }))
        });

        // BUGFIX: Merge backend data with local updates to preserve fresh ratings
        const currentStatusMap = this.categoryRatingStatusSubject.value;
        const mergedStatusMap = this.mergeRatingStatusMaps(statuses, currentStatusMap);

        // Atomic update: Set both category and rating status simultaneously
        this.activeCategorySubject.next(categoryId);
        this.categoryRatingStatusSubject.next(mergedStatusMap);

        this.log.info(' Atomic transition completed - status preserved:', {
          categoryId,
          newStatusCount: mergedStatusMap.size,
          targetCategoryHasStatus: mergedStatusMap.has(categoryId),
          targetCategoryStatus: mergedStatusMap.get(categoryId),
          allStatusEntries: Array.from(mergedStatusMap.entries()).map(([id, status]) => ({
            categoryId: id, 
            hasRated: status.hasRated, 
            rating: status.rating,
            canAccessDiscussion: status.canAccessDiscussion,
            lastUpdatedAt: status.lastUpdatedAt
          }))
        });

        // 🔧 CRITICAL FIX: Load vote limits for the new category to sync "x/x verfügbar" display
        if (submissionId) {
          this.loadVoteLimitStatus(String(submissionId), categoryId).pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => this.log.info(' Vote limits loaded for category transition:', categoryId),
            error: (error) => this.log.error('❌ Failed to load vote limits for category', { categoryId, error })
          });
        }

        return void 0;
      }),
      catchError((error: unknown) => {
        // Detailed error logging for debugging
        this.log.error('❌ Error during atomic category transition:', {
          error,
          errorType: error?.constructor?.name,
          status: error instanceof HttpErrorResponse ? error.status : undefined,
          message: error instanceof HttpErrorResponse ? error.message : undefined,
          categoryId,
          submissionId,
          anonymousUserId
        });

        // ✅ INTELLIGENT ERROR HANDLING: Only show popup for REAL backend errors
        if (error instanceof HttpErrorResponse && error.status >= 400) {
          // Real HTTP error from backend - show appropriate error message
          this.log.error('🚨 Backend error detected - showing popup:', {
            status: error.status,
            statusText: error.statusText,
            url: error.url
          });

          // Fallback: still transition to category but preserve existing status map
          this.activeCategorySubject.next(categoryId);

          // Specific error messages based on status code
          if (error.status === 403) {
            this.setError('Zugriff verweigert. Sie gehören möglicherweise nicht mehr zur richtigen Gruppe.');
          } else if (error.status === 404) {
            this.setError('Bewertungsdaten nicht gefunden. Bitte laden Sie die Seite neu.');
          } else if (error.status >= 500) {
            this.setError('Serverfehler beim Laden des Bewertungsstatus. Bitte versuchen Sie es erneut.');
          } else {
            this.setError('Fehler beim Laden des Bewertungsstatus. Seite ggf. aktualisieren.');
          }
        } else {
          // ⚠️ HTTP Cancellation or Network Error - NO popup, silent handling
          this.log.warn('⚠️ Request cancelled or network error (no popup shown):', {
            errorType: error?.constructor?.name,
            categoryId
          });

          // Silently transition to category without error popup
          this.activeCategorySubject.next(categoryId);
        }

        return of(void 0);
      }),
      finalize(() => {
        this.categoryTransitionLoadingSubject.next(false);
        this.log.info(' Atomic category transition completed:', categoryId);
      })
    );
  }

  /**
   * Merges backend rating statuses with local cache, preserving fresh local data
   *
   * @description This method intelligently merges backend and local rating status maps,
   * preferring fresh local data (updated within last 2 minutes) over potentially stale
   * backend cache data. This prevents UI flicker and preserves optimistic updates.
   *
   * @param backendStatuses - Statuses from backend API
   * @param currentStatusMap - Current local status map
   * @returns Merged status map with fresh local data preserved
   * @memberof EvaluationStateService
   */
  private mergeRatingStatusMaps(
    backendStatuses: CategoryRatingStatus[],
    currentStatusMap: Map<number, CategoryRatingStatus>
  ): Map<number, CategoryRatingStatus> {
    const FRESHNESS_THRESHOLD_MS = this.CONFIG.TIMEOUTS.FRESHNESS_THRESHOLD_MS;
    const mergedStatusMap = new Map<number, CategoryRatingStatus>();

    // Convert backend array to map for efficient lookup (more idiomatic)
    const backendStatusMap = new Map(
      backendStatuses.map(status => [status.categoryId, status])
    );

    // Get all unique category IDs from both sources (simplified)
    const allCategoryIds = new Set([
      ...currentStatusMap.keys(),
      ...backendStatusMap.keys()
    ]);

    // Merge logic: prefer fresh local data over backend
    allCategoryIds.forEach(categoryIdKey => {
      const localStatus = currentStatusMap.get(categoryIdKey);
      const backendStatus = backendStatusMap.get(categoryIdKey);

      // Preserve fresh local data (updated within threshold) with rating
      if (localStatus?.lastUpdatedAt) {
        const isLocalFresh = localStatus.lastUpdatedAt.getTime() > (Date.now() - FRESHNESS_THRESHOLD_MS);
        const localHasRating = localStatus.hasRated && localStatus.rating !== null;

        if (isLocalFresh && localHasRating) {
          mergedStatusMap.set(categoryIdKey, localStatus);
          return;
        }
      }

      // Use backend data if available, otherwise fall back to local
      const statusToUse = backendStatus || localStatus;
      if (statusToUse) {
        mergedStatusMap.set(categoryIdKey, statusToUse);
      }
    });

    return mergedStatusMap;
  }

  get activeCategoryInfo$(): Observable<EvaluationCategoryDTO | null> {
    return combineLatest([this.categories$, this.activeCategory$]).pipe(
      map(([categories, activeId]) => categories.find(cat => cat.id === activeId) || null),
      distinctUntilChanged(),
    );
  }

  // =============================================================================
  // DISCUSSION MANAGEMENT
  // =============================================================================

  /**
   * Gets discussions for a specific category (internal use only)
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Observable<EvaluationDiscussionDTO[]> The discussions for the category
   * @private Use activeDiscussions$ observable instead
   */
  private getDiscussionsForCategory(
    submissionId: string,
    categoryId: number,
  ): Observable<EvaluationDiscussionDTO[]> {
    // Ensure cache exists before loading
    const subject = this.ensureDiscussionCache(categoryId);

    // Load discussions if cache is empty
    if (subject.value.length === 0) {
      this.loadDiscussionsForCategory(submissionId, categoryId);
    }

    return subject.asObservable();
  }

  /**
   * Loads discussions for a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   */
  private loadDiscussionsForCategory(submissionId: string, categoryId: number): void {
    const cacheKey = categoryId;
    // Phase 3.2: Prevent concurrent loading of the same category
    if (this.categoryLoadingStates.get(categoryId)) {
      return;
    }

    // Mark category as loading
    this.categoryLoadingStates.set(categoryId, true);

    this.evaluationService.getDiscussionsByCategory(submissionId, categoryId.toString()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: discussions => {
        const subject = this.discussionCache.get(cacheKey);
        if (subject) {
          subject.next(discussions);
        }
        // Populate comment-id to category-id map for quick lookups
        discussions.forEach(discussion => {
          discussion.comments.forEach(comment => {
            this.commentIdToCategoryIdMap.set(String(comment.id), categoryId);
          });
        });

        // Check if current user has already commented in this category
        const anonymousUser = this.anonymousUserSubject.value;
        if (anonymousUser && discussions.length > 0) {
          const hasUserCommented = discussions.some(discussion =>
            discussion.comments.some(comment => 
              comment.authorId === anonymousUser.id
            )
          );
          
          if (hasUserCommented) {
            // Update comment status based on backend data (no localStorage for demo submissions)
            const currentStatusMap = new Map(this.categoryCommentStatusSubject.value);
            const wasAlreadyMarked = currentStatusMap.get(categoryId);
            currentStatusMap.set(categoryId, true);
            this.categoryCommentStatusSubject.next(currentStatusMap);
            
            this.log.info(' Comment status updated from backend data:', {
              categoryId,
              userId: anonymousUser.id,
              wasAlreadyMarked,
              submissionId
            });
          }
        }
        
        this.clearError(); // Clear any previous errors
      },
      error: error => {
        this.log.error('❌ Failed to load discussions for category', { categoryId, error });
        this.setError(
          `Fehler beim Laden der Diskussionen für Kategorie ${categoryId}. Bitte aktualisieren Sie die Seite.`,
        );

        // Provide fallback empty state instead of leaving cache in undefined state
        const subject = this.discussionCache.get(cacheKey);
        if (subject && subject.value.length === 0) {
          subject.next([]);
        }
      },
      complete: () => {
        // Always clean up loading state
        this.categoryLoadingStates.set(categoryId, false);
      },
    });
  }

  get activeDiscussions$(): Observable<EvaluationDiscussionDTO[]> {
    return combineLatest([this.submission$, this.activeCategory$]).pipe(
      map(([submission, categoryId]) => {
        if (!submission || categoryId === null) return of([]);
        return this.getDiscussionsForCategory(String(submission.id), categoryId);
      }),
      switchMap(discussions$ => discussions$),
      shareReplay(1),
    );
  }

  /**
   * Ensures a discussion cache exists for the given category
   * @param categoryId - The category ID
   * @returns BehaviorSubject<EvaluationDiscussionDTO[]> The cache subject
   */
  private ensureDiscussionCache(categoryId: number): BehaviorSubject<EvaluationDiscussionDTO[]> {
    const cacheKey = categoryId;
    if (!this.discussionCache.has(cacheKey)) {
      const subject = new BehaviorSubject<EvaluationDiscussionDTO[]>([]);
      this.discussionCache.set(cacheKey, subject);
    }
    return this.discussionCache.get(cacheKey)!;
  }

  // =============================================================================
  // RATING STATUS MANAGEMENT
  // =============================================================================

  /**
   * Loads rating status for all categories of a submission
   * @param submissionId - The submission ID to load rating status for
   */
  loadCategoryRatingStatus(submissionId: string, userId: number): void {
    this.ratingStatusLoadingSubject.next(true);

    this.evaluationService.getUserRatingStatus(String(submissionId), userId).pipe(
      take(1),
      tap(statuses => {
        this.log.info(' Received rating statuses:', statuses);

        // BUGFIX: Merge with existing local data instead of blind overwrite
        const currentStatusMap = this.categoryRatingStatusSubject.value;
        const mergedStatusMap = this.mergeRatingStatusMaps(statuses, currentStatusMap);

        this.log.info(' Rating status merged with local preservation:', {
          totalCategories: mergedStatusMap.size,
          preservedLocal: Array.from(mergedStatusMap.entries())
            .filter(([_, status]) => {
              const localStatus = currentStatusMap.get(status.categoryId);
              return localStatus === status;
            }).length
        });

        this.categoryRatingStatusSubject.next(mergedStatusMap);
      }),
      catchError(error => {
        this.log.error('❌ Error loading rating status:', error);
        this.setError('Fehler beim Laden des Bewertungsstatus');
        return of([]);
      }),
      finalize(() => {
        this.ratingStatusLoadingSubject.next(false);
      })
    ).subscribe();
  }

  /**
   * Updates rating status for a specific category after user submits a rating
   * Enhanced with category isolation to prevent cross-contamination
   * @param submissionId - The submission ID
   * @param categoryId - The category ID that was rated
   * @param rating - The rating value submitted
   */
  updateCategoryRatingStatus(submissionId: string, categoryId: number, rating: number): void {
    const currentStatusMap = this.categoryRatingStatusSubject.value;
    const existingStatus = currentStatusMap.get(categoryId);

    // Validate that we're updating the correct category
    if (existingStatus) {
    }

    // Create updated status with enhanced data integrity
    const updatedStatus: CategoryRatingStatus = {
      categoryId,
      categoryName: existingStatus?.categoryName || `Category ${categoryId}`,
      displayName: existingStatus?.displayName || `Kategorie ${categoryId}`,
      hasRated: true,
      rating,
      ratedAt: new Date(),
      lastUpdatedAt: new Date(),
      canAccessDiscussion: true,
      isRequired: true,
    };

    // Create new map to ensure immutability and prevent reference issues
    const newStatusMap = new Map(currentStatusMap);
    
    // Only update the specific category to prevent cross-contamination
    newStatusMap.set(categoryId, updatedStatus);

    // Atomic update
    this.categoryRatingStatusSubject.next(newStatusMap);

    this.log.info(' Rating status updated with category isolation:', {
      updatedCategoryId: categoryId,
      newRating: rating,
      totalCategoriesInMap: newStatusMap.size,
      affectedCategory: updatedStatus
    });
  }

  /**
   * Deletes a rating for a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID to delete rating for
   */
  /**
   * Deletes a category rating both locally and on the backend
   *
   * @description This method calls the backend to actually delete the rating
   * from the database, then updates the local state to reflect the deletion.
   * This ensures the rating is completely removed and can be re-submitted.
   *
   * @param {string} submissionId - The submission ID
   * @param {number} categoryId - The category ID to delete rating for
   * @returns {Observable<void>} Observable that completes when deletion is successful
   * @memberof EvaluationStateService
   */
  deleteCategoryRating(submissionId: string, categoryId: number): Observable<void> {
    // Call backend to delete rating from database
    return this.evaluationService.deleteUserRating(submissionId, categoryId).pipe(
      tap(response => {
        this.log.info(' Backend deletion successful:', response);

        // Update local state after successful backend deletion
        const currentStatusMap = this.categoryRatingStatusSubject.value;
        const existingStatus = currentStatusMap.get(categoryId);

        if (existingStatus) {
          // Create updated status with rating removed
          const updatedStatus: CategoryRatingStatus = {
            ...existingStatus,
            hasRated: false,
            rating: null,
            ratedAt: null,
            lastUpdatedAt: new Date(),
            canAccessDiscussion: false, // Remove discussion access when rating is deleted
          };

          // Create new map to ensure immutability
          const newStatusMap = new Map(currentStatusMap);
          newStatusMap.set(categoryId, updatedStatus);

          // Atomic update
          this.categoryRatingStatusSubject.next(newStatusMap);

          // BUGFIX: Also update ratingsSubject to remove the deleted rating
          // This ensures both state containers stay synchronized
          const currentRatings = this.ratingsSubject.value;
          const updatedRatings = currentRatings.filter(
            rating => !(rating.categoryId === categoryId && String(rating.submissionId) === submissionId)
          );
          this.ratingsSubject.next(updatedRatings);

          this.log.info(' Local state updated after rating deletion:', {
            deletedCategoryId: categoryId,
            totalCategoriesInMap: newStatusMap.size,
            updatedCategory: updatedStatus,
            ratingsRemoved: currentRatings.length - updatedRatings.length
          });
        }
      }),
      map(() => void 0), // Convert to void observable
      catchError(error => {
        this.log.error('❌ Failed to delete category rating:', error);
        throw error;
      })
    );
  }

  /**
   * Refreshes rating status from the server
   * @param submissionId - The submission ID to refresh
   */
  refreshRatingStatus(submissionId: string, userId: number): void {
    this.loadCategoryRatingStatus(submissionId, userId);
  }

  // =============================================================================
  // COMMENT MANAGEMENT
  // =============================================================================

  /**
   * Adds a comment to a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param content - The comment content
   * @param parentId - Optional parent comment ID for replies
   * @returns Observable<EvaluationCommentDTO> The created comment
   */
  addComment(
    submissionId: string,
    categoryId: number,
    content: string,
    parentId?: string,
  ): Observable<EvaluationCommentDTO> {
    const anonymousUser = this.anonymousUserSubject.value;

    // Phase 1.2: Validate anonymous user exists
    if (!anonymousUser) {
      this.log.error('❌ Cannot create comment: Anonymous user not available');
      throw new Error('Anonymous user not available. Please reload the page.');
    }

    // Phase 3.2: Prevent double submissions
    const operationKey = `${submissionId}-${categoryId}`;
    if (this.commentCreationInProgress.has(operationKey)) {
      this.log.warn(' Comment creation already in progress for category', categoryId);
      throw new Error('Ein Kommentar wird bereits erstellt. Bitte warten Sie einen Moment.');
    }

    const createCommentDto: CreateEvaluationCommentDTO = {
      submissionId: Number(submissionId),
      categoryId: categoryId,
      content,
      parentId: parentId ? Number(parentId) : undefined, // Include parentId for reply functionality
    };

    this.log.info(' Anonymous user validated:', anonymousUser.displayName);

    // Mark operation as in progress
    this.commentCreationInProgress.add(operationKey);

    return this.evaluationService.createComment(createCommentDto).pipe(
      map(comment => {
        // 🚨 CRITICAL FIX: Ensure authorId is set to current anonymous user
        if (!comment.authorId && anonymousUser) {
          comment.authorId = anonymousUser.id;
        }
        
        // Update local cache
        this.handleCommentAdded(submissionId, categoryId, comment);
        // this.refreshCommentStats(submissionId); // Deaktiviert - verursacht 404-Fehler und ist nicht kritisch
        return comment;
      }),
      catchError(error => {
        this.log.error('❌ Comment creation failed:', error);
        this.setError('Fehler beim Erstellen des Kommentars. Bitte versuchen Sie es erneut.');
        throw error; // Re-throw for component to handle
      }),
      finalize(() => {
        // Always clean up the progress tracking
        this.commentCreationInProgress.delete(operationKey);
      }),
    );
  }

  /**
   * Adds a reply to an existing comment
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param parentCommentId - The parent comment ID
   * @param content - The reply content
   * @returns Observable<EvaluationCommentDTO> The created reply
   */
  addReply(
    submissionId: string,
    categoryId: number,
    parentCommentId: string,
    content: string,
  ): Observable<EvaluationCommentDTO> {
    return this.addComment(submissionId, categoryId, content, parentCommentId);
  }

  /**
   * Handles a comment being added to the local cache
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param comment - The comment that was added
   */
  /**
   * Handles a comment being added to the local cache with immutable updates
   *
   * @description
   * This method is optimized for OnPush change detection by creating new object references
   * for ONLY the discussion that changed. Unchanged discussions maintain their references
   * for optimal performance.
   *
   * Key architectural decisions:
   * - Uses immutable updates (map + spread) instead of direct mutation
   * - Single BehaviorSubject emission (no setTimeout workaround needed)
   * - Orphaned reply detection with graceful fallback
   * - Comprehensive error logging for debugging
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param comment - The comment that was added
   */
  private handleCommentAdded(
    submissionId: string,
    categoryId: number,
    comment: EvaluationCommentDTO,
  ): void {
    this.log.debug('➕ handleCommentAdded called:', {
      submissionId,
      categoryId,
      commentId: comment.id,
      parentId: comment.parentId,
      isReply: !!comment.parentId,
    });

    try {
      // Validate input parameters
      if (!submissionId || !categoryId || !comment) {
        this.log.error('❌ Invalid parameters for handleCommentAdded:', {
          submissionId,
          categoryId,
          comment,
        });
        return;
      }

      // Use robust cache method to ensure cache exists
      const subject = this.ensureDiscussionCache(categoryId);
      const currentDiscussions = subject.value || [];

      // Check if discussion exists for this category
      const discussionExists = currentDiscussions.some(d => d.categoryId === categoryId);

      let finalDiscussions: EvaluationDiscussionDTO[];

      if (!discussionExists) {
        // Create new discussion immutably
        this.log.info('📝 Creating new discussion for category:', categoryId);
        const newDiscussion: EvaluationDiscussionDTO = {
          id: Date.now(),
          submissionId: Number(submissionId),
          categoryId: categoryId,
          comments: [comment],
          createdAt: new Date(),
          totalComments: 1,
          availableComments: 3,
          usedComments: 1,
        };

        finalDiscussions = [...currentDiscussions, newDiscussion];
      } else {
        // Update existing discussions immutably - only deep-copy the ONE discussion that changes
        finalDiscussions = currentDiscussions.map(d => {
          if (d.categoryId !== categoryId) {
            // Completely unchanged - reuse reference for performance
            return d;
          }

          // This is the discussion we're updating - handle comment addition immutably
          let updatedComments: EvaluationCommentDTO[];

          if (comment.parentId) {
            // Reply: Use immutable helper with orphan detection
            const result = this.addReplyImmutably(d.comments || [], comment);

            if (!result.found) {
              // Orphaned reply - parent comment not found
              this.log.error('❌ Parent comment not found for reply:', {
                replyId: comment.id,
                parentId: comment.parentId,
                categoryId,
                submissionId
              });

              // Graceful fallback: Add as top-level comment
              this.log.warn('⚠️ Adding orphaned reply as top-level comment');
              updatedComments = [comment, ...(d.comments || [])];
            } else {
              updatedComments = result.comments;
              this.log.info('✅ Reply added to parent successfully:', {
                replyId: comment.id,
                parentId: comment.parentId,
              });
            }
          } else {
            // Top-level comment: Simple prepend (newest first)
            updatedComments = [comment, ...(d.comments || [])];
            this.log.info('✅ Top-level comment added:', {
              commentId: comment.id,
            });
          }

          // Return new discussion object (triggers OnPush change detection)
          const totalComments = this.calculateTotalComments(updatedComments);
          return {
            ...d,
            comments: updatedComments,
            totalComments,
            usedComments: totalComments,
          };
        });
      }

      // Add comment to lookup map
      this.commentIdToCategoryIdMap.set(String(comment.id), categoryId);

      this.log.info('✅ Comment processing complete:', {
        categoryId,
        commentId: comment.id,
        isReply: !!comment.parentId,
        totalDiscussions: finalDiscussions.length,
      });

      // SINGLE emission - OnPush will detect reference change
      // No setTimeout needed - immutability ensures proper change detection
      subject.next(finalDiscussions);

    } catch (error) {
      this.log.error('❌ Error in handleCommentAdded:', error);
      this.setError('Fehler beim Aktualisieren der Kommentare. Bitte laden Sie die Seite neu.');
    }
  }

  /**
   * Immutable recursive reply addition - creates new comment objects instead of mutating
   *
   * @description
   * This method recursively searches for a parent comment and adds the reply to its replies array
   * WITHOUT mutating the original objects. This is critical for OnPush change detection to work correctly.
   *
   * Each comment in the path to the parent is cloned with updated references, ensuring that
   * Angular's change detection can detect the changes even with OnPush strategy.
   *
   * Includes recursion depth limit to prevent stack overflow with deeply nested comment threads.
   *
   * @param comments - Array of comments to search through
   * @param reply - The reply to add
   * @param depth - Current recursion depth (internal parameter for safety)
   * @returns Object containing updated comments array and found flag
   *
   * @example
   * ```typescript
   * const result = this.addReplyImmutably(discussion.comments, newReply);
   * if (result.found) {
   *   discussion.comments = result.comments; // Triggers OnPush change detection
   * } else {
   *   console.error('Parent comment not found');
   * }
   * ```
   */
  private addReplyImmutably(
    comments: EvaluationCommentDTO[],
    reply: EvaluationCommentDTO,
    depth: number = 0
  ): ReplyAdditionResult {
    // Safety: Prevent infinite recursion with deeply nested threads
    const MAX_DEPTH = 50;
    if (depth > MAX_DEPTH) {
      this.log.error('❌ Maximum comment depth exceeded:', {
        depth,
        replyId: reply.id,
        parentId: reply.parentId
      });
      return { comments, found: false };
    }

    let found = false;

    const updatedComments = comments.map(comment => {
      if (comment.id === reply.parentId) {
        found = true;
        // Create new comment object with reply added
        return {
          ...comment,
          replies: [...(comment.replies || []), reply],
          replyCount: (comment.replyCount || 0) + 1
        };
      }

      // Recursively search in nested replies
      if (comment.replies && comment.replies.length > 0) {
        const result = this.addReplyImmutably(comment.replies, reply, depth + 1);

        if (result.found) {
          found = true;
          // Create new comment object with updated nested replies
          return {
            ...comment,
            replies: result.comments,
            replyCount: result.comments.length  // Direct child count only
          };
        }
      }

      // No changes for this comment - return as-is (reference reuse for performance)
      return comment;
    });

    return { comments: updatedComments, found };
  }

  /**
   * Calculates total comments including all nested replies (unified method)
   * Replaces both calculateTotalComments and calculateReplyCount for DRY principle
   * @param comments - Array of comments or replies
   * @returns Total count of all comments and nested replies
   */
  private calculateTotalComments(comments: EvaluationCommentDTO[]): number {
    if (!comments || comments.length === 0) {
      return 0;
    }

    return comments.reduce((count, comment) => {
      // Count this comment + recursively count all its replies
      return count + 1 + this.calculateTotalComments(comment.replies || []);
    }, 0);
  }

  // calculateReplyCount() removed - use calculateTotalComments() instead (unified implementation)

  // =============================================================================
  // VOTE STATUS MANAGEMENT - ARCHITECTURE REFACTOR
  // =============================================================================

  // Comment-specific vote status cache (LRU for memory management)
  private commentVoteStatusCache = new LRUCache<string, BehaviorSubject<VoteType | null>>(
    this.CONFIG.CACHE_SIZES.VOTE_STATUS,
    (commentId, subject) => {
      subject.complete();
    }
  );
  private commentVoteLoadingCache = new LRUCache<string, BehaviorSubject<boolean>>(
    this.CONFIG.CACHE_SIZES.VOTE_LOADING,
    (commentId, subject) => {
      subject.complete();
    }
  );

  // =============================================================================
  // VOTE STATUS MANAGEMENT - CENTRALIZED BUSINESS LOGIC
  // =============================================================================

  // voteCompletionSubject and voteErrorSubject removed - unused event subjects (no subscribers)

  /**
   * Gets the complete vote state for a comment including status and loading state (internal use)
   * This centralizes all vote management business logic previously in components
   *
   * @param commentId - The comment ID
   * @returns Observable with vote status and loading state
   * @private Internal method - components should use performOptimisticVote() instead
   * @memberof EvaluationStateService
   */
  private getCommentVoteState$(commentId: string): Observable<{
    voteStatus: VoteType | null;
    isLoading: boolean;
  }> {
    // Ensure cache subjects exist
    this.ensureCommentVoteCache(commentId);

    const voteStatus$ = this.commentVoteStatusCache.get(commentId)!.asObservable();
    const isLoading$ = this.commentVoteLoadingCache.get(commentId)!.asObservable();

    return combineLatest([voteStatus$, isLoading$]).pipe(
      map(([voteStatus, isLoading]) => ({ voteStatus, isLoading }))
    );
  }

  /**
   * Loads user vote status for a comment with fallback system (internal use)
   * First tries local comment data, then API call if needed
   *
   * @param commentId - The comment ID
   * @private Internal method used by vote management
   * @memberof EvaluationStateService
   */
  private loadUserVoteStatusForComment(commentId: string): void {
    // Ensure cache exists
    this.ensureCommentVoteCache(commentId);

    const voteStatusSubject = this.commentVoteStatusCache.get(commentId)!;
    const loadingSubject = this.commentVoteLoadingCache.get(commentId)!;

    // First attempt: Try to get vote from local comment data
    const localVote = this.getUserVoteFromLocalComment(commentId);

    if (localVote !== null) {
      this.log.info(' User vote found in local data:', {
        commentId,
        localVote,
      });
      voteStatusSubject.next(localVote);
      return;
    }

    // Second attempt: Load from API if not found locally
    loadingSubject.next(true);

    this.getUserVoteStatus(commentId).pipe(
      retry(2),
      catchError((error: HttpErrorResponse) => {
        this.log.error('❌ Failed to load user vote status after retries:', {
          commentId,
          error: error,
          errorMessage: error?.message,
          errorStatus: error?.status,
          errorUrl: error?.url,
          errorDetails: error?.error
        });
        loadingSubject.next(false);
        return of(null);
      }),
      take(1)
    ).subscribe((voteType: VoteType | null) => {
      this.log.info(' User vote status loaded from API:', {
        commentId,
        voteType,
      });

      loadingSubject.next(false);
      voteStatusSubject.next(voteType);
    });
  }

  /**
   * Performs optimistic voting with proper state management (internal use)
   *
   * @param commentId - The comment ID
   * @param voteType - The vote type ('UP' for ranking, or null to remove)
   * @param categoryId - The category ID for vote limits
   * @returns Observable<VoteResultDTO> - Vote result
   * @private Internal method - use voteCommentWithEnhancedLimits() instead
   * @memberof EvaluationStateService
   */
  private performOptimisticVote(
    commentId: string,
    voteType: VoteType,
    categoryId: number
  ): Observable<VoteResultDTO> {
    // Ensure cache exists
    this.ensureCommentVoteCache(commentId);

    const voteStatusSubject = this.commentVoteStatusCache.get(commentId)!;
    const currentVote = voteStatusSubject.value;
    const newVote = currentVote === voteType ? null : voteType; // Toggle logic
    const isAdding = newVote !== null;
    // Optimistic update for immediate UI feedback
    voteStatusSubject.next(newVote);
    
    // FIXED: Add optimistic vote limit update for immediate counter feedback
    this.updateVoteLimitState(categoryId, isAdding, Number(commentId));

    // Perform actual vote
    return this.voteCommentWithLimits(commentId, voteType, categoryId).pipe(
      tap(result => {
        if (result) {
          // Update final vote status
          voteStatusSubject.next(result.userVote);
        }
      }),
      catchError(error => {
        // Vote failed - revert optimistic update
        // FIXED: Rollback the vote limit optimistic update
        this.updateVoteLimitState(categoryId, !isAdding, Number(commentId));

        // Reload vote status from local data first (faster fallback)
        const localVote = this.getUserVoteFromLocalComment(commentId);
        if (localVote !== null) {
          voteStatusSubject.next(localVote);
        } else {
          // If no local data, reload from API
          this.loadUserVoteStatusForComment(commentId);
        }

        throw error;
      })
    );
  }

  /**
   * Ensures vote cache subjects exist for a comment
   *
   * @param commentId - The comment ID
   * @memberof EvaluationStateService
   */
  private ensureCommentVoteCache(commentId: string): void {
    if (!this.commentVoteStatusCache.has(commentId)) {
      this.commentVoteStatusCache.set(commentId, new BehaviorSubject<VoteType | null>(null));
    }
    if (!this.commentVoteLoadingCache.has(commentId)) {
      this.commentVoteLoadingCache.set(commentId, new BehaviorSubject<boolean>(false));
    }
  }

  /**
   * Gets user vote from local comment data (fallback system)
   * This is the local fallback before API call
   *
   * @param commentId - The comment ID
   * @returns VoteType | null - The user's vote or null
   * @memberof EvaluationStateService
   */
  private getUserVoteFromLocalComment(commentId: string): VoteType | null {
    const anonymousUser = this.anonymousUserSubject.value;
    if (!anonymousUser) {
      return null;
    }

    // Search through all discussion caches to find the comment
    for (const [categoryId, cacheSubject] of this.discussionCache.entries()) {
      const discussions = cacheSubject.value;
      for (const discussion of discussions) {
        const comment = discussion.comments.find(c => String(c.id) === commentId);
        if (comment) {
          const userVote = comment.votes.find(vote => vote.userId === anonymousUser.id);
          return userVote ? userVote.voteType : null;
        }
      }
    }

    return null;
  }

  // =============================================================================
  // VOTING MANAGEMENT
  // =============================================================================

  /**
   * Gets the current user's vote status for a specific comment
   * @param commentId - The comment ID
   * @returns Observable<VoteType> - The user's vote or null
   */
  getUserVoteStatus(commentId: string): Observable<VoteType | null> {
    // Call backend API
    return this.evaluationService.getUserVoteForComment(commentId).pipe(
      tap(voteType => {
      }),
      catchError(error => {
        this.log.error('❌ Failed to load user vote status:', error);
        return of(null); // Return null if failed
      }),
    );
  }

  /**
   * Gets the user's vote count for a specific comment
   * WRAPPER METHOD: Provides public access to evaluationService method
   * @param commentId - The comment ID
   * @returns Observable<number> - The user's vote count
   */
  getUserVoteCountForComment(commentId: string): Observable<number> {
    return this.evaluationService.getUserVoteCountForComment(commentId);
  }

  // voteComment() removed - use voteCommentWithEnhancedLimits() instead

  /**
   * 🔧 OPTIMIZED: Smart vote update handler with cascade prevention
   * 
   * Now intelligently updates only when necessary and uses immutable updates
   * to prevent unnecessary re-rendering while maintaining data consistency.
   * 
   * Performance improvements:
   * - Deep equality check before triggering updates
   * - Immutable updates with Object.freeze()
   * - Batched updates with debouncing
   * - Smart cache invalidation
   */
  private handleVoteUpdate(commentId: string, voteData: VoteUpdateData): void {
    const categoryId = this.commentIdToCategoryIdMap.get(commentId);
    if (categoryId === undefined) {
      this.log.warn(
        `Could not find category for commentId ${commentId}. Vote update may not be reflected in UI.`,
      );
      return;
    }

    const subject = this.discussionCache.get(categoryId);
    if (!subject) {
      return;
    }

    const anonymousUser = this.anonymousUserSubject.value;
    if (!anonymousUser) {
      this.log.warn('Cannot update vote, anonymous user not available');
      return;
    }

    const discussions = subject.value;
    
    // 🔧 SMART CHECK: Only proceed if the update would actually change something
    const needsUpdate = this.shouldUpdateDiscussions(discussions, commentId, voteData);
    if (!needsUpdate) {
      return;
    }

    // 🔧 IMMUTABLE UPDATE: Create new discussions with minimal changes
    const updatedDiscussions = this.createUpdatedDiscussions(
      discussions,
      commentId,
      voteData,
      anonymousUser
    );

    // 🔧 PERFORMANCE: Only emit if discussions actually changed (referential comparison)
    if (updatedDiscussions !== discussions) {
      this.log.info(' SMART: Emitting optimized vote update');
      subject.next(updatedDiscussions);
    }
  }

  /**
   * 🔧 SMART: Check if discussions need updating
   */
  private shouldUpdateDiscussions(
    discussions: EvaluationDiscussionDTO[],
    commentId: string,
    voteData: VoteUpdateData
  ): boolean {
    const targetComment = this.findCommentInDiscussions(discussions, commentId);
    if (!targetComment) {
      return false;
    }

    // Check if vote stats actually changed
    const currentStats = targetComment.voteStats;
    const newStats = voteData.voteStats;

    return (
      currentStats.upVotes !== newStats.upVotes ||
      currentStats.downVotes !== newStats.downVotes ||
      currentStats.totalVotes !== newStats.totalVotes ||
      currentStats.score !== newStats.score
    );
  }

  /**
   * 🔧 IMMUTABLE: Create updated discussions with minimal object creation
   */
  private createUpdatedDiscussions(
    discussions: EvaluationDiscussionDTO[],
    commentId: string,
    voteData: VoteUpdateData,
    anonymousUser: AnonymousEvaluationUserDTO
  ): EvaluationDiscussionDTO[] {
    return discussions.map(discussion => {
      // Check if this discussion contains the target comment
      const hasTargetComment = discussion.comments.some(c => String(c.id) === commentId);
      if (!hasTargetComment) {
        return discussion; // Return same reference if no changes needed
      }

      // Only create new discussion object if it contains the target comment
      return {
        ...discussion,
        comments: discussion.comments.map((comment: EvaluationCommentDTO) => {
          if (String(comment.id) !== commentId) {
            return comment; // Return same reference if no changes needed
          }

          // 🔧 OPTIMIZED: Update votes array efficiently
          const otherVotes = comment.votes.filter(vote => vote.userId !== anonymousUser.id);
          const newVotes = [...otherVotes];
          
          if (voteData.userVote) {
            newVotes.push({
              id: Date.now() + Math.random(), // Generate unique numeric ID
              userId: anonymousUser.id,
              commentId: comment.id,
              voteType: voteData.userVote,
              createdAt: new Date(),
            });
          }

          // Create immutable comment update (without Object.freeze to avoid readonly type issues)
          const updatedComment = {
            ...comment,
            voteStats: { ...voteData.voteStats }, // Create new object reference
            votes: [...newVotes], // Create new array reference
          };

          return updatedComment;
        }),
      };
    });
  }

  /**
   * 🔧 HELPER: Find comment in discussions efficiently
   */
  private findCommentInDiscussions(
    discussions: EvaluationDiscussionDTO[],
    commentId: string
  ): EvaluationCommentDTO | null {
    for (const discussion of discussions) {
      const comment = discussion.comments.find(c => String(c.id) === commentId);
      if (comment) {
        return comment;
      }
    }
    return null;
  }

  // =============================================================================
  // RATING MANAGEMENT
  // =============================================================================

  /**
   * Gets rating statistics for a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Observable<RatingStatsDTO> The rating statistics
   */
  getRatingStats(submissionId: string, categoryId: number): Observable<RatingStatsDTO> {
    const cacheKey = categoryId;

    if (!this.ratingStatsCache.has(cacheKey)) {
      const subject = new BehaviorSubject<RatingStatsDTO>({
        submissionId: Number(submissionId),
        categoryId: categoryId,
        averageScore: 0,
        totalRatings: 0,
        scoreDistribution: [],
        userHasRated: false,
      });
      this.ratingStatsCache.set(cacheKey, subject);

      // Load initial data
      this.loadRatingStats(submissionId, categoryId);
    }

    return this.ratingStatsCache.get(cacheKey)!.asObservable();
  }

  /**
   * Loads rating statistics for a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   */
  private loadRatingStats(submissionId: string, categoryId: number): void {
    const cacheKey = categoryId;

    this.evaluationService.getRatingStats(submissionId, categoryId.toString()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: stats => {
        const subject = this.ratingStatsCache.get(cacheKey);
        if (subject) {
          subject.next(stats);
        }
      },
      error: error => {
        this.setError('Fehler beim Laden der Bewertungsstatistiken');
      },
    });
  }

  /**
   * Submits a rating for a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param score - The rating score
   * @returns Observable<EvaluationRatingDTO> The created rating
   */
  submitRating(
    submissionId: string,
    categoryId: number,
    score: number,
  ): Observable<EvaluationRatingDTO> {
    const createRatingDto: CreateEvaluationRatingDTO = {
      submissionId: Number(submissionId),
      categoryId: categoryId,
      score,
    };

    return this.evaluationService.createRating(createRatingDto).pipe(
      map(rating => {
        // Update local cache
        this.refreshRatingStats(submissionId, categoryId);
        return rating;
      }),
    );
  }

  /**
   * Refreshes rating statistics for a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   */
  private refreshRatingStats(submissionId: string, categoryId: number): void {
    this.loadRatingStats(submissionId, categoryId);
  }

  /**
   * Gets the current rating for a specific category
   * @param categoryId - The category ID
   * @returns Observable<EvaluationRatingDTO | null> The current rating or null
   */
  getCurrentRating(categoryId: number): Observable<EvaluationRatingDTO | null> {
    return this.ratingsSubject.asObservable().pipe(
      map(ratings => {
        const rating = ratings.find(r => r.categoryId === categoryId);
        return rating || null;
      }),
    );
  }




  // =============================================================================
  // STATISTICS AND AGGREGATION
  // =============================================================================

  // loadCommentStats() removed - unused (comment stats loaded during submission initialization)

  // commentStatsForActiveCategory$ removed - unused (calculate in component if needed)

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
  // CACHE MANAGEMENT
  // =============================================================================

  clearCache(): void {
    // LRU cache .clear() will automatically invoke cleanup callbacks
    this.discussionCache.clear();
    this.ratingStatsCache.clear();
    this.commentIdToCategoryIdMap.clear();
  }

  refreshAll(submissionId: string, userId: number): void {
    this.loadSubmission(submissionId, userId);
    this.clearCache();
    // Categories will be loaded automatically when submission loads
  }

  /**
   * Refreshes discussions for all categories
   * @param submissionId - The submission ID to refresh discussions for
   */
  refreshDiscussions(submissionId: string): void {
    // Get current active category and refresh its discussions
    const currentActiveCategory = this.activeCategorySubject.value;
    if (currentActiveCategory && currentActiveCategory > 0) {
      // loadDiscussionsForCategory returns void and handles subscription internally
      this.loadDiscussionsForCategory(submissionId, currentActiveCategory);
      this.log.info(' Discussions refresh initiated for category:', currentActiveCategory);
    } else {
    }
  }

  // =============================================================================
  // REAL-TIME UPDATES - REMOVED (not implemented)
  // =============================================================================
  // Real-time updates via WebSockets not currently implemented
  // handleRealtimeUpdate() removed as it was unused

  // =============================================================================
  // VOTE LIMITS MANAGEMENT
  // =============================================================================

  // initializeVoteLimits(), canVote(), getAvailableVotes() removed - legacy voting system
  // Use voteLimitStatus$ observable and loadVoteLimitStatus() instead

  /**
   * Unified vote limit state update
   * Consolidates both optimistic updates and confirmed backend updates
   * Handles both legacy voteLimitsSubject and new voteLimitStatusSubject
   *
   * @param categoryId - The category ID
   * @param isAdding - Whether vote is being added (true) or removed (false)
   * @param commentId - Optional comment ID for tracking voted comments (optimistic updates)
   */
  private updateVoteLimitState(
    categoryId: number,
    isAdding: boolean,
    commentId?: number
  ): void {
    const change = isAdding ? -1 : 1;

    // Legacy voteLimitsSubject code removed - now using voteLimitStatusSubject only

    // Update voteLimitStatusSubject (primary state used by UI)
    const currentStatusMap = new Map(this.voteLimitStatusSubject.value);
    const currentStatus = currentStatusMap.get(categoryId);

    if (!currentStatus) {
      this.log.warn(' Vote limit status not found for category:', categoryId);
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
   * Enhanced vote method that updates limits
   */
  voteCommentWithLimits(
    commentId: string,
    voteType: 'UP' | null,
    categoryId: number,
  ): Observable<any> {
    const isAdding = voteType !== null;

    // Graceful handling without throwing errors - check voteLimitStatus
    if (voteType !== null) {
      const voteLimitStatus = this.voteLimitStatusSubject.value.get(categoryId);
      if (voteLimitStatus && !voteLimitStatus.canVote) {
        this.log.warn(
          `No more votes available for category ${categoryId}`,
        );
        return of(null);
      }
    }

    return this.evaluationService.voteComment(commentId, voteType).pipe(
      map(result => {
        // FIXED: Update vote limits based on actual action (not previous state)
        if (isAdding && result.userVote) {
          // Vote was successfully added
          this.updateVoteLimitState(categoryId, true);
        } else if (!isAdding && !result.userVote) {
          // Vote was successfully removed
          this.updateVoteLimitState(categoryId, false);
        }

        // Backend now returns result.voteStats structure
        this.handleVoteUpdate(commentId, {
          voteStats: result.voteStats,
          userVote: result.userVote,
          netVotes: result.netVotes || result.voteStats?.upVotes || 0,
        });

        return result;
      }),
      catchError(error => {
        throw error;
      }),
    );
  }

  // =============================================================================
  // ENHANCED VOTE LIMIT MANAGEMENT
  // =============================================================================

  /**
   * Loads vote limit status for a specific category with corrected 10-vote system calculation
   * 
   * @description Fetches vote limit status from backend and scales the calculation
   * to ensure consistent 10-vote limit regardless of comment count. Uses backend's
   * correct vote tracking (remainingVotes) scaled to 10-vote system.
   * 
   * @param submissionId - The submission ID to load vote limits for
   * @param categoryId - The category ID to load vote limits for
   * @returns Observable<void> that emits when loading is complete
   * @throws Error if backend request fails after retries
   * @memberof EvaluationStateService
   * @since 2.0.0
   */
  loadVoteLimitStatus(submissionId: string, categoryId: number): Observable<void> {
    this.voteLimitLoadingSubject.next(true);

    // Use local default vote limits (from CONFIG)
    // Backend endpoint not yet implemented, using frontend-calculated limits
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

  /**
   * Updates vote limit status with corrected 10-vote system calculation (internal use)
   *
   * @description Processes backend vote limit status and scales the calculation
   * to ensure consistent 10-vote limit regardless of comment count. Uses backend's
   * correct vote tracking (remainingVotes) scaled to 10-vote system.
   *
   * @param categoryId - The evaluation category identifier
   * @param status - The vote limit status from backend response
   * @returns void
   * @private Internal method - updated via vote operations
   * @memberof EvaluationStateService
   * @since 2.0.0
   */
  private updateVoteLimitStatus(categoryId: number, status: VoteLimitStatusDTO): void {
    // Backend now provides correct 10-vote system directly - no scaling needed
    const currentStatusMap = new Map(this.voteLimitStatusSubject.value);
    currentStatusMap.set(categoryId, status);
    this.voteLimitStatusSubject.next(currentStatusMap);
  }


  /**
   * Gets vote limit status for a specific category (internal use)
   *
   * @param categoryId - The category ID
   * @returns The vote limit status or null if not available
   * @private Internal method - use voteLimitStatus$ observable instead
   */
  private getVoteLimitStatusForCategory(categoryId: number): VoteLimitStatusDTO | null {
    return this.voteLimitStatusSubject.value.get(categoryId) || null;
  }

  // =============================================================================
  // COMMENT STATUS MANAGEMENT (NEW FUNCTIONALITY)
  // =============================================================================

  /**
   * Observable for category comment status tracking
   * Maps categoryId to boolean indicating if user has submitted first comment
   */
  get categoryCommentStatus$(): Observable<Map<number, boolean>> {
    return this.categoryCommentStatusSubject.asObservable();
  }

  /**
   * Checks if user has submitted the initial comment for a specific category
   * 
   * @param categoryId - The category ID to check
   * @returns Observable<boolean> indicating if user has commented in this category
   */
  hasCommentedInCategory$(categoryId: number): Observable<boolean> {
    return this.categoryCommentStatus$.pipe(
      map(statusMap => statusMap.get(categoryId) || false),
      distinctUntilChanged()
    );
  }

  /**
   * Marks a category as commented and persists to localStorage
   * 
   * @param categoryId - The category ID to mark as commented
   * @param submissionId - The submission ID for storage key
   */
  markCategoryAsCommented(categoryId: number, submissionId: string): void {
    // Update in-memory state
    const currentStatusMap = new Map(this.categoryCommentStatusSubject.value);
    currentStatusMap.set(categoryId, true);
    this.categoryCommentStatusSubject.next(currentStatusMap);

    // Persist to localStorage
    this.saveCommentStatusToStorage(submissionId, categoryId);
  }

  // loadCommentStatusFromStorage() removed - redundant (comment status loaded from backend in loadSubmission())

  /**
   * Saves comment status to localStorage
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID to add
   */
  private saveCommentStatusToStorage(submissionId: string, categoryId: number): void {
    try {
      const storageKey = `${this.commentStatusStorageKey}_${submissionId}`;
      const existingData = localStorage.getItem(storageKey);
      
      let commentedCategories: number[] = [];
      if (existingData) {
        commentedCategories = JSON.parse(existingData);
      }
      
      // Add new category if not already present
      if (!commentedCategories.includes(categoryId)) {
        commentedCategories.push(categoryId);
        localStorage.setItem(storageKey, JSON.stringify(commentedCategories));
      }
    } catch (error) {
      this.log.error('❌ Failed to save comment status to storage:', error);
    }
  }

  // hasCommentedInCategorySync() and clearCommentStatus() removed - unused

  /**
   * Enhanced vote method that integrates with the new backend API
   * 
   * @param commentId - The comment ID to vote on
   * @param voteType - The vote type
   * @param categoryId - The category ID
   * @returns Observable with vote limit response
   */
  voteCommentWithEnhancedLimits(
    commentId: string, 
    voteType: 'UP' | null, 
    categoryId: number
  ): Observable<VoteLimitResponseDTO> {
    const isAdding = voteType !== null;
    
    // Optimistic update for immediate UI feedback
    this.updateVoteLimitState(categoryId, isAdding, Number(commentId));
    return this.evaluationService.voteCommentWithLimits(commentId, voteType).pipe(
      tap(response => {
        // Update vote limit status from backend response
        if (response.voteLimitStatus) {
          this.updateVoteLimitStatus(categoryId, response.voteLimitStatus);
          this.log.info(' Updated vote limit status from backend:', response.voteLimitStatus);
        } else {
          // 🚀 FALLBACK SYNC: If backend doesn't provide voteLimitStatus, load it explicitly
          const submissionId = this.submissionSubject.value?.id;
          if (submissionId) {
            this.loadVoteLimitStatus(String(submissionId), categoryId).pipe(
              takeUntil(this.destroy$)
            ).subscribe({
              next: () => this.log.info(' Fallback vote limit status loaded successfully'),
              error: (error) => this.log.error('❌ Fallback vote limit status loading failed:', error)
            });
          }
        }

      }),
      catchError(error => {
        // FIXED: Rollback optimistic update on error (opposite of original action)
        this.updateVoteLimitState(categoryId, !isAdding, Number(commentId));
        this.log.error('❌ Failed to vote with enhanced limits, rolling back optimistic update:', error);
        throw error;
      })
    );
  }

  // resetCategoryVotes() removed - unused

  // =============================================================================
  // PUBLIC STATE ACCESSORS (for Facade compatibility)
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
   *
   * @returns The current active category ID or null if not set
   */
  getCurrentActiveCategory(): number | null {
    return this.activeCategorySubject.value;
  }

  /**
   * Gets the current anonymous user synchronously
   *
   * @returns The current anonymous user or null if not loaded
   */
  getCurrentAnonymousUser(): AnonymousEvaluationUserDTO | null {
    return this.anonymousUserSubject.value;
  }

  // =============================================================================
  // SUBMISSION LIST MANAGEMENT FOR NAVIGATION - REMOVED
  // =============================================================================
  // Navigation functionality moved to EvaluationNavigationService
  // Use navigationService.navigateToAdjacentSubmission() instead
}
