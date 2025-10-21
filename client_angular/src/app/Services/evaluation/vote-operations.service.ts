import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, firstValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EvaluationCommentDTO, VoteType, VoteLimitResponseDTO } from '@DTOs/index';
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { VoteSessionService } from './vote-session.service';
import { EvaluationStateService } from './evaluation-state.service';

/**
 * Error types for vote operations
 */
export interface VoteOperationError {
  code: 'VOTE_LIMIT_EXCEEDED' | 'SELF_VOTE_ATTEMPT' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage: string;
  details?: unknown;
}

/**
 * Service for handling complex vote operations and state management
 * Extracted from comment-item.component.ts to reduce component complexity
 *
 * @deprecated THIS SERVICE IS DEPRECATED AND WILL BE REMOVED.
 * Migration deadline: 2 weeks from now.
 *
 * **Migration Path:**
 * Replace this service with the new 3-service architecture:
 * - VoteCoreService: HTTP operations
 * - VoteStateService: State management (cache, queue, real-time)
 * - VoteUIStateService: UI logic (debouncing, optimistic updates)
 *
 * **Example Migration:**
 * ```typescript
 * // BEFORE (deprecated):
 * constructor(private voteOps: VoteOperationsService) {}
 * await this.voteOps.performVoteOperation(comment, voteType, ...);
 *
 * // AFTER (new architecture):
 * constructor(private voteState: VoteStateService) {}
 * await this.voteState.submitVote(commentId, voteType, categoryId);
 * ```
 *
 * See LegacyVoteAdapter for temporary compatibility layer.
 */
@Injectable({
  providedIn: 'root'
})
export class VoteOperationsService {

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private voteSessionService: VoteSessionService,
    private evaluationStateService: EvaluationStateService
  ) {
    console.warn(
      '⚠️ DEPRECATION WARNING: VoteOperationsService is deprecated and will be removed in 2 weeks.\n' +
      'Migrate to new services: VoteCoreService, VoteStateService, VoteUIStateService\n' +
      'See LegacyVoteAdapter for temporary compatibility.'
    );
  }

  /**
   * Performs vote operation with comprehensive error handling and validation
   * @param comment The comment to vote on
   * @param voteType Type of vote (UP or null to remove)
   * @param submissionId Submission identifier
   * @param categoryId Category identifier
   * @param anonymousUserId User identifier for validation
   * @returns Promise with vote result or throws VoteOperationError
   */
  async performVoteOperation(
    comment: EvaluationCommentDTO,
    voteType: VoteType,
    submissionId: string,
    categoryId: number,
    anonymousUserId?: number
  ): Promise<VoteLimitResponseDTO | unknown> {
    try {
      // Input validation
      if (!comment?.id) {
        throw this.createVoteError('VALIDATION_ERROR', 'Invalid comment data', 'Ungültiger Kommentar');
      }
      
      if (!submissionId || !categoryId) {
        throw this.createVoteError('VALIDATION_ERROR', 'Missing submission or category ID', 'Fehlende Daten für Abstimmung');
      }

      // Self-voting prevention (client-side check)
      if (anonymousUserId && comment.authorId === anonymousUserId) {
        throw this.createVoteError('SELF_VOTE_ATTEMPT', 'Cannot vote on own comment', 'Du kannst nicht für deinen eigenen Kommentar abstimmen');
      }

      // Vote limit validation
      if (voteType === 'UP' && !this.canAddMoreVotes(categoryId)) {
        throw this.createVoteError('VOTE_LIMIT_EXCEEDED', 'Vote limit exceeded', 'Keine Votes mehr verfügbar');
      }

      console.log(`🗳️ Attempting ${voteType || 'remove'} vote for comment ${comment.id} in category ${categoryId}`);

      // Perform the actual vote with error handling
      const result = await firstValueFrom(
        this.evaluationService.voteCommentWithLimits(String(comment.id), voteType).pipe(
          catchError(error => {
            console.error('❌ Vote operation failed:', error);
            
            // Parse backend error response
            if (error?.error?.message) {
              if (error.error.message.includes('self')) {
                throw this.createVoteError('SELF_VOTE_ATTEMPT', error.error.message, 'Du kannst nicht für deinen eigenen Kommentar abstimmen');
              }
              if (error.error.message.includes('limit')) {
                throw this.createVoteError('VOTE_LIMIT_EXCEEDED', error.error.message, 'Vote-Limit erreicht');
              }
            }
            
            // Network or server errors
            if (error.status === 0 || error.status >= 500) {
              throw this.createVoteError('NETWORK_ERROR', `Network error: ${error.message}`, 'Netzwerkfehler - bitte versuche es erneut');
            }
            
            throw this.createVoteError('UNKNOWN_ERROR', `Unexpected error: ${error.message}`, 'Ein unbekannter Fehler ist aufgetreten');
          })
        )
      );
      
      // Update session tracking only after successful vote
      try {
        if (voteType === 'UP') {
          this.voteSessionService.addSessionVote();
          console.log('✅ Session vote added');
        } else if (voteType === null) {
          this.voteSessionService.removeSessionVote();
          console.log('✅ Session vote removed');
        }
      } catch (sessionError) {
        console.warn('⚠️ Failed to update session tracking:', sessionError);
        // Don't fail the entire operation for session tracking errors
      }

      console.log('✅ Vote operation completed successfully');
      return result;
      
    } catch (error) {
      // Re-throw VoteOperationError as-is
      if (this.isVoteOperationError(error)) {
        throw error;
      }
      
      // Wrap unexpected errors
      console.error('❌ Unexpected error in performVoteOperation:', error);
      throw this.createVoteError('UNKNOWN_ERROR', 
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`, 
        'Ein unerwarteter Fehler ist aufgetreten');
    }
  }

  /**
   * Removes vote with proper error handling and cleanup
   * @param comment The comment to remove vote from
   * @param submissionId Submission identifier
   * @param categoryId Category identifier
   * @param anonymousUserId User identifier
   * @returns Promise with removal result or throws VoteOperationError
   */
  async removeVote(
    comment: EvaluationCommentDTO,
    submissionId: string,
    categoryId: number,
    anonymousUserId?: number
  ): Promise<any> {
    try {
      console.log(`🗑️ Removing vote for comment ${comment?.id}`);
      
      const result = await this.performVoteOperation(
        comment, 
        null, 
        submissionId, 
        categoryId, 
        anonymousUserId
      );

      console.log('✅ Vote removal completed');
      return result;
      
    } catch (error) {
      console.error('❌ Vote removal failed:', error);
      throw error; // Re-throw to maintain error chain
    }
  }

  /**
   * Check if user can add more votes considering global limits with error handling
   * @param categoryId Category to check vote limits for
   * @returns true if user can vote, false otherwise
   */
  canAddMoreVotes(categoryId: number): boolean {
    try {
      if (!categoryId || categoryId < 0) {
        console.warn('⚠️ Invalid categoryId provided to canAddMoreVotes:', categoryId);
        return false;
      }
      
      const voteLimits = this.evaluationStateService.getVoteLimitStatusForCategory(categoryId);
      if (!voteLimits) {
        console.warn(`⚠️ No vote limits found for category ${categoryId}`);
        return false;
      }

      const effectiveVotes = this.voteSessionService.getEffectiveAvailableVotes(
        voteLimits.remainingVotes
      );
      
      return effectiveVotes > 0;
      
    } catch (error) {
      console.error('❌ Error checking vote limits:', error);
      return false; // Fail safe - prevent voting if check fails
    }
  }

  /**
   * Get user's current vote count for a comment with error handling
   * @param comment Comment to check votes for
   * @param anonymousUserId User ID to filter votes by
   * @returns Number of votes by user (0 if error or no votes)
   */
  getUserVoteCount(comment: EvaluationCommentDTO, anonymousUserId?: number): number {
    try {
      if (!anonymousUserId || !comment) {
        return 0;
      }
      
      if (!comment.votes || !Array.isArray(comment.votes)) {
        return 0;
      }
      
      return comment.votes.filter(vote => 
        vote?.userId === anonymousUserId && vote?.voteType === 'UP'
      ).length || 0;
      
    } catch (error) {
      console.error('❌ Error getting user vote count:', error);
      return 0; // Fail safe
    }
  }

  /**
   * Get enhanced tooltip text for upvote button
   */
  getEnhancedUpvoteTooltip(
    comment: EvaluationCommentDTO, 
    categoryId: number,
    anonymousUserId?: number
  ): string {
    const userVoteCount = this.getUserVoteCount(comment, anonymousUserId);
    const canVote = this.canAddMoreVotes(categoryId);
    
    if (!canVote) {
      return 'Keine Votes verfügbar';
    }
    
    if (userVoteCount > 0) {
      return `Weiteren Vote hinzufügen (aktuell: ${userVoteCount})`;
    }
    
    return 'Vote hinzufügen';
  }

  /**
   * Get remove vote tooltip text
   */
  getRemoveVoteTooltip(comment: EvaluationCommentDTO, anonymousUserId?: number): string {
    const userVoteCount = this.getUserVoteCount(comment, anonymousUserId);
    
    if (userVoteCount === 0) {
      return 'Keine Votes zum Entfernen';
    }
    
    if (userVoteCount === 1) {
      return 'Vote entfernen';
    }
    
    return `Einen Vote entfernen (aktuell: ${userVoteCount})`;
  }

  /**
   * Get vote display text for UI
   */
  getVoteDisplayText(comment: EvaluationCommentDTO, anonymousUserId?: number): string {
    const totalVotes = comment.voteStats?.totalVotes || 0;
    const userVoteCount = this.getUserVoteCount(comment, anonymousUserId);
    
    if (userVoteCount === 0) {
      return `${totalVotes} ${totalVotes === 1 ? 'Vote' : 'Votes'}`;
    }
    
    return `${totalVotes} ${totalVotes === 1 ? 'Vote' : 'Votes'} (${userVoteCount} von dir)`;
  }

  /**
   * Get aria label for vote stats
   */
  getVoteStatsAriaLabel(comment: EvaluationCommentDTO, anonymousUserId?: number): string {
    const totalVotes = comment.voteStats?.totalVotes || 0;
    const userVoteCount = this.getUserVoteCount(comment, anonymousUserId);
    
    let label = `${totalVotes} ${totalVotes === 1 ? 'Vote' : 'Votes'} insgesamt`;
    
    if (userVoteCount > 0) {
      label += `, ${userVoteCount} ${userVoteCount === 1 ? 'Vote' : 'Votes'} von dir`;
    }
    
    return label;
  }

  /**
   * Extract vote count from backend response with comprehensive error handling
   * @param voteResult Backend response to extract count from
   * @returns Extracted vote count or undefined if not found
   */
  extractVoteCountFromResponse(voteResult: unknown): number | undefined {
    try {
      if (!voteResult) {
        return undefined;
      }
      
      if (this.isVoteLimitResponseDTO(voteResult)) {
        return voteResult.userVoteCount;
      }
      
      if (voteResult && typeof voteResult === 'object') {
        const obj = voteResult as Record<string, unknown>;
        
        // Try various possible property names
        const possiblePaths = [
          'userVoteCount',
          'newUserVoteCount', 
          'updatedUserVoteCount',
          'data.userVoteCount',
          'result.userVoteCount'
        ];
        
        for (const path of possiblePaths) {
          try {
            if (this.hasNestedUserVoteCount(obj, path)) {
              const value = this.getNestedProperty(obj, path);
              if (typeof value === 'number' && value >= 0) {
                return value;
              }
            }
          } catch (pathError) {
            console.warn(`⚠️ Error extracting vote count from path ${path}:`, pathError);
            continue; // Try next path
          }
        }
      }
      
      return undefined;
      
    } catch (error) {
      console.error('❌ Error extracting vote count from response:', error);
      return undefined;
    }
  }

  /**
   * Type guard for VoteLimitResponseDTO
   */
  private isVoteLimitResponseDTO(value: unknown): value is VoteLimitResponseDTO {
    return value !== null && 
           typeof value === 'object' && 
           'userVoteCount' in (value as Record<string, unknown>);
  }

  /**
   * Check if object has nested property
   */
  private hasNestedUserVoteCount(obj: Record<string, unknown>, property: string): boolean {
    const value = this.getNestedProperty(obj, property);
    return value !== undefined;
  }

  /**
   * Get nested property value safely with error handling
   * @param obj Object to traverse
   * @param path Dot-separated path to property
   * @returns Property value or undefined if not found
   */
  private getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
    try {
      if (!obj || !path) {
        return undefined;
      }
      
      return path.split('.').reduce((current: unknown, key: string): unknown => {
        return current && typeof current === 'object' && key in current
          ? (current as Record<string, unknown>)[key]
          : undefined;
      }, obj as unknown);
      
    } catch (error) {
      console.error(`❌ Error accessing nested property ${path}:`, error);
      return undefined;
    }
  }

  /**
   * Create a standardized vote operation error
   * @param code Error code for categorization
   * @param message Technical error message
   * @param userMessage User-friendly German error message
   * @param details Optional error details
   * @returns VoteOperationError object
   */
  private createVoteError(
    code: VoteOperationError['code'], 
    message: string, 
    userMessage: string, 
    details?: unknown
  ): VoteOperationError {
    return {
      code,
      message,
      userMessage,
      details
    };
  }

  /**
   * Type guard to check if error is a VoteOperationError
   * @param error Error to check
   * @returns true if error is VoteOperationError
   */
  private isVoteOperationError(error: unknown): error is VoteOperationError {
    return error !== null && 
           typeof error === 'object' && 
           'code' in (error as Record<string, unknown>) &&
           'message' in (error as Record<string, unknown>) &&
           'userMessage' in (error as Record<string, unknown>);
  }
}