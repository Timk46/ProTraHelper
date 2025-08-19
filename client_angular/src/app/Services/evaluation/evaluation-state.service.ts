import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of, timer, retry } from 'rxjs';
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
  VoteResultDTO,
  VoteType,
  CategoryRatingStatus,
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
  
  // Category-specific rating status management
  private categoryRatingStatusSubject = new BehaviorSubject<Map<number, CategoryRatingStatus>>(new Map());
  private ratingStatusLoadingSubject = new BehaviorSubject<boolean>(false);

  private commentIdToCategoryIdMap = new Map<string, number>();

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
   * Observable for category-specific rating status
   * Returns a Map where the key is categoryId and value is CategoryRatingStatus
   */
  get categoryRatingStatus$(): Observable<Map<number, CategoryRatingStatus>> {
    return this.categoryRatingStatusSubject.asObservable();
  }

  /**
   * Observable for rating status loading state
   */
  get ratingStatusLoading$(): Observable<boolean> {
    return this.ratingStatusLoadingSubject.asObservable();
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
          this.evaluationService.getUserRatingStatus(submissionId).pipe(
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
            this.commentIdToCategoryIdMap.set(comment.id, categoryId);
          });
        });
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
  // RATING STATUS MANAGEMENT
  // =============================================================================

  /**
   * Loads rating status for all categories of a submission
   * @param submissionId - The submission ID to load rating status for
   */
  loadCategoryRatingStatus(submissionId: string): void {
    console.log('🎯 Loading category rating status for submission:', submissionId);
    
    this.ratingStatusLoadingSubject.next(true);
    
    this.evaluationService.getUserRatingStatus(submissionId).pipe(
      take(1),
      tap(statuses => {
        console.log('✅ Received rating statuses:', statuses);
        
        // Convert array to Map for efficient lookups
        const statusMap = new Map<number, CategoryRatingStatus>();
        statuses.forEach(status => {
          statusMap.set(status.categoryId, status);
        });
        
        this.categoryRatingStatusSubject.next(statusMap);
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
   * @param submissionId - The submission ID
   * @param categoryId - The category ID that was rated
   * @param rating - The rating value submitted
   */
  updateCategoryRatingStatus(submissionId: string, categoryId: number, rating: number): void {
    console.log('📝 Updating rating status:', { submissionId, categoryId, rating });
    
    const currentStatusMap = this.categoryRatingStatusSubject.value;
    const existingStatus = currentStatusMap.get(categoryId);
    
    // Create updated status
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
    
    // Update the map
    const newStatusMap = new Map(currentStatusMap);
    newStatusMap.set(categoryId, updatedStatus);
    
    this.categoryRatingStatusSubject.next(newStatusMap);
    
    console.log('✅ Rating status updated locally');
  }

  /**
   * Refreshes rating status from the server
   * @param submissionId - The submission ID to refresh
   */
  refreshRatingStatus(submissionId: string): void {
    console.log('🔄 Refreshing rating status from server');
    this.loadCategoryRatingStatus(submissionId);
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
      submissionId,
      categoryId: categoryId,
      content,
      parentId, // Include parentId for reply functionality
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
      this.commentIdToCategoryIdMap.set(comment.id, categoryId);

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

  // Comment-specific vote status cache
  private commentVoteStatusCache = new Map<string, BehaviorSubject<VoteType | null>>();
  private commentVoteLoadingCache = new Map<string, BehaviorSubject<boolean>>();

  // =============================================================================
  // VOTING MANAGEMENT & CACHE SYNCHRONIZATION - 🚀 PHASE 4
  // =============================================================================

  // 🚀 PHASE 4: Vote completion notifications for cache synchronization
  private voteCompletionSubject = new BehaviorSubject<{commentId: string, voteResult: VoteType | null} | null>(null);
  voteCompletion$ = this.voteCompletionSubject.asObservable();

  private voteErrorSubject = new BehaviorSubject<{commentId: string} | null>(null);
  voteError$ = this.voteErrorSubject.asObservable();

  // =============================================================================
  // VOTE STATUS MANAGEMENT - CENTRALIZED BUSINESS LOGIC
  // =============================================================================

  /**
   * Gets the complete vote state for a comment including status and loading state
   * This centralizes all vote management business logic previously in components
   *
   * @param commentId - The comment ID
   * @returns Observable with vote status and loading state
   * @memberof EvaluationStateService
   */
  getCommentVoteState$(commentId: string): Observable<{
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
   * Loads user vote status for a comment with fallback system
   * First tries local comment data, then API call if needed
   *
   * @param commentId - The comment ID
   * @memberof EvaluationStateService
   */
  loadUserVoteStatusForComment(commentId: string): void {
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
   * Performs optimistic voting with proper state management
   *
   * @param commentId - The comment ID
   * @param voteType - The vote type ('UP' or 'DOWN')
   * @param categoryId - The category ID for vote limits
   * @returns Observable<VoteResultDTO> - Vote result
   * @memberof EvaluationStateService
   */
  performOptimisticVote(
    commentId: string,
    voteType: VoteType,
    categoryId: number
  ): Observable<VoteResultDTO> {
    // Ensure cache exists
    this.ensureCommentVoteCache(commentId);

    const voteStatusSubject = this.commentVoteStatusCache.get(commentId)!;
    const currentVote = voteStatusSubject.value;
    const newVote = currentVote === voteType ? null : voteType; // Toggle logic

    console.log('🗳️ Vote initiated:', {
      commentId,
      currentVote,
      voteType,
      newVote,
    });

    // Optimistic update for immediate UI feedback
    voteStatusSubject.next(newVote);

    // Perform actual vote
    return this.voteCommentWithLimits(commentId, voteType, categoryId).pipe(
      tap(result => {
        if (result) {
          // Vote succeeded - emit completion event
          this.voteCompletionSubject.next({
            commentId,
            voteResult: result.userVote,
          });
          // Update final vote status
          voteStatusSubject.next(result.userVote);
        }
      }),
      catchError(error => {
        // Vote failed - revert optimistic update
        console.log('❌ Vote failed, reverting optimistic update');

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
        const comment = discussion.comments.find(c => c.id === commentId);
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
    if (this.isMockModeActive) {
      // Mock mode: Check local mock data
      return this.getMockUserVoteStatus(commentId);
    }

    // Real mode: Call backend API
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

  /**
   * Gets user vote status from mock data
   * @param commentId - The comment ID
   * @returns Observable<VoteType> - The user's vote or null
   */
  private getMockUserVoteStatus(commentId: string): Observable<VoteType | null> {
    const anonymousUser = this.anonymousUserSubject.value;
    if (!anonymousUser) {
      return of(null);
    }

    // Find the comment in mock data and check votes
    const category1$ = this.discussionCache.get(1)?.asObservable() || of([]);
    const category2$ = this.discussionCache.get(2)?.asObservable() || of([]);
    const category3$ = this.discussionCache.get(3)?.asObservable() || of([]);
    const category4$ = this.discussionCache.get(4)?.asObservable() || of([]);

    return combineLatest([
      category1$,
      category2$,
      category3$,
      category4$,
    ]).pipe(
      map(([disc1, disc2, disc3, disc4]) => {
        const allComments = [...disc1, ...disc2, ...disc3, ...disc4]
          .flatMap(discussion => discussion.comments);

        const comment = allComments.find(c => c.id === commentId);
        if (!comment) return null;

        const userVote = comment.votes.find(vote => vote.userId === anonymousUser.id);
        return userVote ? userVote.voteType : null;
      }),
    );
  }

  voteComment(commentId: string, voteType: 'UP' | 'DOWN' | null): Observable<VoteResultDTO> {
    return this.evaluationService.voteComment(commentId, voteType).pipe(
      map(result => {
        // Backend now returns result.voteStats structure
        this.handleVoteUpdate(commentId, {
          voteStats: result.voteStats,
          userVote: result.userVote,
          netVotes: result.netVotes,
        });

        // 🚀 PHASE 4: Emit vote completion for cache synchronization
        this.voteCompletionSubject.next({
          commentId,
          voteResult: result.userVote,
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

  private handleVoteUpdate(commentId: string, voteData: VoteUpdateData): void {
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
    const updatedDiscussions = discussions.map(discussion => ({
      ...discussion,
      comments: discussion.comments.map((comment: EvaluationCommentDTO) => {
        if (comment.id === commentId) {
          // Manually update the votes array for immediate UI feedback
          const otherVotes = comment.votes.filter(vote => vote.userId !== anonymousUser.id);

          const newVotes = [...otherVotes];
          if (voteData.userVote) {
            // 'UP' or 'DOWN'
            newVotes.push({
              id: `temp-vote-${Date.now()}`, // Temporary ID for client-side rendering
              userId: anonymousUser.id,
              commentId: comment.id,
              voteType: voteData.userVote,
              createdAt: new Date(),
            });
          }

          return {
            ...comment,
            voteStats: voteData.voteStats,
            votes: newVotes, // Update the votes array
          };
        }
        return comment;
      }),
    }));

    subject.next(updatedDiscussions);
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
    this.commentIdToCategoryIdMap.clear();
  }

  refreshAll(submissionId: string): void {
    this.loadSubmission(submissionId);
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
      this.mockDataService
        .getMockVoteLimits()
        .pipe(take(1))
        .subscribe(mockLimits => {
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
        console.warn(
          `⚠️ No more ${voteType.toLowerCase()} votes available for category ${categoryId}`,
        );
        // Return empty observable to gracefully handle limit reached
        return of(null);
      }

      return this.mockDataService.voteMockComment(commentId, voteType, categoryId).pipe(
        tap(result => {
          if (result) {
            // Synchronize mock vote limits with state service
            this.synchronizeMockVoteLimits();

            // Update comment display - Mock service now returns result.voteStats
            this.handleVoteUpdate(commentId, {
              voteStats: result.voteStats,
              userVote: result.userVote,
              netVotes: result.netVotes,
            });

            // 🚀 PHASE 4: Emit vote completion for cache synchronization
            this.voteCompletionSubject.next({
              commentId,
              voteResult: result.userVote,
            });
          }
        }),
        catchError(error => {
          // 🚀 PHASE 4: Emit vote error for cache synchronization
          this.voteErrorSubject.next({ commentId });
          throw error;
        }),
      );
    }

    // Real mode - graceful handling without throwing errors
    if (voteType !== null && !this.canVote(categoryId, voteType)) {
      console.warn(
        `⚠️ No more ${voteType.toLowerCase()} votes available for category ${categoryId}`,
      );
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

        // Backend now returns result.voteStats structure
        this.handleVoteUpdate(commentId, {
          voteStats: result.voteStats,
          userVote: result.userVote,
          netVotes: result.netVotes,
        });

        // 🚀 PHASE 4: Emit vote completion for cache synchronization
        this.voteCompletionSubject.next({
          commentId,
          voteResult: result.userVote,
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
}
