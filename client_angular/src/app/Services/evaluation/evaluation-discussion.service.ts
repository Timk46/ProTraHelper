import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
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
  PhaseSwitchRequestDTO,
  PhaseSwitchResponseDTO
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

  constructor(private http: HttpClient) {
    // Using real backend APIs - no mock data initialization needed
  }

  // =============================================================================
  // CORE API METHODS
  // =============================================================================

  getSubmission(submissionId: string): Observable<EvaluationSubmissionDTO> {
    return this.http.get<EvaluationSubmissionDTO>(`${this.apiUrls.submissions}/${submissionId}`);
  }

  /**
   * Gets evaluation categories from the sessions endpoint
   * Requires sessionId - gets it from current submission
   */
  getCategories(sessionId?: number): Observable<EvaluationCategoryDTO[]> {
    if (sessionId) {
      return this.http.get<EvaluationCategoryDTO[]>(`${this.apiUrls.sessions}/${sessionId}/categories`);
    }

    // If no sessionId provided, throw error - calling code should provide it
    throw new Error('SessionId required for categories endpoint');
  }

  getDiscussionsByCategory(
    submissionId: string,
    categoryId: string
  ): Observable<EvaluationDiscussionDTO[]> {
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
   * Votes on a comment
   * Corrected parameter name to match backend expectation
   */
  voteComment(commentId: string, voteType: VoteType): Observable<VoteResultDTO> {
    return this.http.post<VoteResultDTO>(`${this.apiUrls.comments}/${commentId}/vote`, { voteType });
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

  // All mock methods removed - using real backend APIs
}
