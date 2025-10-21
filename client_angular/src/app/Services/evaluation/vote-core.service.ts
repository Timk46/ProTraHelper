import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  VoteType,
  VoteLimitResponseDTO,
  RatingStatsDTO,
  VoteLimitStatusDTO
} from '@DTOs/index';
import { EvaluationDiscussionService } from './evaluation-discussion.service';

/**
 * Core service for vote HTTP operations
 *
 * @description
 * Responsible for all backend communication related to voting.
 * This service contains NO state management - it only performs HTTP calls.
 *
 * Architecture:
 * - Layer 1 of 3-service architecture
 * - Used by: VoteStateService
 * - Dependencies: EvaluationDiscussionService (for HTTP)
 *
 * Single Responsibility: Backend Communication
 *
 * @memberof EvaluationModule
 */
@Injectable({
  providedIn: 'root'
})
export class VoteCoreService implements OnDestroy {

  private destroy$ = new Subject<void>();

  constructor(
    private evaluationDiscussionService: EvaluationDiscussionService
  ) {}

  // =============================================================================
  // HTTP OPERATIONS
  // =============================================================================

  /**
   * Submits a vote to the backend
   *
   * @description
   * Sends vote to backend with vote limit checking.
   * Returns updated vote limit status and user vote count.
   *
   * @param commentId - Comment identifier (number format, converted to string for API)
   * @param voteType - Vote type ('UP' to add vote, null to remove vote)
   * @returns Observable with vote result including limit status
   * @throws Error if commentId is invalid (not a positive integer)
   *
   * @example
   * ```typescript
   * this.voteCoreService.submitVote(123, 'UP').subscribe(
   *   result => console.log('Vote submitted:', result.userVoteCount),
   *   error => console.error('Vote failed:', error)
   * );
   * ```
   */
  submitVote(commentId: number, voteType: VoteType): Observable<VoteLimitResponseDTO> {
    this.validateCommentId(commentId);

    console.log(`🗳️ VoteCoreService: Submitting ${voteType || 'remove'} vote for comment ${commentId}`);

    return this.evaluationDiscussionService.voteCommentWithLimits(commentId.toString(), voteType).pipe(
      takeUntil(this.destroy$)
    );
  }

  /**
   * Loads rating statistics for a category
   *
   * @description
   * Fetches aggregated rating statistics including:
   * - Average score
   * - Total ratings count
   * - Score distribution
   * - User's own rating (if exists)
   *
   * @param submissionId - Submission identifier
   * @param categoryId - Category identifier
   * @returns Observable with rating statistics
   * @throws Error if submissionId or categoryId is invalid
   *
   * @example
   * ```typescript
   * this.voteCoreService.loadRatingStats(123, 5).subscribe(
   *   stats => console.log('Average:', stats.averageScore),
   *   error => console.error('Load failed:', error)
   * );
   * ```
   */
  loadRatingStats(submissionId: number, categoryId: number): Observable<RatingStatsDTO> {
    this.validateId(submissionId, 'submissionId');
    this.validateId(categoryId, 'categoryId');

    console.log(`📊 VoteCoreService: Loading rating stats for submission ${submissionId}, category ${categoryId}`);

    return this.evaluationDiscussionService.getRatingStats(submissionId.toString(), categoryId.toString()).pipe(
      takeUntil(this.destroy$)
    );
  }

  /**
   * Loads vote limit status for a category
   *
   * @description
   * Fetches current vote limit information:
   * - Maximum votes allowed
   * - Remaining votes available
   * - Already voted comment IDs
   *
   * @param submissionId - Submission identifier
   * @param categoryId - Category identifier
   * @returns Observable with vote limit status
   * @throws Error if submissionId or categoryId is invalid
   *
   * @example
   * ```typescript
   * this.voteCoreService.loadVoteLimitStatus(123, 5).subscribe(
   *   status => console.log('Remaining votes:', status.remainingVotes),
   *   error => console.error('Load failed:', error)
   * );
   * ```
   */
  loadVoteLimitStatus(submissionId: number, categoryId: number): Observable<VoteLimitStatusDTO> {
    this.validateId(submissionId, 'submissionId');
    this.validateId(categoryId, 'categoryId');

    console.log(`📊 VoteCoreService: Loading vote limit status for submission ${submissionId}, category ${categoryId}`);

    return this.evaluationDiscussionService.getVoteLimitStatus(submissionId.toString(), categoryId.toString()).pipe(
      takeUntil(this.destroy$)
    );
  }

  // =============================================================================
  // VALIDATION HELPERS
  // =============================================================================

  /**
   * Validates comment ID
   *
   * @param commentId - Comment identifier to validate
   * @throws Error if commentId is not a positive integer
   * @private
   */
  private validateCommentId(commentId: number): void {
    if (!Number.isInteger(commentId) || commentId <= 0) {
      throw new Error(`Invalid commentId: ${commentId}. Must be a positive integer.`);
    }
  }

  /**
   * Validates generic ID (submissionId, categoryId, etc.)
   *
   * @param id - Identifier to validate
   * @param name - Name of the ID parameter for error messages
   * @throws Error if id is not a positive integer
   * @private
   */
  private validateId(id: number, name: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid ${name}: ${id}. Must be a positive integer.`);
    }
  }

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  /**
   * Cleanup on service destruction
   *
   * @description
   * Completes all active observables to prevent memory leaks.
   * Called automatically by Angular when service is destroyed.
   */
  ngOnDestroy(): void {
    console.log('🧹 VoteCoreService: Cleaning up');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
