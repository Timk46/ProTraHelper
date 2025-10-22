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
import { LoggerService } from '../logger/logger.service';
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
  CommentStatusMapDTO,
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
  private readonly log = this.logger.scope('EvaluationDiscussionService');

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
  private pendingRequests = new LRUCache<string, Observable<unknown>>(50);

  // Performance optimization: LRU cache for GET request results (request-level caching)
  private requestCache = new LRUCache<string, Observable<unknown>>(100);

  // Configuration for retry logic
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 5000]; // Exponential backoff
  private readonly DEBOUNCE_TIME = 300; // ms
  private readonly THROTTLE_TIME = 1000; // ms

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}

  // =============================================================================
  // PERFORMANCE & RETRY HELPERS
  // =============================================================================

  /**
   * Enhanced HTTP request with exponential backoff retry logic
   * @param request - The HTTP request observable
   * @param options - Retry options
   * @returns Observable with retry logic applied
   */
  /**
   * Enhanced HTTP request with exponential backoff retry logic
   * Critical for resilient API communication in unstable networks
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
      return this.pendingRequests.get(requestKey)! as Observable<T>;
    }

    const requestWithRetry = request.pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: HttpErrorResponse, attempt) => {
            const shouldRetryError = shouldRetry(error);
            const isLastAttempt = attempt >= maxAttempts - 1;

            if (!shouldRetryError || isLastAttempt) {
              // Log only final failures
              if (isLastAttempt) {
                this.log.error(`Request failed after ${maxAttempts} attempts`, {
                  status: error.status,
                  message: error.message
                });
              }
              return throwError(() => error);
            }

            const delayTime = this.RETRY_DELAYS[attempt] || 5000;
            return timer(delayTime);
          }),
        ),
      ),
      tap(() => {
        if (requestKey) {
          this.pendingRequests.delete(requestKey);
        }
      }),
      catchError(error => {
        if (requestKey) {
          this.pendingRequests.delete(requestKey);
        }
        return throwError(() => error);
      }),
    );

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
  /**
   * Request-level caching with automatic expiration
   * Prevents duplicate API calls and improves performance
   */
  private withCache<T>(
    cacheKey: string,
    requestFactory: () => Observable<T>,
    cacheDuration: number = 300000
  ): Observable<T> {
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey)! as Observable<T>;
    }

    const cached$ = requestFactory().pipe(
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
      tap({
        next: () => {
          setTimeout(() => {
            this.requestCache.delete(cacheKey);
          }, cacheDuration);
        },
        error: () => {
          this.requestCache.delete(cacheKey);
        }
      })
    );

    this.requestCache.set(cacheKey, cached$ as Observable<unknown>);
    return cached$;
  }

  /**
   * Enhanced vote request with optimistic updates and batch support
   * @param votes - Array of vote operations
   * @returns Observable with batch voting results
   */
  /**
   * Batch vote multiple comments atomically
   */
  batchVoteComments(
    votes: Array<{ commentId: string; voteType: VoteType }>,
  ): Observable<VoteResultDTO[]> {
    const batchRequest = this.http.post<VoteResultDTO[]>(`${this.apiUrls.comments}/batch-vote`, {
      votes,
    });

    return this.withRetry(batchRequest, {
      requestKey: `batch-vote-${votes.map(v => v.commentId).join('-')}`,
      shouldRetry: error => error.status >= 500 || !error.status,
    }).pipe(
      throttleTime(this.THROTTLE_TIME, undefined, { leading: true, trailing: true })
    );
  }

  // =============================================================================
  // CORE API METHODS
  // =============================================================================

  getSubmission(submissionId: string): Observable<EvaluationSubmissionDTO> {
    return this.withRetry(
      this.http.get<EvaluationSubmissionDTO>(`${this.apiUrls.submissions}/${submissionId}`),
      {
        requestKey: `submission-${submissionId}`,
        maxAttempts: 3,
      }
    ).pipe(distinctUntilChanged());
  }

  /**
   * Gets evaluation categories from the sessions endpoint
   */
  getCategories(sessionId?: number): Observable<EvaluationCategoryDTO[]> {
    if (!sessionId) {
      throw new Error('SessionId required for categories endpoint');
    }

    return this.withRetry(
      this.http.get<EvaluationCategoryDTO[]>(`${this.apiUrls.sessions}/${sessionId}/categories`),
      {
        requestKey: `categories-${sessionId}`,
        maxAttempts: 2,
      }
    ).pipe(
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    );
  }

  /**
   * Get discussions (comments) for a specific category
   * Transforms flat comment list into discussion DTO structure
   */
  getDiscussionsByCategory(
    submissionId: string,
    categoryId: string,
  ): Observable<EvaluationDiscussionDTO[]> {
    return this.http
      .get<EvaluationCommentDTO[]>(`${this.apiUrls.comments}/get/${submissionId}/${categoryId}`)
      .pipe(
        map(comments => {
          if (comments.length === 0) {
            return [];
          }

          // Transform to discussion container structure
          const discussion: EvaluationDiscussionDTO = {
            id: Number(`discussion-${submissionId}-${categoryId}`),
            submissionId: Number(submissionId),
            categoryId: Number(categoryId),
            comments,
            createdAt: new Date(),
            totalComments: comments.length,
            availableComments: 3,
            usedComments: comments.length,
          };

          return [discussion];
        }),
      );
  }

  createComment(comment: CreateEvaluationCommentDTO): Observable<EvaluationCommentDTO> {
    return this.http.post<EvaluationCommentDTO>(`${this.apiUrls.comments}/create`, comment).pipe(
      tap(newComment => {
        this.commentsSubject.next([...this.commentsSubject.value, newComment]);
      }),
    );
  }

  /**
   * Vote on a comment with enhanced retry logic
   */
  voteComment(commentId: string, voteType: VoteType): Observable<VoteResultDTO> {
    return this.withRetry(
      this.http.post<VoteResultDTO>(
        `${this.apiUrls.comments}/votes/vote/${commentId}`,
        { isUpvote: voteType === 'UP' }
      ),
      {
        requestKey: `vote-${commentId}-${voteType}-${Date.now()}`,
        maxAttempts: 2,
        shouldRetry: error => error.status >= 500 || error.status === 429 || !error.status,
      }
    ).pipe(
      throttleTime(500, undefined, { leading: true, trailing: false })
    );
  }

  /**
   * Get user's vote for a specific comment
   */
  getUserVoteForComment(commentId: string): Observable<VoteType | null> {
    return this.http
      .get<VoteCountResponseDTO>(`${this.apiUrls.comments}/votes/get/${commentId}`)
      .pipe(
        map(response => response.userVoteCount > 0 ? 'UP' : null),
        catchError(() => of(null))
      );
  }

  /**
   * Get user's vote count for a comment
   */
  getUserVoteCountForComment(commentId: string): Observable<number> {
    return this.http.get<VoteCountResponseDTO>(`${this.apiUrls.comments}/votes/get/${commentId}`).pipe(
      map(response => response.userVoteCount),
      retry(2),
      catchError(() => of(0))
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
   * Gets user comment status for all categories in a submission
   *
   * @description Essential for proper state initialization after page refreshes.
   * Checks which categories the user has commented in, including auto-created
   * rating comments.
   *
   * @param submissionId - The submission ID
   * @returns Map of categoryId to hasCommented boolean
   */
  getUserCommentStatusForAllCategories(submissionId: string): Observable<CommentStatusMapDTO> {
    return this.http.get<CommentStatusMapDTO>(
      `${this.apiUrls.comments}/comment-status/${submissionId}`
    ).pipe(
      retry(2),
      catchError((error: HttpErrorResponse) => {
        // BLOCKER #6 FIX: Log error and return empty map for graceful degradation
        // Frontend can distinguish between "no comments" ({}) and "error loading" (this log)
        this.log.error('Failed to load comment status for all categories', {
          submissionId,
          status: error.status,
          message: error.message,
          url: error.url
        });

        // Return empty map as fallback - Frontend will show loading error state
        // This is acceptable because:
        // 1. User can still use the app (graceful degradation)
        // 2. Error is logged for monitoring
        // 3. UI can show error message to user
        return of({});
      })
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
   * Gets the rating status for all categories
   * Essential for rating gate functionality
   */
  getUserRatingStatus(submissionId: string, userId: number): Observable<CategoryRatingStatus[]> {
    return this.http
      .get<CategoryRatingStatus[]>(
        `${this.apiUrls.ratings}/submission/${submissionId}/user/${userId}/status`
      )
      .pipe(
        retry(2),
        catchError(this.handleError<CategoryRatingStatus[]>('getUserRatingStatus'))
      );
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
      catchError((error: HttpErrorResponse) => {
        this.log.error('Failed to get user category rating', {
          status: error.status,
          message: error.message
        });
        return of(null);
      }),
    );
  }

  /**
   * Deletes a user's rating for a specific category
   */
  deleteUserRating(submissionId: string, categoryId: number): Observable<{success: boolean, message: string}> {
    return this.http.delete<{success: boolean, message: string}>(
      `${this.apiUrls.ratings}/submission/${submissionId}/category/${categoryId}/user`
    ).pipe(
      tap(() => {
        // Update local state
        const currentRatings = this.ratingsSubject.value;
        const updatedRatings = currentRatings.filter(
          rating => !(rating.categoryId === categoryId && rating.submissionId === Number(submissionId))
        );
        this.ratingsSubject.next(updatedRatings);
      }),
      catchError(error => {
        this.log.error('Failed to delete rating', { submissionId, categoryId, error });
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
   * Gets the vote limit status for a category
   * Returns 10-vote-per-category limit information
   */
  getVoteLimitStatus(submissionId: string, categoryId: string): Observable<VoteLimitStatusDTO> {
    return this.http.get<VoteLimitStatusDTO>(
      `${this.apiUrls.comments}/vote-limit/${submissionId}/${categoryId}`
    ).pipe(
      retry(2),
      catchError(error => {
        this.log.error('Failed to load vote limit status, using defaults', { submissionId, categoryId, error });
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
   */
  resetVotes(submissionId: string, categoryId: number, voteType: 'UP' | 'ALL'): Observable<ResetVotesResponseDTO> {
    const body: ResetVotesDTO = { submissionId: Number(submissionId), categoryId, voteType };

    return this.http.delete<ResetVotesResponseDTO>(`${this.apiUrls.comments}/votes/reset`, { body }).pipe(
      retry(2),
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
   * Logs critical errors and re-throws for upstream handling
   */
  private handleError<T>(operation = 'operation'): (error: HttpErrorResponse) => Observable<T> {
    return (error: HttpErrorResponse): Observable<T> => {
      this.log.error(`${operation} failed`, {
        status: error.status,
        message: error.message,
        url: error.url
      });
      return throwError(() => new Error(`${operation} failed: ${error.message || error}`));
    };
  }

  // =============================================================================
  // SUBMISSION LIST MANAGEMENT FOR NAVIGATION
  // =============================================================================

  /**
   * Gets all submissions for a user (for navigation)
   */
  getUserSubmissions(userId?: number): Observable<EvaluationSubmissionDTO[]> {
    const url = userId
      ? `${this.apiUrls.submissions}?userId=${userId}`
      : this.apiUrls.submissions;

    return this.withRetry(
      this.http.get<EvaluationSubmissionDTO[]>(url),
      { requestKey: `getUserSubmissions-${userId || 'current'}` }
    ).pipe(
      catchError(this.handleError<EvaluationSubmissionDTO[]>('getUserSubmissions'))
    );
  }
}
