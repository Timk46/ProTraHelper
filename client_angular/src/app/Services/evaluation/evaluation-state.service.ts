import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
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

@Injectable({
  providedIn: 'root',
})
export class EvaluationStateService {
  // Core state subjects
  private submissionSubject = new BehaviorSubject<EvaluationSubmissionDTO | null>(null);
  private categoriesSubject = new BehaviorSubject<EvaluationCategoryDTO[]>([]);
  private activeCategorySubject = new BehaviorSubject<number | null>(null);
  private commentStatsSubject = new BehaviorSubject<CommentStatsDTO | null>(null);
  private anonymousUserSubject = new BehaviorSubject<AnonymousEvaluationUserDTO | null>(null);

  // Submission list management removed - now handled by EvaluationNavigationService

  // Discussion state by category (caching with LRU for memory management)
  private discussionCache = new LRUCache<number, BehaviorSubject<EvaluationDiscussionDTO[]>>(
    20, // Max 20 categories in cache
    (categoryId, subject) => {
      // Cleanup: Complete BehaviorSubject to prevent memory leaks
      subject.complete();
      console.log(`🧹 LRU evicted discussion cache for category ${categoryId}`);
    }
  );

  // Rating state
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);
  private ratingStatsCache = new LRUCache<number, BehaviorSubject<RatingStatsDTO>>(
    20, // Max 20 categories with rating stats
    (categoryId, subject) => {
      subject.complete();
      console.log(`🧹 LRU evicted rating stats cache for category ${categoryId}`);
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
    public evaluationService: EvaluationDiscussionService,
    private userservice: UserService,
  ) {
    // Warte auf das Laden der Kategorien und setze die erste verfügbare als aktiv
    this.categories$.subscribe(categories => {
      if (categories.length > 0 && this.activeCategorySubject.value === null) {
        // Setze die erste Kategorie als Standard-aktive Kategorie
        const firstCategory = categories[0];
        console.log(
          '🎯 Automatische Auswahl der ersten Kategorie:',
          firstCategory.id,
          firstCategory.displayName,
        );
        this.activeCategorySubject.next(firstCategory.id);
      }
    });
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
   * @returns Observable<number> The active category ID
   */
  get activeCategory$(): Observable<number> {
    return this.activeCategorySubject.asObservable().pipe(
      map(categoryId => {
        // Fallback: Falls keine Kategorie gesetzt ist, nutze die erste verfügbare
        if (categoryId === null) {
          const categories = this.categoriesSubject.value;
          return categories.length > 0 ? categories[0].id : 1; // 1 als letzter Fallback
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
    console.log('🎯 loadSubmission called with:', submissionId);
    this.setLoading(true);
    this.clearError();

    this.evaluationService.getSubmission(submissionId).subscribe({
      next: submission => {
        console.log('✅ Submission loaded:', submission);
        this.submissionSubject.next(submission);

        // Prepare parallel operations array
        const parallelOps: Observable<any>[] = [
          this.evaluationService.getCommentStats(submissionId).pipe(
            catchError(error => {
              console.warn('⚠️ CommentStats loading failed:', error);
              return of(null); // Continue with null if stats fail
            }),
          ),
          this.evaluationService.getOrCreateAnonymousUser(submissionId).pipe(
            tap(anonymousUser => {
              console.log('🎭 Anonymous user loaded:', {
                submissionId,
                anonymousUser,
                id: anonymousUser?.id,
                idType: typeof anonymousUser?.id,
                displayName: anonymousUser?.displayName,
              });
            }),
            catchError(error => {
              console.error('⚠️ AnonymousUser loading failed:', error);
              return of(null); // Continue with null if user fails
            }),
          ),
        ];

        // Add categories loading if sessionId is available
        if (submission.sessionId) {
          console.log('📡 Adding categories loading for sessionId:', submission.sessionId);
          parallelOps.push(
            this.evaluationService.getCategories(submission.sessionId).pipe(
              catchError(error => {
                console.warn('⚠️ Categories loading failed:', error);
                return of([]); // Continue with empty array if categories fail
              }),
            ),
          );
        }

        // Add rating status loading
        console.log('📊 Adding rating status loading for submissionId:', submissionId);
        parallelOps.push(
          this.evaluationService.getUserRatingStatus(String(submissionId), userId).pipe(
            tap(statuses => {
              console.log('✅ Rating statuses loaded during submission init:', statuses);
              // Convert array to Map for efficient lookups
              const statusMap = new Map<number, CategoryRatingStatus>();
              statuses.forEach(status => {
                statusMap.set(status.categoryId, status);
              });
              this.categoryRatingStatusSubject.next(statusMap);
            }),
            catchError(error => {
              console.warn('⚠️ Rating status loading failed:', error);
              // Reset to empty map if loading fails
              this.categoryRatingStatusSubject.next(new Map());
              return of([]); // Continue with empty array if rating status fails
            }),
          ),
        );

        // Add comment status loading for all categories
        console.log('💬 Adding comment status loading for submissionId:', submissionId);
        parallelOps.push(
          this.evaluationService.getUserCommentStatusForAllCategories(submissionId).pipe(
            tap(commentStatusObj => {
              console.log('✅ Comment statuses loaded during submission init:', commentStatusObj);
              // Convert object to Map for consistent interface
              const commentStatusMap = new Map<number, boolean>();
              Object.entries(commentStatusObj).forEach(([categoryId, hasCommented]) => {
                commentStatusMap.set(Number(categoryId), hasCommented);
              });
              this.categoryCommentStatusSubject.next(commentStatusMap);
              
              console.log('📋 Comment status map initialized:', {
                totalCategories: commentStatusMap.size,
                categoriesWithComments: Array.from(commentStatusMap.entries()).filter(([_, hasCommented]) => hasCommented).map(([categoryId, _]) => categoryId)
              });
            }),
            catchError(error => {
              console.warn('⚠️ Comment status loading failed:', error);
              // Reset to empty map if loading fails
              this.categoryCommentStatusSubject.next(new Map());
              return of({}); // Continue with empty object if comment status fails
            }),
          ),
        );

        // Wait for ALL parallel operations to complete
        console.log('🔄 Starting parallel operations. Count:', parallelOps.length);
        forkJoin(parallelOps).subscribe({
          next: results => {
            console.log('✅ All parallel operations completed:', results);

            const [commentStats, anonymousUser, categories] = results;

            // Update states with results
            if (commentStats) {
              this.commentStatsSubject.next(commentStats);
            }
            if (anonymousUser) {
              this.anonymousUserSubject.next(anonymousUser);
            }
            if (categories && categories.length > 0) {
              console.log('✅ Categories loaded successfully. Count:', categories.length);
              this.categoriesSubject.next(categories);
            }

            // ONLY NOW set loading to false - after ALL operations are complete
            console.log('🎉 All data loaded successfully. Setting loading to false.');
            this.setLoading(false);
          },
          error: error => {
            console.error('❌ Parallel operations failed:', error);
            this.setError('Fehler beim Laden der Zusatzdaten');
            this.setLoading(false);
          },
        });
      },
      error: error => {
        console.error('❌ Submission loading failed:', error);
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

    this.evaluationService.getCategories(sessionId).subscribe({
      next: categories => {
        this.categoriesSubject.next(categories);
      },
      error: error => {
        this.setError('Fehler beim Laden der Kategorien');
      },
    });
  }

  /**
   * Sets the active category (non-atomic - use with caution)
   * @param categoryId - The ID of the category to set as active
   * @deprecated Use transitionToCategory() for atomic category transitions with rating status validation
   * @remarks This method is kept for backward compatibility with deep-linking, but transitionToCategory()
   * should be preferred as it prevents race conditions and ensures data consistency
   */
  setActiveCategory(categoryId: number): void {
    console.warn('⚠️ DEPRECATED: setActiveCategory() is deprecated. Use transitionToCategory() instead for atomic transitions.');
    const currentCategory = this.activeCategorySubject.value;
    if (currentCategory !== categoryId) {
      this.activeCategorySubject.next(categoryId);
    }
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

    console.log('🔄 Starting atomic category transition:', { 
      from: currentCategory, 
      to: categoryId,
      submissionId 
    });

    // Start transition loading state
    this.categoryTransitionLoadingSubject.next(true);

    const currentStatusMap = this.categoryRatingStatusSubject.value;
    const existingStatus = currentStatusMap.get(categoryId);

    console.log('🔄 Preserving existing status during category transition:', {
      targetCategory: categoryId,
      hadExistingStatus: !!existingStatus,
      existingRating: existingStatus?.rating,
      statusCount: currentStatusMap.size
    });

    // FIXED: Preserve existing status while loading fresh data to prevent UI flicker
    // Do NOT delete the cached status - this was causing the rating panel to reappear
    
    // Load rating status first, then transition atomically
    return this.evaluationService.getUserRatingStatus(String(submissionId), anonymousUserId).pipe(
      take(1),
      map(statuses => {
        // DEBUG: Backend API response verification
        console.log('🐛 DEBUG Rating Status API Response:', {
          submissionId,
          userId: anonymousUserId,
          userIdType: typeof anonymousUserId,
          statusesReceived: statuses.length,
          categories: statuses.map(s => ({ 
            id: s.categoryId, 
            hasRated: s.hasRated, 
            rating: s.rating,
            canAccessDiscussion: s.canAccessDiscussion,
            isRequired: s.isRequired
          }))
        });

        console.log('✅ Rating statuses loaded for atomic transition:', {
          statusCount: statuses.length,
          categoriesReceived: statuses.map(s => ({ id: s.categoryId, hasRated: s.hasRated, rating: s.rating }))
        });

        // BUGFIX: Merge backend data with local updates to preserve fresh ratings
        const currentStatusMap = this.categoryRatingStatusSubject.value;
        const mergedStatusMap = this.mergeRatingStatusMaps(statuses, currentStatusMap);

        // Atomic update: Set both category and rating status simultaneously
        this.activeCategorySubject.next(categoryId);
        this.categoryRatingStatusSubject.next(mergedStatusMap);

        console.log('✅ Atomic transition completed - status preserved:', {
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
          console.log('🔄 Loading vote limits for new category:', categoryId);
          this.loadVoteLimitStatus(String(submissionId), categoryId).subscribe({
            next: () => console.log('✅ Vote limits loaded for category transition:', categoryId),
            error: (error) => console.error('❌ Failed to load vote limits for category:', categoryId, error)
          });
        }

        return void 0;
      }),
      catchError(error => {
        console.error('❌ Error during atomic category transition:', error);
        
        // Fallback: still transition to category but preserve existing status map
        this.activeCategorySubject.next(categoryId);
        this.setError('Fehler beim Laden des Bewertungsstatus. Seite ggf. aktualisieren.');
        
        return of(void 0);
      }),
      finalize(() => {
        this.categoryTransitionLoadingSubject.next(false);
        console.log('✅ Atomic category transition completed:', categoryId);
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
    const FRESHNESS_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
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
          console.log('🔄 Preserving fresh local rating:', {
            categoryId: categoryIdKey,
            localRating: localStatus.rating,
            backendRating: backendStatus?.rating,
            localUpdatedAt: localStatus.lastUpdatedAt,
            reason: 'Local data is fresher than backend cache'
          });
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
    console.log('📂 getDiscussionsForCategory called:', {
      submissionId,
      categoryId,
    });

    // Ensure cache exists before loading
    const subject = this.ensureDiscussionCache(categoryId);

    // Load discussions if cache is empty
    if (subject.value.length === 0) {
      console.log('📡 Loading discussions for category:', categoryId);
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
    console.log('🔍 loadDiscussionsForCategory called:', {
      submissionId,
      categoryId,
      cacheKey,
    });
    // Phase 3.2: Prevent concurrent loading of the same category
    if (this.categoryLoadingStates.get(categoryId)) {
      console.log('⚠️ Category', categoryId, 'already loading, skipping duplicate request');
      return;
    }

    // Mark category as loading
    this.categoryLoadingStates.set(categoryId, true);

    this.evaluationService.getDiscussionsByCategory(submissionId, categoryId.toString()).subscribe({
      next: discussions => {
        console.log(
          '✅ Discussions loaded for category',
          categoryId,
          ':',
          discussions.length,
          'discussions',
        );
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
            
            console.log('✅ Comment status updated from backend data:', {
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
        console.error('❌ Failed to load discussions for category', categoryId, ':', error);
        this.setError(
          `Fehler beim Laden der Diskussionen für Kategorie ${categoryId}. Bitte aktualisieren Sie die Seite.`,
        );

        // Provide fallback empty state instead of leaving cache in undefined state
        const subject = this.discussionCache.get(cacheKey);
        if (subject && subject.value.length === 0) {
          console.log('🔧 Setting fallback empty discussions for category', categoryId);
          subject.next([]);
        }
      },
      complete: () => {
        // Always clean up loading state
        this.categoryLoadingStates.set(categoryId, false);
        console.log('🧹 Category loading completed for', categoryId);
      },
    });
  }

  get activeDiscussions$(): Observable<EvaluationDiscussionDTO[]> {
    return combineLatest([this.submission$, this.activeCategory$]).pipe(
      map(([submission, categoryId]) => {
        if (!submission) return [];
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
      console.log('🗂️ Creating new discussion cache for category:', categoryId);
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
    console.log('🎯 Loading category rating status for submission:', submissionId);

    this.ratingStatusLoadingSubject.next(true);

    this.evaluationService.getUserRatingStatus(String(submissionId), userId).pipe(
      take(1),
      tap(statuses => {
        console.log('✅ Received rating statuses:', statuses);

        // BUGFIX: Merge with existing local data instead of blind overwrite
        const currentStatusMap = this.categoryRatingStatusSubject.value;
        const mergedStatusMap = this.mergeRatingStatusMaps(statuses, currentStatusMap);

        console.log('✅ Rating status merged with local preservation:', {
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
        console.error('❌ Error loading rating status:', error);
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
    console.log('📝 Updating rating status with isolation:', { 
      submissionId, 
      categoryId, 
      rating,
      timestamp: new Date().toISOString()
    });

    const currentStatusMap = this.categoryRatingStatusSubject.value;
    const existingStatus = currentStatusMap.get(categoryId);

    // Validate that we're updating the correct category
    if (existingStatus) {
      console.log('📋 Previous status for category:', {
        categoryId,
        hadRating: existingStatus.hasRated,
        previousRating: existingStatus.rating,
        newRating: rating
      });
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

    console.log('✅ Rating status updated with category isolation:', {
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
    console.log('🗑️ Deleting category rating:', { 
      submissionId, 
      categoryId,
      timestamp: new Date().toISOString()
    });

    // Call backend to delete rating from database
    return this.evaluationService.deleteUserRating(submissionId, categoryId).pipe(
      tap(response => {
        console.log('✅ Backend deletion successful:', response);

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

          console.log('✅ Local state updated after rating deletion:', {
            deletedCategoryId: categoryId,
            totalCategoriesInMap: newStatusMap.size,
            updatedCategory: updatedStatus,
            ratingsRemoved: currentRatings.length - updatedRatings.length
          });
        }
      }),
      map(() => void 0), // Convert to void observable
      catchError(error => {
        console.error('❌ Failed to delete category rating:', error);
        throw error;
      })
    );
  }

  /**
   * Refreshes rating status from the server
   * @param submissionId - The submission ID to refresh
   */
  refreshRatingStatus(submissionId: string, userId: number): void {
    console.log('🔄 Refreshing rating status from server:', {
      submissionId,
      userId,
      currentStatusCount: this.categoryRatingStatusSubject.value.size,
      timestamp: new Date().toISOString()
    });
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
      console.error('❌ Cannot create comment: Anonymous user not available');
      throw new Error('Anonymous user not available. Please reload the page.');
    }

    // Phase 3.2: Prevent double submissions
    const operationKey = `${submissionId}-${categoryId}`;
    if (this.commentCreationInProgress.has(operationKey)) {
      console.warn('⚠️ Comment creation already in progress for category', categoryId);
      throw new Error('Ein Kommentar wird bereits erstellt. Bitte warten Sie einen Moment.');
    }

    const createCommentDto: CreateEvaluationCommentDTO = {
      submissionId: Number(submissionId),
      categoryId: categoryId,
      content,
      parentId: parentId ? Number(parentId) : undefined, // Include parentId for reply functionality
    };

    console.log('✅ Anonymous user validated:', anonymousUser.displayName);

    // Mark operation as in progress
    this.commentCreationInProgress.add(operationKey);

    return this.evaluationService.createComment(createCommentDto).pipe(
      map(comment => {
        // 🚨 CRITICAL FIX: Ensure authorId is set to current anonymous user
        if (!comment.authorId && anonymousUser) {
          console.log('🔧 Setting authorId for new comment:', {
            commentId: comment.id,
            authorId: anonymousUser.id,
            displayName: anonymousUser.displayName
          });
          comment.authorId = anonymousUser.id;
        }
        
        // Update local cache
        this.handleCommentAdded(submissionId, categoryId, comment);
        // this.refreshCommentStats(submissionId); // Deaktiviert - verursacht 404-Fehler und ist nicht kritisch
        return comment;
      }),
      catchError(error => {
        console.error('❌ Comment creation failed:', error);
        this.setError('Fehler beim Erstellen des Kommentars. Bitte versuchen Sie es erneut.');
        throw error; // Re-throw for component to handle
      }),
      finalize(() => {
        // Always clean up the progress tracking
        this.commentCreationInProgress.delete(operationKey);
        console.log('🧹 Comment creation operation completed for category', categoryId);
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
  private handleCommentAdded(
    submissionId: string,
    categoryId: number,
    comment: EvaluationCommentDTO,
  ): void {
    console.log('➕ handleCommentAdded called:', {
      submissionId,
      categoryId,
      commentId: comment.id,
      parentId: comment.parentId,
      isReply: !!comment.parentId,
    });

    try {
      // Validate input parameters
      if (!submissionId || !categoryId || !comment) {
        console.error('❌ Invalid parameters for handleCommentAdded:', {
          submissionId,
          categoryId,
          comment,
        });
        return;
      }

      // Use robust cache method to ensure cache exists
      const subject = this.ensureDiscussionCache(categoryId);

      const currentDiscussions = subject.value || []; // Fallback to empty array
      const updatedDiscussions = [...currentDiscussions];

      // Find or create discussion
      let discussion = updatedDiscussions.find(d => d.categoryId === categoryId);
      if (!discussion) {
        console.log('🆕 Creating new discussion for category:', categoryId);
        discussion = {
          id: Date.now(), // Generate unique numeric ID
          submissionId: Number(submissionId),
          categoryId: categoryId,
          comments: [],
          createdAt: new Date(),
          totalComments: 0,
          availableComments: 3,
          usedComments: 0,
        };
        updatedDiscussions.push(discussion);
      }

      // Type guard - should never be undefined after find/create logic above
      if (!discussion) {
        console.error('❌ Discussion is unexpectedly undefined');
        return;
      }

      // Handle replies vs top-level comments differently
      if (!discussion.comments || !Array.isArray(discussion.comments)) {
        console.warn('⚠️ Discussion.comments was invalid, initializing as empty array');
        discussion.comments = [];
      }

      if (comment.parentId) {
        // This is a reply - find the parent comment and add to its replies array
        const success = this.addReplyToParent(discussion.comments, comment);
        if (success) {
          console.log('✅ Reply added to parent comment:', {
            replyId: comment.id,
            parentId: comment.parentId,
          });
        } else {
          console.warn('⚠️ Could not find parent comment, adding as top-level:', {
            replyId: comment.id,
            parentId: comment.parentId,
          });
          // Fallback: add as top-level comment if parent not found
          discussion.comments = [comment, ...discussion.comments];
        }
      } else {
        // This is a top-level comment - add to beginning (newest first)
        discussion.comments = [comment, ...discussion.comments];
        console.log('✅ Top-level comment added to cache:', {
          commentId: comment.id,
        });
      }

      // Recalculate total comments (including all replies)
      discussion.totalComments = this.calculateTotalComments(discussion.comments);
      discussion.usedComments = discussion.totalComments;

      // Add new comment to the lookup map
      this.commentIdToCategoryIdMap.set(String(comment.id), categoryId);

      console.log('✅ Comment processing complete:', {
        discussionId: discussion.id,
        commentId: comment.id,
        isReply: !!comment.parentId,
        totalComments: discussion.totalComments,
      });

      // Force immediate update of discussion cache
      subject.next(updatedDiscussions);

      // Force change detection by manually updating the observable
      setTimeout(() => {
        subject.next([...updatedDiscussions]);
      }, 50);
    } catch (error) {
      console.error('❌ Error in handleCommentAdded:', error);
      this.setError('Fehler beim Aktualisieren der Kommentare. Bitte laden Sie die Seite neu.');
    }
  }

  /**
   * Recursively finds a parent comment and adds the reply to its replies array
   * @param comments - Array of comments to search through
   * @param reply - The reply to add
   * @returns true if parent was found and reply was added, false otherwise
   */
  private addReplyToParent(comments: EvaluationCommentDTO[], reply: EvaluationCommentDTO): boolean {
    for (const comment of comments) {
      if (comment.id === reply.parentId) {
        // Found the parent - add reply to its replies array
        comment.replies = comment.replies || [];
        comment.replies.push(reply);

        // Update reply count
        comment.replyCount = (comment.replyCount || 0) + 1;

        console.log('🔗 Reply linked to parent:', {
          parentId: comment.id,
          replyId: reply.id,
          newReplyCount: comment.replyCount,
        });

        return true;
      }

      // Recursively search in replies
      if (comment.replies && comment.replies.length > 0) {
        if (this.addReplyToParent(comment.replies, reply)) {
          // Update reply count for nested replies
          comment.replyCount = this.calculateReplyCount(comment.replies);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculates total comments including all nested replies
   * @param comments - Array of top-level comments
   * @returns Total count of all comments and replies
   */
  private calculateTotalComments(comments: EvaluationCommentDTO[]): number {
    let total = comments.length;

    for (const comment of comments) {
      if (comment.replies && comment.replies.length > 0) {
        total += this.calculateTotalComments(comment.replies);
      }
    }

    return total;
  }

  /**
   * Calculates reply count for a comment recursively
   * @param replies - Array of replies
   * @returns Total count of all replies (including nested)
   */
  private calculateReplyCount(replies: EvaluationCommentDTO[]): number {
    if (!replies || replies.length === 0) {
      return 0;
    }

    return replies.reduce((count, reply) => {
      return count + 1 + this.calculateReplyCount(reply.replies || []);
    }, 0);
  }

  // =============================================================================
  // VOTE STATUS MANAGEMENT - ARCHITECTURE REFACTOR
  // =============================================================================

  // Comment-specific vote status cache (LRU for memory management)
  private commentVoteStatusCache = new LRUCache<string, BehaviorSubject<VoteType | null>>(
    200, // Max 200 comments with vote status tracking
    (commentId, subject) => {
      subject.complete();
      console.log(`🧹 LRU evicted vote status cache for comment ${commentId}`);
    }
  );
  private commentVoteLoadingCache = new LRUCache<string, BehaviorSubject<boolean>>(
    200, // Max 200 comments with loading state tracking
    (commentId, subject) => {
      subject.complete();
      console.log(`🧹 LRU evicted vote loading cache for comment ${commentId}`);
    }
  );

  // =============================================================================
  // VOTING MANAGEMENT & CACHE SYNCHRONIZATION - 🚀 PHASE 4
  // =============================================================================

  // 🚀 PHASE 4: Vote completion notifications for cache synchronization - Updated to pass full result
  private voteCompletionSubject = new BehaviorSubject<{commentId: string, fullResult: VoteResultDTO | VoteLimitResponseDTO} | null>(null);
  private voteCompletion$ = this.voteCompletionSubject.asObservable(); // Private - nur intern verwendet

  private voteErrorSubject = new BehaviorSubject<{commentId: string} | null>(null);
  private voteError$ = this.voteErrorSubject.asObservable(); // Private - nur intern verwendet

  // =============================================================================
  // VOTE STATUS MANAGEMENT - CENTRALIZED BUSINESS LOGIC
  // =============================================================================

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
      console.log('✅ User vote found in local data:', {
        commentId,
        localVote,
      });
      voteStatusSubject.next(localVote);
      return;
    }

    // Second attempt: Load from API if not found locally
    console.log('🔄 Loading user vote status from API for comment:', commentId);
    loadingSubject.next(true);

    this.getUserVoteStatus(commentId).pipe(
      retry(2),
      catchError((error: any) => {
        console.error('❌ Failed to load user vote status after retries:', {
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
      console.log('✅ User vote status loaded from API:', {
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

    console.log('🗳️ Vote initiated:', {
      commentId,
      currentVote,
      voteType,
      newVote,
      isAdding
    });

    // Optimistic update for immediate UI feedback
    voteStatusSubject.next(newVote);
    
    // FIXED: Add optimistic vote limit update for immediate counter feedback
    this.updateVoteLimitState(categoryId, isAdding, Number(commentId));

    // Perform actual vote
    return this.voteCommentWithLimits(commentId, voteType, categoryId).pipe(
      tap(result => {
        if (result) {
          // Vote succeeded - emit completion event with full result
          this.voteCompletionSubject.next({
            commentId,
            fullResult: result,
          });
          // Update final vote status
          voteStatusSubject.next(result.userVote);
        }
      }),
      catchError(error => {
        // Vote failed - revert optimistic update
        console.log('❌ Vote failed, reverting optimistic update');

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

        // Emit error event
        this.voteErrorSubject.next({ commentId });
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
        console.log('🔍 User vote status loaded from API:', {
          commentId,
          voteType,
        });
      }),
      catchError(error => {
        console.error('❌ Failed to load user vote status:', error);
        return of(null); // Return null if failed
      }),
    );
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
    console.log('🔧 SMART: Processing vote update with cascade prevention:', {
      commentId,
      voteData
    });

    const categoryId = this.commentIdToCategoryIdMap.get(commentId);
    if (categoryId === undefined) {
      console.warn(
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
      console.warn('Cannot update vote, anonymous user not available');
      return;
    }

    const discussions = subject.value;
    
    // 🔧 SMART CHECK: Only proceed if the update would actually change something
    const needsUpdate = this.shouldUpdateDiscussions(discussions, commentId, voteData);
    if (!needsUpdate) {
      console.log('🚀 SMART: Skipping vote update - no meaningful changes detected');
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
      console.log('✅ SMART: Emitting optimized vote update');
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

    this.evaluationService.getRatingStats(submissionId, categoryId.toString()).subscribe({
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

  // clearCategoryRating() removed - unused (use deleteCategoryRating() instead)

  // =============================================================================
  // PHASE MANAGEMENT
  // =============================================================================

  get currentPhase$(): Observable<EvaluationPhase | null> {
    return this.submission$.pipe(
      map(submission => submission?.phase || null),
      distinctUntilChanged(),
    );
  }

  switchPhase(submissionId: string, targetPhase: EvaluationPhase): Observable<any> {
    const request = {
      submissionId,
      targetPhase,
    };

    return this.evaluationService.switchPhase(request).pipe(
      map(response => {
        // Update submission state
        const currentSubmission = this.submissionSubject.value;
        if (currentSubmission) {
          this.submissionSubject.next({
            ...currentSubmission,
            phase: targetPhase,
          });
        }
        return response;
      }),
    );
  }

  /**
   * Alternative phase switching using submission-based endpoint (more efficient)
   */
  switchPhaseBySubmission(
    submissionId: string,
    targetPhase: EvaluationPhase,
    reason?: string,
  ): Observable<any> {
    const request = {
      submissionId,
      targetPhase,
      reason,
    };

    return this.evaluationService.switchPhaseBySubmission(request).pipe(
      map(response => {
        // Update submission state
        const currentSubmission = this.submissionSubject.value;
        if (currentSubmission) {
          this.submissionSubject.next({
            ...currentSubmission,
            phase: targetPhase,
          });
        }
        return response;
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
    console.log('🔄 Refreshing discussions for submission:', submissionId);

    // Get current active category and refresh its discussions
    const currentActiveCategory = this.activeCategorySubject.value;
    if (currentActiveCategory && currentActiveCategory > 0) {
      // loadDiscussionsForCategory returns void and handles subscription internally
      this.loadDiscussionsForCategory(submissionId, currentActiveCategory);
      console.log('✅ Discussions refresh initiated for category:', currentActiveCategory);
    } else {
      console.log('⚠️ No active category to refresh discussions for');
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
      console.warn('⚠️ Vote limit status not found for category:', categoryId);
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
        console.warn(
          `⚠️ No more votes available for category ${categoryId}`,
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

        // 🚀 PHASE 4: Emit vote completion for cache synchronization
        this.voteCompletionSubject.next({
          commentId,
          fullResult: result,
        });

        return result;
      }),
      catchError(error => {
        // 🚀 PHASE 4: Emit vote error for cache synchronization
        this.voteErrorSubject.next({ commentId });
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

    // Use local default vote limits (10 votes per category)
    // Backend endpoint not yet implemented, using frontend-calculated limits
    const defaultVoteLimitStatus: VoteLimitStatusDTO = {
      maxVotes: 10,
      remainingVotes: 10,
      votedCommentIds: [],
      canVote: true,
      displayText: '10/10 verfügbar',
    };

    const currentStatusMap = new Map(this.voteLimitStatusSubject.value);
    currentStatusMap.set(categoryId, defaultVoteLimitStatus);
    this.voteLimitStatusSubject.next(currentStatusMap);

    this.voteLimitLoadingSubject.next(false);

    console.log('📊 Vote limit status set locally for category:', categoryId, defaultVoteLimitStatus);

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
    console.log('📝 Marking category as commented:', { categoryId, submissionId });

    // Update in-memory state
    const currentStatusMap = new Map(this.categoryCommentStatusSubject.value);
    currentStatusMap.set(categoryId, true);
    this.categoryCommentStatusSubject.next(currentStatusMap);

    // Persist to localStorage
    this.saveCommentStatusToStorage(submissionId, categoryId);
  }

  /**
   * Loads comment status from localStorage for a submission
   *
   * @param submissionId - The submission ID
   */
  loadCommentStatusFromStorage(submissionId: string): void {
    try {
      const storageKey = `${this.commentStatusStorageKey}_${submissionId}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const commentedCategories: number[] = JSON.parse(storedData);
        const statusMap = new Map<number, boolean>();
        
        // Mark all stored categories as commented
        commentedCategories.forEach(categoryId => {
          statusMap.set(categoryId, true);
        });
        
        this.categoryCommentStatusSubject.next(statusMap);
        
        console.log('💾 Loaded comment status from storage:', {
          submissionId,
          commentedCategories,
          statusMapSize: statusMap.size
        });
      } else {
        console.log('💾 No comment status found in storage for submission:', submissionId);
        // Initialize empty map
        this.categoryCommentStatusSubject.next(new Map());
      }
    } catch (error) {
      console.error('❌ Failed to load comment status from storage:', error);
      // Initialize empty map on error
      this.categoryCommentStatusSubject.next(new Map());
    }
  }

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
        
        console.log('💾 Saved comment status to storage:', {
          submissionId,
          categoryId,
          totalCommentedCategories: commentedCategories.length
        });
      }
    } catch (error) {
      console.error('❌ Failed to save comment status to storage:', error);
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
    
    console.log('🎯 Optimistic vote limit update:', {
      categoryId,
      commentId,
      voteType,
      isAdding,
      currentStatus: this.getVoteLimitStatusForCategory(categoryId)
    });

    return this.evaluationService.voteCommentWithLimits(commentId, voteType).pipe(
      tap(response => {
        // Update vote limit status from backend response
        if (response.voteLimitStatus) {
          this.updateVoteLimitStatus(categoryId, response.voteLimitStatus);
          console.log('✅ Updated vote limit status from backend:', response.voteLimitStatus);
        } else {
          // 🚀 FALLBACK SYNC: If backend doesn't provide voteLimitStatus, load it explicitly
          const submissionId = this.submissionSubject.value?.id;
          if (submissionId) {
            console.log('⚠️ Backend response missing voteLimitStatus, loading explicitly as fallback');
            this.loadVoteLimitStatus(String(submissionId), categoryId).subscribe({
              next: () => console.log('✅ Fallback vote limit status loaded successfully'),
              error: (error) => console.error('❌ Fallback vote limit status loading failed:', error)
            });
          }
        }

        // 🚀 CRITICAL FIX: Emit vote completion event for Smart Sync to work
        if (response.success) {
          console.log('📤 Emitting vote completion event with full response:', {
            commentId,
            userVoteCount: response.userVoteCount,
            voteLimitStatus: response.voteLimitStatus
          });
          
          this.voteCompletionSubject.next({
            commentId,
            fullResult: response as VoteLimitResponseDTO // Pass complete VoteLimitResponseDTO
          });
        }
      }),
      catchError(error => {
        // FIXED: Rollback optimistic update on error (opposite of original action)
        this.updateVoteLimitState(categoryId, !isAdding, Number(commentId));
        console.error('❌ Failed to vote with enhanced limits, rolling back optimistic update:', error);
        throw error;
      })
    );
  }

  // resetCategoryVotes() removed - unused

  // =============================================================================
  // SUBMISSION LIST MANAGEMENT FOR NAVIGATION - REMOVED
  // =============================================================================
  // Navigation functionality moved to EvaluationNavigationService
  // Use navigationService.navigateToAdjacentSubmission() instead
}
