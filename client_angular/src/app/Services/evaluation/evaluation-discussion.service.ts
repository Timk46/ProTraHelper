import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, throwError, of } from 'rxjs';
import {
  map,
  tap,
  switchMap,
  retry,
  retryWhen,
  delay,
  take,
  mergeMap,
  catchError,
  debounceTime,
  throttleTime,
  distinctUntilChanged,
  shareReplay,
} from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LRUCache } from '../../utils/lru-cache';
// Import all evaluation DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  CreateEvaluationCommentDTO,
  CreateEvaluationRatingDTO,
  VoteType,
  VoteResultDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  EvaluationRatingDTO,
  RatingStatsDTO,
  CategoryRatingStatus,
  HasRatedResponse,
  PhaseSwitchRequestDTO,
  PhaseSwitchResponseDTO,
  UserVoteResponseDTO,
  VoteCountResponseDTO,
  VoteLimitStatusDTO,
  VoteLimitResponseDTO,
  ResetVotesDTO,
  ResetVotesResponseDTO,
} from '@DTOs/index';

@Injectable({
  providedIn: 'root',
})
export class EvaluationDiscussionService {
  private readonly apiUrls = {
    submissions: `${environment.server}/evaluation-submissions`,
    comments: `${environment.server}/evaluation-comments`,
    ratings: `${environment.server}/evaluation-ratings`,
    sessions: `${environment.server}/evaluation-sessions`,
  };

  // State subjects for real-time updates
  private commentsSubject = new BehaviorSubject<EvaluationCommentDTO[]>([]);
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);

  // Performance optimization: LRU cache for pending requests (prevents duplicate HTTP calls)
  private pendingRequests = new LRUCache<string, Observable<unknown>>(
    50, // Max 50 concurrent pending requests
    (key) => {
      console.log(`🧹 EvaluationDiscussionService: LRU evicted pending request ${key}`);
    }
  );

  // Performance optimization: LRU cache for GET request results (request-level caching)
  private requestCache = new LRUCache<string, Observable<unknown>>(
    100, // Max 100 cached GET requests
    (key) => {
      console.log(`🧹 EvaluationDiscussionService: LRU evicted cached request ${key}`);
    }
  );

  // Configuration for retry logic
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 5000]; // Exponential backoff
  private readonly DEBOUNCE_TIME = 300; // ms
  private readonly THROTTLE_TIME = 1000; // ms

  constructor(private http: HttpClient) {
    // Using real backend APIs - no mock data initialization needed
  }

  // =============================================================================
  // PERFORMANCE & RETRY HELPERS
  // =============================================================================

  /**
   * Enhanced HTTP request with exponential backoff retry logic
   * @param request - The HTTP request observable
   * @param options - Retry options
   * @returns Observable with retry logic applied
   */
  private withRetry<T>(
    request: Observable<T>,
    options: {
      maxAttempts?: number;
      shouldRetry?: (error: HttpErrorResponse) => boolean;
      requestKey?: string;
    } = {},
  ): Observable<T> {
    const {
      maxAttempts = this.MAX_RETRY_ATTEMPTS,
      shouldRetry = this.defaultShouldRetry,
      requestKey,
    } = options;

    // Deduplication: Return existing request if already pending
    if (requestKey && this.pendingRequests.has(requestKey)) {
      console.log('🔄 Returning existing request for key:', requestKey);
      return this.pendingRequests.get(requestKey)! as Observable<T>;
    }

    const requestWithRetry = request.pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: HttpErrorResponse, attempt) => {
            const shouldRetryError = shouldRetry(error);
            const isLastAttempt = attempt >= maxAttempts - 1;

            console.log(`🔄 Request attempt ${attempt + 1}/${maxAttempts}:`, {
              status: error.status,
              shouldRetry: shouldRetryError,
              isLastAttempt,
            });

            if (!shouldRetryError || isLastAttempt) {
              return throwError(() => error);
            }

            const delayTime = this.RETRY_DELAYS[attempt] || 5000;
            console.log(`⏰ Retrying in ${delayTime}ms...`);
            return timer(delayTime);
          }),
        ),
      ),
      tap(() => {
        // Clean up pending request on success
        if (requestKey) {
          this.pendingRequests.delete(requestKey);
        }
      }),
      catchError(error => {
        // Clean up pending request on final error
        if (requestKey) {
          this.pendingRequests.delete(requestKey);
        }
        return throwError(() => error);
      }),
    );

    // Cache pending request
    if (requestKey) {
      this.pendingRequests.set(requestKey, requestWithRetry);
    }

    return requestWithRetry;
  }

  /**
   * Determines if an HTTP error should trigger a retry
   * @param error - The HTTP error response
   * @returns true if request should be retried
   */
  private defaultShouldRetry(error: HttpErrorResponse): boolean {
    // Retry on network errors or 5xx server errors
    return (
      !error.status || // Network error
      error.status === 0 || // Network error
      (error.status >= 500 && error.status < 600) || // Server errors
      error.status === 429
    ); // Rate limiting
  }

  /**
   * Creates a debounced version of an HTTP request
   * @param requestFactory - Function that creates the HTTP request
   * @param debounceTime - Debounce time in milliseconds
   * @returns Debounced observable
   */
  private withDebounce<T>(
    requestFactory: () => Observable<T>,
    debounceTime: number = this.DEBOUNCE_TIME,
  ): Observable<T> {
    return timer(debounceTime).pipe(switchMap(() => requestFactory()));
  }

  /**
   * Request-level caching for GET requests
   *
   * @description
   * Implements request-level caching using LRU cache and shareReplay().
   * Each unique cache key gets a single Observable chain that's shared across
   * multiple subscribers, preventing duplicate HTTP requests.
   *
   * @param cacheKey - Unique key for this request (e.g., 'getRatingStats-123-5')
   * @param requestFactory - Function that creates the HTTP request
   * @param cacheDuration - Optional cache duration in ms (default: 5 minutes)
   * @returns Cached observable with shareReplay
   *
   * @example
   * ```typescript
   * return this.withCache(
   *   `getRatingStats-${submissionId}-${categoryId}`,
   *   () => this.http.get<RatingStatsDTO>(`${url}`)
   * );
   * ```
   */
  private withCache<T>(
    cacheKey: string,
    requestFactory: () => Observable<T>,
    cacheDuration: number = 300000 // 5 minutes default
  ): Observable<T> {
    // Check if we have a cached observable
    if (this.requestCache.has(cacheKey)) {
      console.log(`✅ Returning cached request for key: ${cacheKey}`);
      return this.requestCache.get(cacheKey)! as Observable<T>;
    }

    console.log(`🆕 Creating new cached request for key: ${cacheKey}`);

    // Create new observable with shareReplay
    const cached$ = requestFactory().pipe(
      shareReplay({
        bufferSize: 1,
        refCount: true, // Auto-cleanup when no subscribers
      }),
      tap({
        next: () => {
          // Set timeout to invalidate cache after duration
          setTimeout(() => {
            if (this.requestCache.has(cacheKey)) {
              console.log(`⏰ Cache expired for key: ${cacheKey}`);
              this.requestCache.delete(cacheKey);
            }
          }, cacheDuration);
        },
        error: () => {
          // Remove from cache on error
          console.log(`❌ Removing failed request from cache: ${cacheKey}`);
          this.requestCache.delete(cacheKey);
        }
      })
    );

    // Store in cache
    this.requestCache.set(cacheKey, cached$ as Observable<unknown>);

    return cached$;
  }

  /**
   * Enhanced vote request with optimistic updates and batch support
   * @param votes - Array of vote operations
   * @returns Observable with batch voting results
   */
  batchVoteComments(
    votes: Array<{ commentId: string; voteType: VoteType }>,
  ): Observable<VoteResultDTO[]> {
    console.log('🗳️ Batch voting on comments:', votes.length, 'votes');

    const batchRequest = this.http.post<VoteResultDTO[]>(`${this.apiUrls.comments}/batch-vote`, {
      votes,
    });

    return this.withRetry(batchRequest, {
      requestKey: `batch-vote-${votes.map(v => v.commentId).join('-')}`,
      shouldRetry: error => {
        // Don't retry on validation errors (4xx)
        return error.status >= 500 || !error.status;
      },
    }).pipe(
      throttleTime(this.THROTTLE_TIME, undefined, { leading: true, trailing: true }),
      tap(results => {
        console.log('✅ Batch vote completed:', results.length, 'results');
      }),
    );
  }

  // =============================================================================
  // CORE API METHODS
  // =============================================================================

  getSubmission(submissionId: string): Observable<EvaluationSubmissionDTO> {
    const request = this.http.get<EvaluationSubmissionDTO>(
      `${this.apiUrls.submissions}/${submissionId}`,
    );

    return this.withRetry(request, {
      requestKey: `submission-${submissionId}`,
      maxAttempts: 3,
    }).pipe(
      distinctUntilChanged(),
      tap(submission => {
        console.log('✅ Submission loaded with retry support:', submission.id);
      }),
    );
  }

  /**
   * Gets evaluation categories from the sessions endpoint
   * Requires sessionId - gets it from current submission
   */
  getCategories(sessionId?: number): Observable<EvaluationCategoryDTO[]> {
    if (!sessionId) {
      throw new Error('SessionId required for categories endpoint');
    }

    const request = this.http.get<EvaluationCategoryDTO[]>(
      `${this.apiUrls.sessions}/${sessionId}/categories`,
    );

    return this.withRetry(request, {
      requestKey: `categories-${sessionId}`,
      maxAttempts: 2,
    }).pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      tap(categories => {
        console.log('✅ Categories loaded with retry support:', categories.length);
      }),
    );
  }

  getDiscussionsByCategory(
    submissionId: string,
    categoryId: string,
  ): Observable<EvaluationDiscussionDTO[]> {
    console.log('🔍 getDiscussionsByCategory service call', submissionId, categoryId);
    // Phase 2.1: Transform EvaluationCommentDTO[] response to EvaluationDiscussionDTO[]
    return this.http
      .get<
        EvaluationCommentDTO[]
      >(`${this.apiUrls.comments}/get/${submissionId}/${categoryId}`)
      .pipe(
        map(comments => {
          // Backend returns comments directly, but frontend expects discussion containers
          console.log('🔄 Transforming', comments.length, 'comments to discussion format');

          if (comments.length === 0) {
            return [];
          }

          // Create a single discussion container for this category
          const discussion: EvaluationDiscussionDTO = {
            id: Number(`discussion-${submissionId}-${categoryId}`),
            submissionId: Number(submissionId),
            categoryId: Number(categoryId),
            comments: comments,
            createdAt: new Date(),
            totalComments: comments.length,
            availableComments: 3, // System default
            usedComments: comments.length,
          };

          console.log('✅ Discussion created with', discussion.totalComments, 'comments');
          return [discussion];
        }),
      );
  }

  createComment(comment: CreateEvaluationCommentDTO): Observable<EvaluationCommentDTO> {
    console.log('createComment in frontend:', comment);
    return this.http.post<EvaluationCommentDTO>(`${this.apiUrls.comments}/create`, comment).pipe(
      tap(newComment => {
        // Update local state for real-time updates
        this.commentsSubject.next([...this.commentsSubject.value, newComment]);
      }),
    );
  }

  /**
   * Votes on a comment with enhanced retry logic and performance optimization
   * Corrected parameter name to match backend expectation
   */
  voteComment(commentId: string, voteType: VoteType): Observable<VoteResultDTO> {
    const request = this.http.post<VoteResultDTO>(
      `${this.apiUrls.comments}/votes/vote/${commentId}`,
      { isUpvote: voteType === 'UP' }
    );

    return this.withRetry(request, {
      requestKey: `vote-${commentId}-${voteType}-${Date.now()}`, // Include timestamp to prevent caching votes
      maxAttempts: 2,
      shouldRetry: error => {
        // Don't retry client errors (4xx) except 429
        return error.status >= 500 || error.status === 429 || !error.status;
      },
    }).pipe(
      throttleTime(500, undefined, { leading: true, trailing: false }), // Prevent spam voting
      tap(result => {
        console.log('✅ Vote completed with retry support:', {
          commentId,
          voteType,
          result: result.userVote,
        });
      }),
    );
  }

  /**
   * Gets the current user's vote status for a specific comment
   * @param commentId - The comment ID
   * @returns Observable<VoteType | null> - The user's vote or null
   */
  getUserVoteForComment(commentId: string): Observable<VoteType | null> {
    // Use existing votes/get endpoint instead of non-existent user-vote endpoint
    return this.http
      .get<VoteCountResponseDTO>(`${this.apiUrls.comments}/votes/get/${commentId}`)
      .pipe(
        map(response => response.userVoteCount > 0 ? 'UP' : null),
        catchError(error => {
          console.warn('⚠️ getUserVoteForComment failed, returning null:', error);
          return of(null);
        })
      );
  }

  /**
   * Get user's vote count for a comment (multiple votes support)
   * @param commentId - The comment ID to check
   * @returns Observable containing user's vote count
   */
  getUserVoteCountForComment(commentId: string): Observable<number> {
    // Use existing votes/get endpoint instead of non-existent user-vote-count endpoint
    return this.http.get<VoteCountResponseDTO>(`${this.apiUrls.comments}/votes/get/${commentId}`).pipe(
      map(response => response.userVoteCount),
      retry(2),
      catchError(error => {
        console.warn('⚠️ getUserVoteCountForComment failed, returning 0:', error);
        return of(0);
      })
    );
  }

  /**
   * Gets comprehensive comment statistics for a submission
   * Includes per-category limits and usage tracking
   */
  getCommentStats(submissionId: string): Observable<CommentStatsDTO> {
    return this.http.get<CommentStatsDTO>(
      `${this.apiUrls.submissions}/${submissionId}/comment-stats`,
    );
  }

  /**
   * Gets user comment status for all categories for a specific submission
   * 
   * @description This method checks all categories to determine which ones
   * the user has already commented in. This is used to properly initialize
   * the frontend comment status after page refreshes, including comments
   * that were automatically created from ratings.
   * 
   * @param submissionId - The submission ID to check
   * @returns Observable containing map of categoryId to boolean indicating if user has commented
   */
  getUserCommentStatusForAllCategories(submissionId: string): Observable<{ [categoryId: number]: boolean }> {
    const endpoint = `${this.apiUrls.comments}/comment-status/${submissionId}`;
    console.log('🔍 Getting comment status for all categories:', {
      endpoint,
      submissionId
    });
    
    return this.http.get<{ [categoryId: number]: boolean }>(endpoint).pipe(
      tap(result => {
        console.log('✅ Comment status retrieved:', {
          submissionId,
          categoriesWithComments: Object.keys(result).filter(key => result[+key]),
          totalCategories: Object.keys(result).length
        });
      }),
      retry(2),
      catchError(this.handleError<{ [categoryId: number]: boolean }>('getUserCommentStatusForAllCategories'))
    );
  }

  // =============================================================================
  // ANONYMOUS USER MANAGEMENT
  // =============================================================================

  /**
   * Gets anonymous user for a submission
   * Corrected to match backend implementation (GET instead of POST)
   */
  getOrCreateAnonymousUser(submissionId: string): Observable<AnonymousEvaluationUserDTO> {
    return this.http.get<AnonymousEvaluationUserDTO>(
      `${this.apiUrls.submissions}/${submissionId}/anonymous-user`,
    );
  }

  // =============================================================================
  // RATING SYSTEM
  // =============================================================================

  createRating(rating: CreateEvaluationRatingDTO): Observable<EvaluationRatingDTO> {
    return this.http.post<EvaluationRatingDTO>(`${this.apiUrls.ratings}`, rating).pipe(
      tap(newRating => {
        // Update local state for real-time updates
        const currentRatings = this.ratingsSubject.value;
        // Remove existing rating for this user/category
        const filteredRatings = currentRatings.filter(
          r =>
            !(
              r.userId === newRating.userId &&
              r.categoryId === newRating.categoryId &&
              r.submissionId === newRating.submissionId
            ),
        );
        this.ratingsSubject.next([...filteredRatings, newRating]);
      }),
    );
  }

  /**
   * Gets rating statistics for a specific category
   * Corrected URL path to match backend implementation
   */
  getRatingStats(submissionId: string, categoryId: string): Observable<RatingStatsDTO> {
    return this.withCache(
      `getRatingStats-${submissionId}-${categoryId}`,
      () => this.http.get<RatingStatsDTO>(
        `${this.apiUrls.ratings}/submission/${submissionId}/category/${categoryId}/stats`,
      )
    );
  }

  /**
   * Checks if the current user has rated a specific category
   *
   * @description This method is used to determine if the user has access
   * to the discussion area for a specific category. Users must rate a category
   * before they can access its discussion.
   *
   * @param {string} submissionId - The submission ID to check
   * @param {number} categoryId - The category ID to check
   * @returns {Observable<{hasRated: boolean}>} Observable indicating if user has rated the category
   * @memberof EvaluationDiscussionService
   */
  hasUserRatedCategory(submissionId: string, categoryId: number): Observable<HasRatedResponse> {
    return this.http
      .get<HasRatedResponse>(
        `${this.apiUrls.ratings}/submission/${submissionId}/category/${categoryId}/user`,
      )
      .pipe(retry(2), catchError(this.handleError<HasRatedResponse>('hasUserRatedCategory')));
  }

  /**
   * Gets the rating status for all categories for the current user and submission
   *
   * @description This method returns the complete rating status overview,
   * indicating which categories the user has rated and which discussions they can access.
   * This is essential for the rating gate functionality.
   *
   * @param {string} submissionId - The submission ID to check
   * @returns {Observable<CategoryRatingStatus[]>} Observable containing rating status for all categories
   * @memberof EvaluationDiscussionService
   */
  getUserRatingStatus(submissionId: string, userId: number): Observable<CategoryRatingStatus[]> {
    const endpoint = `${this.apiUrls.ratings}/submission/${submissionId}/user/${userId}/status`;

    // DEBUG: API call verification
    console.log('🐛 DEBUG API Call:', {
      method: 'getUserRatingStatus',
      endpoint,
      submissionId,
      userId,
      userIdType: typeof userId,
      isNaN: isNaN(userId),
      timestamp: new Date().toISOString()
    });

    return this.http
      .get<CategoryRatingStatus[]>(endpoint)
      .pipe(retry(2), catchError(this.handleError<CategoryRatingStatus[]>('getUserRatingStatus')));
  }

  /**
   * Gets the current user's rating for a specific category
   *
   * @description This method retrieves the user's existing rating for a category,
   * useful for pre-populating rating sliders and showing rating history.
   *
   * @param {string} submissionId - The submission ID
   * @param {number} categoryId - The category ID
   * @returns {Observable<number | null>} Observable containing the user's rating or null if not rated
   * @memberof EvaluationDiscussionService
   */
  getUserCategoryRating(submissionId: string, categoryId: number, userId: number): Observable<number | null> {
    return this.getUserRatingStatus(submissionId, userId).pipe(
      map(statuses => {
        const categoryStatus = statuses.find(s => s.categoryId === categoryId);
        return categoryStatus?.rating || null;
      }),
      catchError(error => {
        console.error('Failed to get user category rating:', error);
        return of(null);
      }),
    );
  }

  /**
   * Deletes a user's rating for a specific category and submission
   *
   * @description Removes the user's rating from the database and triggers
   * cache invalidation to ensure consistent state across the application
   *
   * @param {string} submissionId - The submission ID
   * @param {number} categoryId - The category ID
   * @returns {Observable<{success: boolean, message: string}>} Observable containing deletion result
   */
  deleteUserRating(submissionId: string, categoryId: number): Observable<{success: boolean, message: string}> {
    const deleteEndpoint = `${this.apiUrls.ratings}/submission/${submissionId}/category/${categoryId}/user`;

    console.log('🗑️ Calling backend to delete rating:', {
      endpoint: deleteEndpoint,
      submissionId,
      categoryId,
      timestamp: new Date().toISOString()
    });

    return this.http.delete<{success: boolean, message: string}>(deleteEndpoint).pipe(
      tap(response => {
        console.log('✅ Rating deleted successfully from backend:', response);

        // Update local ratings state by removing the deleted rating
        const currentRatings = this.ratingsSubject.value;
        const updatedRatings = currentRatings.filter(
          rating => !(rating.categoryId === categoryId && rating.submissionId === Number(submissionId))
        );
        this.ratingsSubject.next(updatedRatings);
      }),
      catchError(error => {
        console.error('❌ Failed to delete rating from backend:', error);
        throw error;
      })
    );
  }

  // =============================================================================
  // PHASE MANAGEMENT
  // =============================================================================

  /**
   * Switches evaluation phase using session-based approach
   * Gets sessionId from submission first, then switches phase
   */
  switchPhase(request: PhaseSwitchRequestDTO): Observable<PhaseSwitchResponseDTO> {
    // First get the submission to extract sessionId
    return this.getSubmission(request.submissionId).pipe(
      switchMap(submission => {
        // Now call phase switch with the sessionId
        return this.http.post<PhaseSwitchResponseDTO>(
          `${this.apiUrls.sessions}/${submission.sessionId}/switch-phase`,
          {
            phase: request.targetPhase,
          },
        );
      }),
    );
  }

  /**
   * Alternative submission-based phase switching (more efficient)
   * Directly switches phase using submission ID without additional API call
   */
  switchPhaseBySubmission(request: PhaseSwitchRequestDTO): Observable<any> {
    return this.http.post(`${this.apiUrls.submissions}/${request.submissionId}/switch-phase`, {
      targetPhase: request.targetPhase,
      reason: request.reason,
    });
  }

  // =============================================================================
  // REAL-TIME UPDATES SIMULATION
  // =============================================================================

  subscribeToDiscussionUpdates(submissionId: string): Observable<any> {
    // Real-time updates will be handled by WebSocket/Socket.IO integration
    return this.commentsSubject.asObservable().pipe(
      map(comments => ({
        type: 'comment-added',
        submissionId,
        comments: comments.filter(c => c.submissionId === Number(submissionId)),
      })),
    );
  }

  // =============================================================================
  // VOTE LIMIT TRACKING METHODS
  // =============================================================================

  /**
   * Gets the vote limit status for a user in a specific submission and category
   *
   * @description Fetches current vote usage from backend.
   * Returns category-wide vote limit information (10 votes total per category).
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Observable containing vote limit status from backend
   */
  getVoteLimitStatus(submissionId: string, categoryId: string): Observable<VoteLimitStatusDTO> {
    const url = `${this.apiUrls.comments}/vote-limit/${submissionId}/${categoryId}`;

    return this.http.get<VoteLimitStatusDTO>(url).pipe(
      tap(status => {
        console.log('📊 Vote limit status received from backend:', { submissionId, categoryId, status });
      }),
      retry(2),
      catchError(error => {
        console.error('❌ Failed to load vote limit status, using defaults:', error);
        // Fallback to defaults if backend fails
        return of({
          maxVotes: 10,
          remainingVotes: 10,
          votedCommentIds: [],
          canVote: true,
          displayText: '10/10 verfügbar',
        });
      })
    );
  }

  /**
   * Votes on a comment with vote limit checking
   *
   * @param commentId - The comment ID to vote on
   * @param voteType - The vote type ('UP' or null) - Ranking System
   * @returns Observable containing vote result and updated limit status
   */
  voteCommentWithLimits(commentId: string, voteType: 'UP' | null): Observable<VoteLimitResponseDTO> {
    const url = `${this.apiUrls.comments}/votes/vote/${commentId}`;
    const body = { isUpvote: voteType === 'UP' };

    return this.http.post<VoteLimitResponseDTO>(url, body).pipe(
      retry(2),
      catchError(this.handleError<VoteLimitResponseDTO>('voteCommentWithLimits'))
    );
  }

  /**
   * Resets user votes in a specific category
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param voteType - The type of votes to reset ('UP' or 'ALL') - Ranking System
   * @returns Observable containing reset result and updated vote limit status
   */
  resetVotes(submissionId: string, categoryId: number, voteType: 'UP' | 'ALL'): Observable<ResetVotesResponseDTO> {
    const url = `${this.apiUrls.comments}/votes/reset`;
    const body: ResetVotesDTO = { submissionId: Number(submissionId), categoryId, voteType };

    console.log('🔄 Resetting votes via frontend service:', { submissionId, categoryId, voteType });

    return this.http.delete<ResetVotesResponseDTO>(url, { body }).pipe(
      retry(2),
      tap(response => {
        console.log('✅ Vote reset successful:', {
          resetCount: response.resetCount,
          voteType,
          categoryId,
          voteLimitStatus: response.voteLimitStatus
        });
      }),
      catchError(this.handleError<ResetVotesResponseDTO>('resetVotes'))
    );
  }

  /**
   * Gets the current vote statistics for a comment
   *
   * @param commentId - The comment ID
   * @returns Observable containing vote result
   */
  getCommentVotes(commentId: string): Observable<VoteResultDTO> {
    const url = `${this.apiUrls.comments}/${commentId}/votes`;

    return this.http.get<VoteResultDTO>(url).pipe(
      retry(2),
      catchError(this.handleError<VoteResultDTO>('getCommentVotes'))
    );
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Generic error handler for HTTP operations
   *
   * @description Returns an error handler function that logs the operation
   * and returns a safe fallback value
   *
   * @param {string} operation - Name of the operation that failed
   * @returns {Function} Error handler function
   * @memberof EvaluationDiscussionService
   */
  private handleError<T>(operation = 'operation'): (error: any) => Observable<T> {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);

      // Let the app keep running by returning a safe fallback
      return throwError(() => new Error(`${operation} failed: ${error.message || error}`));
    };
  }

  // =============================================================================
  // SUBMISSION LIST MANAGEMENT FOR NAVIGATION
  // =============================================================================

  /**
   * Gets all submissions for a user for navigation purposes
   *
   * @description Fetches all submissions belonging to a specific user from the backend API.
   * Used for populating the submission navigation list in the evaluation forum.
   * @param userId - The user ID (optional, defaults to current user)
   * @returns Observable<EvaluationSubmissionDTO[]> List of user submissions
   * @memberof EvaluationDiscussionService
   */
  getUserSubmissions(userId?: number): Observable<EvaluationSubmissionDTO[]> {
    let url = `${this.apiUrls.submissions}`;
    
    if (userId) {
      url += `?userId=${userId}`;
    }

    const requestKey = `getUserSubmissions-${userId || 'current'}`;

    return this.withRetry(
      this.http.get<EvaluationSubmissionDTO[]>(url),
      { requestKey }
    ).pipe(
      tap(submissions => {
        console.log('✅ Retrieved user submissions:', submissions.length, 'submissions');
        submissions.forEach(s => console.log(`  - ${s.id}: ${s.title}`));
      }),
      catchError(this.handleError<EvaluationSubmissionDTO[]>('getUserSubmissions'))
    );
  }

  // All mock methods removed - using real backend APIs
}
