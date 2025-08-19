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
  distinctUntilChanged
} from 'rxjs/operators';
import { environment } from '../../../environments/environment';
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
  UserVoteResponseDTO
} from '@DTOs/index';

@Injectable({
  providedIn: 'root'
})
export class EvaluationDiscussionService {
  private readonly apiUrls = {
    submissions: `${environment.server}/evaluation-submissions`,
    comments: `${environment.server}/evaluation-comments`,
    ratings: `${environment.server}/evaluation-ratings`,
    sessions: `${environment.server}/evaluation-sessions`
  };

  // State subjects for real-time updates
  private commentsSubject = new BehaviorSubject<EvaluationCommentDTO[]>([]);
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);

  // Performance optimization subjects
  private pendingRequests = new Map<string, Observable<any>>();
  
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
    } = {}
  ): Observable<T> {
    const { 
      maxAttempts = this.MAX_RETRY_ATTEMPTS, 
      shouldRetry = this.defaultShouldRetry,
      requestKey
    } = options;

    // Deduplication: Return existing request if already pending
    if (requestKey && this.pendingRequests.has(requestKey)) {
      console.log('🔄 Returning existing request for key:', requestKey);
      return this.pendingRequests.get(requestKey)!;
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
              isLastAttempt
            });

            if (!shouldRetryError || isLastAttempt) {
              return throwError(() => error);
            }

            const delayTime = this.RETRY_DELAYS[attempt] || 5000;
            console.log(`⏰ Retrying in ${delayTime}ms...`);
            return timer(delayTime);
          })
        )
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
      })
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
    return !error.status || // Network error
           error.status === 0 || // Network error
           (error.status >= 500 && error.status < 600) || // Server errors
           error.status === 429; // Rate limiting
  }

  /**
   * Creates a debounced version of an HTTP request
   * @param requestFactory - Function that creates the HTTP request
   * @param debounceTime - Debounce time in milliseconds
   * @returns Debounced observable
   */
  private withDebounce<T>(
    requestFactory: () => Observable<T>,
    debounceTime: number = this.DEBOUNCE_TIME
  ): Observable<T> {
    return timer(debounceTime).pipe(
      switchMap(() => requestFactory())
    );
  }

  /**
   * Enhanced vote request with optimistic updates and batch support
   * @param votes - Array of vote operations
   * @returns Observable with batch voting results
   */
  batchVoteComments(votes: Array<{ commentId: string; voteType: VoteType }>): Observable<VoteResultDTO[]> {
    console.log('🗳️ Batch voting on comments:', votes.length, 'votes');
    
    const batchRequest = this.http.post<VoteResultDTO[]>(`${this.apiUrls.comments}/batch-vote`, { votes });
    
    return this.withRetry(batchRequest, {
      requestKey: `batch-vote-${votes.map(v => v.commentId).join('-')}`,
      shouldRetry: (error) => {
        // Don't retry on validation errors (4xx)
        return error.status >= 500 || !error.status;
      }
    }).pipe(
      throttleTime(this.THROTTLE_TIME, undefined, { leading: true, trailing: true }),
      tap(results => {
        console.log('✅ Batch vote completed:', results.length, 'results');
      })
    );
  }

  // =============================================================================
  // CORE API METHODS
  // =============================================================================

  getSubmission(submissionId: string): Observable<EvaluationSubmissionDTO> {
    const request = this.http.get<EvaluationSubmissionDTO>(`${this.apiUrls.submissions}/${submissionId}`);
    
    return this.withRetry(request, {
      requestKey: `submission-${submissionId}`,
      maxAttempts: 3
    }).pipe(
      distinctUntilChanged(),
      tap(submission => {
        console.log('✅ Submission loaded with retry support:', submission.id);
      })
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

    const request = this.http.get<EvaluationCategoryDTO[]>(`${this.apiUrls.sessions}/${sessionId}/categories`);
    
    return this.withRetry(request, {
      requestKey: `categories-${sessionId}`,
      maxAttempts: 2
    }).pipe(
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      ),
      tap(categories => {
        console.log('✅ Categories loaded with retry support:', categories.length);
      })
    );
  }

  getDiscussionsByCategory(
    submissionId: string,
    categoryId: string
  ): Observable<EvaluationDiscussionDTO[]> {
    console.log('🔍 getDiscussionsByCategory service call', submissionId, categoryId);
    // Phase 2.1: Transform EvaluationCommentDTO[] response to EvaluationDiscussionDTO[]
    return this.http.get<EvaluationCommentDTO[]>(
      `${this.apiUrls.comments}?submissionId=${submissionId}&categoryId=${categoryId}`
    ).pipe(
      map(comments => {
        // Backend returns comments directly, but frontend expects discussion containers
        console.log('🔄 Transforming', comments.length, 'comments to discussion format');

        if (comments.length === 0) {
          return [];
        }

        // Create a single discussion container for this category
        const discussion: EvaluationDiscussionDTO = {
          id: `discussion-${submissionId}-${categoryId}`,
          submissionId,
          categoryId: parseInt(categoryId),
          comments: comments,
          createdAt: new Date(),
          totalComments: comments.length,
          availableComments: 3, // System default
          usedComments: comments.length
        };

        console.log('✅ Discussion created with', discussion.totalComments, 'comments');
        return [discussion];
      })
    );
  }

  createComment(comment: CreateEvaluationCommentDTO): Observable<EvaluationCommentDTO> {
    console.log('createComment in frontend:', comment);
    return this.http.post<EvaluationCommentDTO>(`${this.apiUrls.comments}`, comment).pipe(
      tap(newComment => {
        // Update local state for real-time updates
        this.commentsSubject.next([...this.commentsSubject.value, newComment]);
      })
    );
  }

  /**
   * Votes on a comment with enhanced retry logic and performance optimization
   * Corrected parameter name to match backend expectation
   */
  voteComment(commentId: string, voteType: VoteType): Observable<VoteResultDTO> {
    const request = this.http.post<VoteResultDTO>(`${this.apiUrls.comments}/${commentId}/vote`, { voteType });
    
    return this.withRetry(request, {
      requestKey: `vote-${commentId}-${voteType}-${Date.now()}`, // Include timestamp to prevent caching votes
      maxAttempts: 2,
      shouldRetry: (error) => {
        // Don't retry client errors (4xx) except 429
        return error.status >= 500 || error.status === 429 || !error.status;
      }
    }).pipe(
      throttleTime(500, undefined, { leading: true, trailing: false }), // Prevent spam voting
      tap(result => {
        console.log('✅ Vote completed with retry support:', {
          commentId,
          voteType,
          result: result.userVote
        });
      })
    );
  }

  /**
   * Gets the current user's vote status for a specific comment
   * @param commentId - The comment ID
   * @returns Observable<VoteType | null> - The user's vote or null
   */
  getUserVoteForComment(commentId: string): Observable<VoteType | null> {
    return this.http.get<UserVoteResponseDTO>(`${this.apiUrls.comments}/${commentId}/user-vote`)
      .pipe(
        map(response => response.voteType)
      );
  }

  /**
   * Gets comprehensive comment statistics for a submission
   * Includes per-category limits and usage tracking
   */
  getCommentStats(submissionId: string): Observable<CommentStatsDTO> {
    return this.http.get<CommentStatsDTO>(`${this.apiUrls.submissions}/${submissionId}/comment-stats`);
  }

  // =============================================================================
  // ANONYMOUS USER MANAGEMENT
  // =============================================================================

  /**
   * Gets anonymous user for a submission
   * Corrected to match backend implementation (GET instead of POST)
   */
  getOrCreateAnonymousUser(submissionId: string): Observable<AnonymousEvaluationUserDTO> {
    return this.http.get<AnonymousEvaluationUserDTO>(`${this.apiUrls.submissions}/${submissionId}/anonymous-user`);
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
          r => !(r.userId === newRating.userId && r.categoryId === newRating.categoryId && r.submissionId === newRating.submissionId)
        );
        this.ratingsSubject.next([...filteredRatings, newRating]);
      })
    );
  }

  /**
   * Gets rating statistics for a specific category
   * Corrected URL path to match backend implementation
   */
  getRatingStats(submissionId: string, categoryId: string): Observable<RatingStatsDTO> {
    return this.http.get<RatingStatsDTO>(`${this.apiUrls.ratings}/submission/${submissionId}/category/${categoryId}/stats`);
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
    return this.http.get<HasRatedResponse>(
      `${this.apiUrls.ratings}/submission/${submissionId}/category/${categoryId}/user`
    ).pipe(
      retry(2),
      catchError(this.handleError<HasRatedResponse>('hasUserRatedCategory'))
    );
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
  getUserRatingStatus(submissionId: string): Observable<CategoryRatingStatus[]> {
    return this.http.get<CategoryRatingStatus[]>(
      `${this.apiUrls.ratings}/submission/${submissionId}/user/status`
    ).pipe(
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
  getUserCategoryRating(submissionId: string, categoryId: number): Observable<number | null> {
    return this.getUserRatingStatus(submissionId).pipe(
      map(statuses => {
        const categoryStatus = statuses.find(s => s.categoryId === categoryId);
        return categoryStatus?.rating || null;
      }),
      catchError(error => {
        console.error('Failed to get user category rating:', error);
        return of(null);
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
        return this.http.post<PhaseSwitchResponseDTO>(`${this.apiUrls.sessions}/${submission.sessionId}/switch-phase`, {
          phase: request.targetPhase
        });
      })
    );
  }

  /**
   * Alternative submission-based phase switching (more efficient)
   * Directly switches phase using submission ID without additional API call
   */
  switchPhaseBySubmission(request: PhaseSwitchRequestDTO): Observable<any> {
    return this.http.post(`${this.apiUrls.submissions}/${request.submissionId}/switch-phase`, {
      targetPhase: request.targetPhase,
      reason: request.reason
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
        comments: comments.filter(c => c.submissionId === submissionId)
      }))
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

  // All mock methods removed - using real backend APIs
}
