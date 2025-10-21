import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { VoteType, RatingStatsDTO, VoteLimitResponseDTO, EvaluationCommentDTO } from '@DTOs/index';
import { VoteCoreService } from './vote-core.service';
import { VoteStateService } from './vote-state.service';
import { VoteUIStateService, VoteButtonState } from './vote-ui-state.service';

/**
 * Legacy adapter for backwards compatibility during migration
 *
 * @description
 * Provides backwards-compatible API matching old vote services
 * (VoteSessionService, VoteOperationsService, VoteQueueService, VoteDebouncerService)
 * while delegating to new 3-service architecture.
 *
 * @deprecated This adapter is temporary for migration phase.
 * All components should be migrated to use new services directly:
 * - VoteCoreService (HTTP operations)
 * - VoteStateService (state management)
 * - VoteUIStateService (UI logic)
 *
 * Timeline: Remove this adapter after 2 weeks of migration completion.
 *
 * @memberof EvaluationModule
 */
@Injectable({
  providedIn: 'root'
})
export class LegacyVoteAdapter {

  constructor(
    private voteCoreService: VoteCoreService,
    private voteStateService: VoteStateService,
    private voteUIStateService: VoteUIStateService
  ) {
    console.warn('⚠️ LegacyVoteAdapter: This adapter is deprecated. Migrate to new vote services.');
  }

  // =============================================================================
  // VOTE SESSION SERVICE API (deprecated)
  // =============================================================================

  /**
   * Gets current vote count for a comment
   * @deprecated Use VoteStateService.getVoteCount$ instead
   */
  getCurrentVote$(commentId: number): Observable<number> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getCurrentVote$ - Use VoteStateService.getVoteCount$');
    return this.voteStateService.getVoteCount$(commentId);
  }

  /**
   * Gets voting state for a comment
   * @deprecated Use VoteUIStateService.isVoting$ instead
   */
  isVoting$(commentId: number): Observable<boolean> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.isVoting$ - Use VoteUIStateService.isVoting$');
    return this.voteUIStateService.isVoting$(commentId);
  }

  /**
   * Gets session vote count
   * @deprecated Session tracking moved to VoteSessionService (kept separate for now)
   */
  getSessionVotes(): number {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getSessionVotes - Use VoteSessionService directly');
    // Note: VoteSessionService is kept separate as it handles session-level state
    // This is NOT part of the consolidated vote services
    return 0; // Placeholder
  }

  // =============================================================================
  // VOTE OPERATIONS SERVICE API (deprecated)
  // =============================================================================

  /**
   * Submits a vote
   * @deprecated Use VoteStateService.submitVote instead
   */
  async submitVote(commentId: number, voteType: VoteType, categoryId?: number): Promise<void> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.submitVote - Use VoteStateService.submitVote');
    return this.voteStateService.submitVote(commentId, voteType, categoryId);
  }

  /**
   * Gets rating statistics
   * @deprecated Use VoteStateService.getRatingStats$ instead
   */
  getRatingStats$(submissionId: number, categoryId: number): Observable<RatingStatsDTO | null> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getRatingStats$ - Use VoteStateService.getRatingStats$');
    return this.voteStateService.getRatingStats$(submissionId, categoryId);
  }

  /**
   * Checks if user can add more votes
   * @deprecated Use VoteUIStateService.canVote$ instead
   */
  canAddMoreVotes$(commentId: number): Observable<boolean> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.canAddMoreVotes$ - Use VoteUIStateService.canVote$');
    return this.voteUIStateService.canVote$(commentId);
  }

  /**
   * Gets user vote count for a comment
   * @deprecated Use VoteStateService.getVoteCount$ instead
   */
  getUserVoteCount$(commentId: number): Observable<number> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getUserVoteCount$ - Use VoteStateService.getVoteCount$');
    return this.voteStateService.getVoteCount$(commentId);
  }

  // =============================================================================
  // VOTE QUEUE SERVICE API (deprecated)
  // =============================================================================

  /**
   * Enqueues a vote for processing
   * @deprecated Use VoteStateService.submitVote (handles queue internally)
   */
  async enqueueVote(commentId: number, voteType: VoteType, categoryId?: number): Promise<void> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.enqueueVote - Use VoteStateService.submitVote');
    return this.voteStateService.submitVote(commentId, voteType, categoryId);
  }

  /**
   * Gets local vote cache value
   * @deprecated Use VoteStateService.getVoteCount$ instead
   */
  getLocalVoteCache$(commentId: number): Observable<number> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getLocalVoteCache$ - Use VoteStateService.getVoteCount$');
    return this.voteStateService.getVoteCount$(commentId);
  }

  /**
   * Gets loading state
   * @deprecated Use VoteUIStateService.isVoting$ instead
   */
  getLoadingState$(commentId: number): Observable<boolean> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getLoadingState$ - Use VoteUIStateService.isVoting$');
    return this.voteUIStateService.isVoting$(commentId);
  }

  /**
   * Gets error state
   * @deprecated Use VoteUIStateService.getError instead
   */
  getErrorState(commentId: number): string | null {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getErrorState - Use VoteUIStateService.getError');
    return this.voteUIStateService.getError(commentId);
  }

  // =============================================================================
  // VOTE DEBOUNCER SERVICE API (deprecated)
  // =============================================================================

  /**
   * Checks if click should be debounced
   * @deprecated Use VoteUIStateService.shouldDebounce instead
   */
  shouldDebounce(commentId: number): boolean {
    console.warn('[DEPRECATED] LegacyVoteAdapter.shouldDebounce - Use VoteUIStateService.shouldDebounce');
    return this.voteUIStateService.shouldDebounce(commentId);
  }

  /**
   * Gets last click time
   * @deprecated Use VoteUIStateService.getLastClickTime instead
   */
  getLastClickTime(commentId: number): number | null {
    console.warn('[DEPRECATED] LegacyVoteAdapter.getLastClickTime - Use VoteUIStateService.getLastClickTime');
    return this.voteUIStateService.getLastClickTime(commentId);
  }

  /**
   * 🔧 LEGACY: Checks if click should be allowed (OLD VoteDebounceService API)
   * @deprecated Use VoteUIStateService.shouldDebounce instead
   */
  shouldAllowClick(commentId: number): boolean {
    console.warn('[DEPRECATED] LegacyVoteAdapter.shouldAllowClick - Use VoteUIStateService.shouldDebounce');
    return !this.voteUIStateService.shouldDebounce(commentId);
  }

  /**
   * 🔧 LEGACY: Starts operation (OLD VoteDebounceService API)
   * @deprecated Use VoteUIStateService.setVoting instead
   */
  startOperation(commentId: number): boolean {
    console.warn('[DEPRECATED] LegacyVoteAdapter.startOperation - Use VoteUIStateService.setVoting');
    // Check if already voting
    if (this.voteUIStateService.shouldDebounce(commentId)) {
      return false;
    }
    // Set voting state
    this.voteUIStateService.setVoting(commentId, true);
    return true;
  }

  /**
   * 🔧 LEGACY: Checks if button is disabled (OLD VoteDebounceService API)
   * @deprecated Use VoteUIStateService.isVoting$ instead
   */
  isButtonDisabled(commentId: number): boolean {
    console.warn('[DEPRECATED] LegacyVoteAdapter.isButtonDisabled - Use VoteUIStateService.isVoting$');
    return this.voteUIStateService.shouldDebounce(commentId);
  }

  /**
   * 🔧 LEGACY: Resets comment state (OLD VoteDebounceService API)
   * @deprecated No longer needed with new architecture
   */
  resetCommentState(commentId: number): void {
    console.warn('[DEPRECATED] LegacyVoteAdapter.resetCommentState - No longer needed');
    // Clear any pending voting state
    this.voteUIStateService.setVoting(commentId, false);
  }

  // =============================================================================
  // COMBINED HELPERS (New conveniences for migration)
  // =============================================================================

  /**
   * Gets complete vote button state
   * @description Convenience method combining multiple observables
   * @param commentId - Comment identifier
   * @returns Observable with complete button state
   */
  getVoteButtonState$(commentId: number): Observable<VoteButtonState> {
    console.warn('[LEGACY] LegacyVoteAdapter.getVoteButtonState$ - Migrate to VoteUIStateService.getVoteButtonState');
    return this.voteUIStateService.getVoteButtonState(commentId);
  }

  /**
   * Performs complete vote operation with optimistic update
   * @description Helper method that handles:
   * - Debounce check
   * - Optimistic update
   * - Vote submission
   * - Loading state
   * - Error handling
   * @param commentId - Comment identifier
   * @param voteType - Vote type ('UP' or null)
   * @param categoryId - Optional category identifier
   * @returns Promise that resolves when vote is processed
   */
  async performVoteWithOptimisticUpdate(
    commentId: number,
    voteType: VoteType,
    categoryId?: number
  ): Promise<void> {
    console.warn('[LEGACY] LegacyVoteAdapter.performVoteWithOptimisticUpdate - Migrate to direct service usage');

    // Check debounce
    if (this.voteUIStateService.shouldDebounce(commentId)) {
      console.log('⏱️ Vote debounced');
      return;
    }

    // Set loading
    this.voteUIStateService.setVoting(commentId, true);

    // Apply optimistic update
    const delta = voteType === 'UP' ? 1 : -1;
    this.voteUIStateService.applyOptimisticUpdate(commentId, delta);

    try {
      // Submit vote
      await this.voteStateService.submitVote(commentId, voteType, categoryId);

      // Confirm optimistic update
      this.voteUIStateService.confirmOptimisticUpdate(commentId);

      console.log('✅ Vote completed successfully');
    } catch (error) {
      console.error('❌ Vote failed:', error);

      // Revert optimistic update on error
      this.voteUIStateService.revertOptimisticUpdate(commentId);

      throw error;
    } finally {
      // Clear loading state
      this.voteUIStateService.setVoting(commentId, false);
    }
  }

  /**
   * 🔧 LEGACY: Performs vote operation (OLD VoteOperationsService API)
   * @deprecated This method mimics the old VoteOperationsService.performVoteOperation
   * Migrate to VoteStateService.submitVote instead
   */
  async performVoteOperation(
    comment: EvaluationCommentDTO,
    voteType: VoteType,
    submissionId: string | number,
    categoryId: number,
    anonymousUserId?: number
  ): Promise<VoteLimitResponseDTO> {
    console.warn('[DEPRECATED] LegacyVoteAdapter.performVoteOperation - Migrate to VoteStateService.submitVote');

    try {
      // Submit vote using new architecture
      await this.voteStateService.submitVote(comment.id, voteType, categoryId);

      // Get updated vote count
      const userVoteCount = await firstValueFrom(this.voteStateService.getVoteCount$(comment.id));

      // Get vote limit status
      const voteLimitStatus = await firstValueFrom(this.voteStateService.getVoteLimitStatus$(Number(submissionId), categoryId));

      // Return fake VoteLimitResponseDTO for backwards compatibility
      const response: VoteLimitResponseDTO = {
        success: true,
        voteLimitStatus: voteLimitStatus || {
          maxVotes: 10,
          remainingVotes: 0,
          votedCommentIds: [],
          canVote: true,
          displayText: ''
        },
        userVoteCount,
        message: 'Vote processed successfully'
      };

      return response;
    } catch (error) {
      console.error('❌ LegacyVoteAdapter.performVoteOperation failed:', error);
      throw error;
    }
  }

  /**
   * 🔧 LEGACY: Extracts vote count from response (OLD VoteOperationsService API)
   * @deprecated This method mimics the old VoteOperationsService.extractVoteCountFromResponse
   * No longer needed with new architecture
   */
  extractVoteCountFromResponse(voteResult: unknown): number | undefined {
    console.warn('[DEPRECATED] LegacyVoteAdapter.extractVoteCountFromResponse - No longer needed with new services');

    try {
      if (!voteResult) {
        return undefined;
      }

      // Check if it's a VoteLimitResponseDTO
      if (typeof voteResult === 'object' && voteResult !== null) {
        const result = voteResult as Partial<VoteLimitResponseDTO>;
        if (typeof result.userVoteCount === 'number') {
          return result.userVoteCount;
        }
      }

      return undefined;
    } catch (error) {
      console.error('❌ Error extracting vote count:', error);
      return undefined;
    }
  }

  // =============================================================================
  // MIGRATION HELPERS
  // =============================================================================

  /**
   * Gets migration guide for component
   * @description Logs migration instructions to console
   * @param componentName - Name of component being migrated
   */
  logMigrationGuide(componentName: string): void {
    console.group(`📖 Migration Guide for ${componentName}`);
    console.log('Replace LegacyVoteAdapter with:');
    console.log('');
    console.log('1. VoteCoreService - HTTP operations (rarely needed in components)');
    console.log('2. VoteStateService - State management');
    console.log('   - getVoteCount$(commentId)');
    console.log('   - submitVote(commentId, voteType, categoryId)');
    console.log('   - getRatingStats$(submissionId, categoryId)');
    console.log('');
    console.log('3. VoteUIStateService - UI logic (most used)');
    console.log('   - shouldDebounce(commentId)');
    console.log('   - applyOptimisticUpdate(commentId, delta)');
    console.log('   - setVoting(commentId, isVoting)');
    console.log('   - getVoteButtonState(commentId) // Recommended!');
    console.log('');
    console.log('Example migration:');
    console.log('// Before:');
    console.log('constructor(private legacyAdapter: LegacyVoteAdapter) {}');
    console.log('');
    console.log('// After:');
    console.log('constructor(');
    console.log('  private voteState: VoteStateService,');
    console.log('  private voteUI: VoteUIStateService');
    console.log(') {}');
    console.groupEnd();
  }

  /**
   * Checks if component is using deprecated methods
   * @returns Object with usage statistics
   */
  getDeprecationStats(): {
    totalCalls: number;
    deprecatedAPICalls: Map<string, number>;
  } {
    // Note: This would require instrumentation in a real implementation
    // For now, return placeholder
    return {
      totalCalls: 0,
      deprecatedAPICalls: new Map()
    };
  }

  /**
   * Validates migration readiness
   * @description Checks if all components have been migrated
   * @returns true if adapter can be safely removed
   */
  isMigrationComplete(): boolean {
    // Note: This would check actual usage in a real implementation
    // For now, return false to prevent accidental removal
    console.warn('⚠️ Migration completion check not implemented');
    return false;
  }
}
