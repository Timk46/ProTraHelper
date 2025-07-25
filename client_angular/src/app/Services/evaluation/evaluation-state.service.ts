import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  shareReplay,
  switchMap,
  catchError,
  finalize,
  take,
  tap,
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
} from '@DTOs/index';

import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { EvaluationMockDataService } from './evaluation-mock-data.service';

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

  // Discussion state by category (caching)
  private discussionCache = new Map<number, BehaviorSubject<EvaluationDiscussionDTO[]>>();

  // Rating state
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);
  private ratingStatsCache = new Map<number, BehaviorSubject<RatingStatsDTO>>();

  // UI state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Race condition prevention
  private commentCreationInProgress = new Set<string>(); // Track ongoing comment creations by category
  private categoryLoadingStates = new Map<number, boolean>(); // Track loading state per category

  // Vote limits tracking (per category)
  private voteLimitsSubject = new BehaviorSubject<
    Map<number, { plusVotes: number; minusVotes: number }>
  >(new Map());

  // Mock mode state
  private isMockModeActive = false;

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private mockDataService: EvaluationMockDataService,
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
  // MOCK MODE MANAGEMENT
  // =============================================================================

  /**
   * Loads mock data for demonstration purposes
   */
  loadMockData(): void {
    this.isMockModeActive = true;
    this.setLoading(true);
    this.clearError();

    // Load mock submission
    this.mockDataService.getMockSubmission().subscribe(submission => {
      this.submissionSubject.next(submission);

      // Load related mock data
      const categories = this.mockDataService.getMockCategories();
      this.categoriesSubject.next(categories);
      this.initializeVoteLimits(categories);

      // Load mock comment stats
      this.mockDataService.getMockCommentStats().subscribe(stats => {
        this.commentStatsSubject.next(stats);
      });

      // Load mock anonymous user
      const anonymousUser = this.mockDataService.getMockAnonymousUser();
      this.anonymousUserSubject.next(anonymousUser);

      // Load mock vote limits
      this.mockDataService.getMockVoteLimits().subscribe(limits => {
        this.voteLimitsSubject.next(limits);
      });

      this.setLoading(false);
    });
  }

  /**
   * Checks if the service is currently in mock mode
   */
  isMockMode(): boolean {
    return this.isMockModeActive;
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
          return categories.length > 0 ? categories[0].id : 5; // 5 als letzter Fallback
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

  get loading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  get error$(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  get voteLimits$(): Observable<Map<number, { plusVotes: number; minusVotes: number }>> {
    return this.voteLimitsSubject.asObservable();
  }

  // =============================================================================
  // SUBMISSION MANAGEMENT
  // =============================================================================

  loadSubmission(submissionId: string): void {
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
                displayName: anonymousUser?.displayName
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
              this.initializeVoteLimits(categories);
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
        // Initialize vote limits for all categories
        this.initializeVoteLimits(categories);
      },
      error: error => {
        this.setError('Fehler beim Laden der Kategorien');
      },
    });
  }

  /**
   * Sets the active category
   * @param categoryId - The ID of the category to set as active
   */
  setActiveCategory(categoryId: number): void {
    const currentCategory = this.activeCategorySubject.value;
    if (currentCategory !== categoryId) {
      this.activeCategorySubject.next(categoryId);
    }
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
   * Gets discussions for a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Observable<EvaluationDiscussionDTO[]> The discussions for the category
   */
  getDiscussionsForCategory(
    submissionId: string,
    categoryId: number,
  ): Observable<EvaluationDiscussionDTO[]> {
    console.log('📂 getDiscussionsForCategory called:', {
      submissionId,
      categoryId,
      mockMode: this.isMockModeActive,
    });

    if (this.isMockModeActive) {
      // Mock mode - return mock discussions
      return this.mockDataService.getMockDiscussions(categoryId);
    }

    // Real mode - ensure cache exists before loading
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
        return this.getDiscussionsForCategory(submission.id, categoryId);
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
  // COMMENT MANAGEMENT
  // =============================================================================

  /**
   * Adds a comment to a specific category
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param content - The comment content
   * @returns Observable<EvaluationCommentDTO> The created comment
   */
  addComment(
    submissionId: string,
    categoryId: number,
    content: string,
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
      submissionId,
      categoryId: categoryId,
      content,
    };

    console.log('✅ Anonymous user validated:', anonymousUser.displayName);

    // Mark operation as in progress
    this.commentCreationInProgress.add(operationKey);

    return this.evaluationService.createComment(createCommentDto).pipe(
      map(comment => {
        // Update local cache
        this.handleCommentAdded(submissionId, categoryId, comment);
        this.refreshCommentStats(submissionId);
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
          id: `discussion-${submissionId}-${categoryId}`,
          submissionId,
          categoryId: categoryId,
          comments: [],
          createdAt: new Date(),
          totalComments: 0,
          availableComments: 3,
          usedComments: 0,
        };
        updatedDiscussions.push(discussion);
      }

      // Add comment to beginning (newest first) - with defensive programming
      if (!discussion.comments || !Array.isArray(discussion.comments)) {
        console.warn('⚠️ Discussion.comments was invalid, initializing as empty array');
        discussion.comments = [];
      }

      discussion.comments = [comment, ...discussion.comments];
      discussion.totalComments = discussion.comments.length;
      discussion.usedComments = discussion.comments.length;

      console.log(
        '✅ Discussion updated with new comment. Total comments:',
        discussion.totalComments,
      );
      subject.next(updatedDiscussions);
    } catch (error) {
      console.error('❌ Error in handleCommentAdded:', error);
      this.setError('Fehler beim Aktualisieren der Kommentare. Bitte laden Sie die Seite neu.');
    }
  }

  // =============================================================================
  // VOTING MANAGEMENT
  // =============================================================================

  voteComment(commentId: string, voteType: 'UP' | 'DOWN' | null): Observable<any> {
    return this.evaluationService.voteComment(commentId, voteType).pipe(
      map(result => {
        this.handleVoteUpdate(commentId, {
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          userVote: result.userVote,
          netVotes: result.netVotes,
        });
        return result;
      }),
    );
  }

  private handleVoteUpdate(commentId: string, voteData: VoteUpdateData): void {
    // Update all cached discussions
    this.discussionCache.forEach((subject, key) => {
      const discussions = subject.value;
      let updated = false;

      const updatedDiscussions = discussions.map(discussion => ({
        ...discussion,
        comments: discussion.comments.map((comment: any) => {
          if (comment.id === commentId) {
            updated = true;
            return {
              ...comment,
              upvotes: voteData.upvotes,
              downvotes: voteData.downvotes,
              userVote: voteData.userVote,
            };
          }
          return comment;
        }),
      }));

      if (updated) {
        subject.next(updatedDiscussions);
      }
    });
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
        submissionId,
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
      submissionId,
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

  private loadCommentStats(submissionId: string): void {
    this.evaluationService.getCommentStats(submissionId).subscribe({
      next: stats => {
        this.commentStatsSubject.next(stats);
      },
      error: error => {
        this.setError('Fehler beim Laden der Kommentarstatistiken');
      },
    });
  }

  private refreshCommentStats(submissionId: string): void {
    this.loadCommentStats(submissionId);
  }

  get commentStatsForActiveCategory$(): Observable<any> {
    return combineLatest([this.commentStats$, this.activeCategory$]).pipe(
      map(([stats, categoryId]) => {
        if (!stats) return null;
        return stats.categories.find((cat: any) => cat.categoryId === categoryId) || null;
      }),
      distinctUntilChanged(),
    );
  }

  // =============================================================================
  // ANONYMOUS USER MANAGEMENT
  // =============================================================================

  private loadAnonymousUser(submissionId: string): void {
    this.evaluationService.getOrCreateAnonymousUser(submissionId).subscribe({
      next: user => {
        this.anonymousUserSubject.next(user);
      },
      error: error => {
        this.setError('Fehler beim Laden des anonymen Benutzers');
      },
    });
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
  // CACHE MANAGEMENT
  // =============================================================================

  clearCache(): void {
    this.discussionCache.clear();
    this.ratingStatsCache.clear();
  }

  refreshAll(submissionId: string): void {
    this.loadSubmission(submissionId);
    this.clearCache();
    // Categories will be loaded automatically when submission loads
  }

  // =============================================================================
  // REAL-TIME UPDATES
  // =============================================================================

  handleRealtimeUpdate(update: any): void {
    switch (update.type) {
      case 'comment-added':
        this.handleCommentAdded(update.submissionId, update.categoryId, update.comment);
        this.refreshCommentStats(update.submissionId);
        break;
      case 'vote-changed':
        this.handleVoteUpdate(update.commentId, update.voteData);
        break;
      case 'phase-switched':
        this.loadSubmission(update.submissionId);
        break;
      case 'rating-submitted':
        this.refreshRatingStats(update.submissionId, update.categoryId);
        break;
    }
  }

  // =============================================================================
  // VOTE LIMITS MANAGEMENT
  // =============================================================================

  /**
   * Initialize vote limits for all categories (3 plus and 3 minus votes per category)
   */
  initializeVoteLimits(categories: EvaluationCategoryDTO[]): void {
    const limits = new Map<number, { plusVotes: number; minusVotes: number }>();
    categories.forEach(category => {
      limits.set(category.id, { plusVotes: 3, minusVotes: 3 });
    });
    this.voteLimitsSubject.next(limits);
  }

  /**
   * Check if user can vote for a specific category and vote type
   */
  canVote(categoryId: number, voteType: 'UP' | 'DOWN'): boolean {
    const currentLimits = this.voteLimitsSubject.value;
    const categoryLimits = currentLimits.get(categoryId);

    if (!categoryLimits) return false;

    return voteType === 'UP' ? categoryLimits.plusVotes > 0 : categoryLimits.minusVotes > 0;
  }

  /**
   * Get available votes for a specific category
   */
  getAvailableVotes(categoryId: number): { plusVotes: number; minusVotes: number } | null {
    const currentLimits = this.voteLimitsSubject.value;
    return currentLimits.get(categoryId) || null;
  }

  /**
   * Update vote limits after a vote is cast
   */
  private updateVoteLimits(
    categoryId: number,
    voteType: 'UP' | 'DOWN',
    isAddingVote: boolean,
  ): void {
    const currentLimits = new Map(this.voteLimitsSubject.value);
    const categoryLimits = currentLimits.get(categoryId);

    if (!categoryLimits) return;

    const change = isAddingVote ? -1 : 1;

    if (voteType === 'UP') {
      categoryLimits.plusVotes += change;
    } else {
      categoryLimits.minusVotes += change;
    }

    // Ensure limits don't go below 0 or above 3
    categoryLimits.plusVotes = Math.max(0, Math.min(3, categoryLimits.plusVotes));
    categoryLimits.minusVotes = Math.max(0, Math.min(3, categoryLimits.minusVotes));

    currentLimits.set(categoryId, categoryLimits);
    this.voteLimitsSubject.next(currentLimits);
  }

  /**
   * Synchronizes mock vote limits with state service limits
   * Called after each mock vote to keep the display in sync
   */
  private synchronizeMockVoteLimits(): void {
    if (this.isMockModeActive) {
      this.mockDataService.getMockVoteLimits().pipe(
        take(1)
      ).subscribe(mockLimits => {
        console.log('🔄 Synchronizing mock vote limits with state service:', mockLimits);
        this.voteLimitsSubject.next(mockLimits);
      });
    }
  }

  /**
   * Enhanced vote method that updates limits
   */
  voteCommentWithLimits(
    commentId: string,
    voteType: 'UP' | 'DOWN' | null,
    categoryId: number,
  ): Observable<any> {
    if (this.isMockModeActive) {
      // Mock mode - graceful handling without throwing errors
      if (voteType !== null && !this.canVote(categoryId, voteType)) {
        console.warn(`⚠️ No more ${voteType.toLowerCase()} votes available for category ${categoryId}`);
        // Return empty observable to gracefully handle limit reached
        return of(null);
      }

      return this.mockDataService.voteMockComment(commentId, voteType, categoryId).pipe(
        tap(result => {
          if (result) {
            // Synchronize mock vote limits with state service
            this.synchronizeMockVoteLimits();

            // Update comment display
            this.handleVoteUpdate(commentId, {
              upvotes: result.upvotes,
              downvotes: result.downvotes,
              userVote: result.userVote,
              netVotes: result.netVotes,
            });
          }
        })
      );
    }

    // Real mode - graceful handling without throwing errors
    if (voteType !== null && !this.canVote(categoryId, voteType)) {
      console.warn(`⚠️ No more ${voteType.toLowerCase()} votes available for category ${categoryId}`);
      return of(null);
    }

    return this.evaluationService.voteComment(commentId, voteType).pipe(
      map(result => {
        // Update vote limits based on result
        if (result.userVote && voteType) {
          this.updateVoteLimits(categoryId, voteType, true);
        } else if (!result.userVote && voteType === null) {
          // Vote was removed - need to determine which type was removed
          // This would need to be tracked separately or returned from backend
        }

        this.handleVoteUpdate(commentId, {
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          userVote: result.userVote,
          netVotes: result.netVotes,
        });

        return result;
      }),
    );
  }
}
