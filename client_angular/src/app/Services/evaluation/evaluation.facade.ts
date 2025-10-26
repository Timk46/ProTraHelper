import { Injectable } from '@angular/core';
import { Observable, combineLatest, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

// DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  EvaluationPhase,
  CategoryRatingStatus,
  VoteLimitStatusDTO,
  EvaluationCommentDTO,
  EvaluationRatingDTO,
  RatingStatsDTO,
} from '@DTOs/index';

// Services
import { EvaluationStateService } from './evaluation-state.service';
import { LoggerService } from '../logger/logger.service';

/**
 * ViewModel interface for evaluation components
 */
export interface EvaluationViewModel {
  submission: EvaluationSubmissionDTO | null;
  categories: EvaluationCategoryDTO[];
  activeCategory: number | null;
  activeCategoryInfo: EvaluationCategoryDTO | null;
  discussions: EvaluationDiscussionDTO[];
  commentStats: CommentStatsDTO | null;
  anonymousUser: AnonymousEvaluationUserDTO | null;
  loading: boolean;
  error: string | null;
  categoryRatingStatus: Map<number, CategoryRatingStatus>;
  categoryCommentStatus: Map<number, boolean>;
  voteLimitStatus: Map<number, VoteLimitStatusDTO>;
  isReady: boolean;
  hasError: boolean;
}

/**
 * Simplified facade for evaluation features
 *
 * @description
 * This facade provides a simplified, component-friendly API for evaluation features.
 * It combines multiple observables into a single ViewModel and provides
 * convenient methods for common operations.
 *
 * Benefits:
 * - Reduces component complexity
 * - Single ViewModel subscription instead of multiple
 * - Type-safe operations
 * - Centralized error handling
 * - Easier testing
 *
 * @example
 * ```typescript
 * constructor(private evaluationFacade: EvaluationFacade) {}
 *
 * ngOnInit() {
 *   // Subscribe to complete ViewModel
 *   this.vm$ = this.evaluationFacade.vm$;
 *
 *   // Initialize evaluation
 *   this.evaluationFacade.initializeEvaluation(submissionId, userId);
 * }
 *
 * onSubmitComment(content: string) {
 *   this.evaluationFacade.submitComment(content)
 *     .subscribe(comment => console.log('Comment created:', comment));
 * }
 * ```
 *
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationFacade {
  private readonly log = this.logger.scope('EvaluationFacade');

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private state: EvaluationStateService,
    private logger: LoggerService
  ) {
    this.log.debug('EvaluationFacade initialized');
  }

  // =============================================================================
  // VIEWMODEL
  // =============================================================================

  /**
   * Combined ViewModel observable for components
   *
   * @description
   * Combines all evaluation state into a single observable stream.
   * Components can subscribe once and get all needed data.
   */
  readonly vm$: Observable<EvaluationViewModel> = combineLatest({
    submission: this.state.submission$,
    categories: this.state.categories$,
    activeCategory: this.state.activeCategory$,
    activeCategoryInfo: this.state.activeCategoryInfo$,
    discussions: this.state.activeDiscussions$,
    commentStats: this.state.commentStats$,
    anonymousUser: this.state.anonymousUser$,
    loading: this.state.loading$,
    error: this.state.error$,
    categoryRatingStatus: this.state.categoryRatingStatus$,
    categoryCommentStatus: this.state.categoryCommentStatus$,
    voteLimitStatus: this.state.voteLimitStatus$,
  }).pipe(
    map(state => ({
      ...state,
      isReady: !state.loading && !!state.submission && state.categories.length > 0,
      hasError: !!state.error,
    }))
  );

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  /**
   * Initializes evaluation for a submission
   *
   * @description
   * Loads all necessary data for the evaluation interface:
   * - Submission details
   * - Categories
   * - Anonymous user
   * - Comment stats
   * - Rating status
   *
   * @param submissionId - The submission ID
   * @param userId - The user ID
   */
  initializeEvaluation(submissionId: string, userId: number): void {
    this.log.info('Initializing evaluation', { submissionId, userId });
    this.state.loadSubmission(submissionId, userId);
  }

  /**
   * Refreshes all evaluation data
   *
   * @param submissionId - The submission ID
   * @param userId - The user ID
   */
  refreshEvaluation(submissionId: string, userId: number): void {
    this.log.info('Refreshing evaluation', { submissionId, userId });
    this.state.refreshAll(submissionId, userId);
  }

  // =============================================================================
  // CATEGORY MANAGEMENT
  // =============================================================================

  /**
   * Switches to a different category
   *
   * @description
   * Performs atomic category transition with loading state management.
   *
   * @param categoryId - The category ID to switch to
   * @returns Observable<void> Completes when transition is finished
   */
  switchCategory(categoryId: number): Observable<void> {
    this.log.info('Switching category', { categoryId });
    return this.state.transitionToCategory(categoryId);
  }

  /**
   * Checks if a category has been rated
   *
   * @param categoryId - The category ID
   * @returns Observable<boolean> True if rated, false otherwise
   */
  isCategoryRated$(categoryId: number): Observable<boolean> {
    return this.state.isCategoryRated$(categoryId);
  }

  /**
   * Checks if user has commented in a category
   *
   * @param categoryId - The category ID
   * @returns Observable<boolean> True if commented, false otherwise
   */
  hasCommentedInCategory$(categoryId: number): Observable<boolean> {
    return this.state.hasCommentedInCategory$(categoryId);
  }

  // =============================================================================
  // COMMENT MANAGEMENT
  // =============================================================================

  /**
   * Submits a new comment
   *
   * @description
   * Creates a top-level comment in the current active category.
   * Automatically uses current submission and active category.
   *
   * @param content - The comment content
   * @returns Observable<EvaluationCommentDTO> The created comment
   */
  submitComment(content: string): Observable<EvaluationCommentDTO> {
    const submission = this.state.getCurrentSubmission();
    const categoryId = this.state.getCurrentActiveCategory();

    if (!submission || categoryId === null) {
      this.log.error('Cannot submit comment: Invalid state', { submission, categoryId });
      return throwError(() => new Error('Invalid state: Submission or category not loaded'));
    }

    this.log.info('Submitting comment', { submissionId: submission.id, categoryId });
    return this.state.addComment(String(submission.id), categoryId, content);
  }

  /**
   * Submits a reply to a comment
   *
   * @description
   * Creates a reply to an existing comment in the current active category.
   *
   * @param parentCommentId - The parent comment ID
   * @param content - The reply content
   * @returns Observable<EvaluationCommentDTO> The created reply
   */
  submitReply(parentCommentId: string, content: string): Observable<EvaluationCommentDTO> {
    const submission = this.state.getCurrentSubmission();
    const categoryId = this.state.getCurrentActiveCategory();

    if (!submission || categoryId === null) {
      this.log.error('Cannot submit reply: Invalid state', { submission, categoryId });
      return throwError(() => new Error('Invalid state: Submission or category not loaded'));
    }

    this.log.info('Submitting reply', { parentCommentId, submissionId: submission.id, categoryId });
    return this.state.addReply(String(submission.id), categoryId, parentCommentId, content);
  }

  // =============================================================================
  // RATING MANAGEMENT
  // =============================================================================

  /**
   * Submits a rating for the current active category
   *
   * @description
   * Creates a rating for the active category.
   * Automatically uses current submission and active category.
   *
   * @param score - The rating score (1-10)
   * @returns Observable<EvaluationRatingDTO> The created rating
   */
  submitRating(score: number): Observable<EvaluationRatingDTO> {
    const submission = this.state.getCurrentSubmission();
    const categoryId = this.state.getCurrentActiveCategory();

    if (!submission || categoryId === null) {
      this.log.error('Cannot submit rating: Invalid state', { submission, categoryId });
      return throwError(() => new Error('Invalid state: Submission or category not loaded'));
    }

    this.log.info('Submitting rating', { submissionId: submission.id, categoryId, score });
    return this.state.submitRating(String(submission.id), categoryId, score);
  }

  /**
   * Gets rating statistics for a category
   *
   * @param categoryId - The category ID
   * @returns Observable<RatingStatsDTO> The rating statistics
   */
  getRatingStats(categoryId: number): Observable<RatingStatsDTO> {
    const submission = this.state.getCurrentSubmission();

    if (!submission) {
      this.log.error('Cannot get rating stats: No submission loaded');
      return throwError(() => new Error('No submission loaded'));
    }

    return this.state.getRatingStats(String(submission.id), categoryId);
  }

  // =============================================================================
  // DIAGNOSTICS & HELPERS
  // =============================================================================

  /**
   * Gets current submission ID
   *
   * @returns The current submission ID or null
   */
  getCurrentSubmissionId(): string | null {
    const submission = this.state.getCurrentSubmission();
    return submission ? String(submission.id) : null;
  }

  /**
   * Gets current active category ID
   *
   * @returns The current active category ID or null
   */
  getCurrentCategoryId(): number | null {
    return this.state.getCurrentActiveCategory();
  }

  /**
   * Gets current anonymous user
   *
   * @returns The current anonymous user or null
   */
  getCurrentAnonymousUser(): AnonymousEvaluationUserDTO | null {
    return this.state.getCurrentAnonymousUser();
  }
}
