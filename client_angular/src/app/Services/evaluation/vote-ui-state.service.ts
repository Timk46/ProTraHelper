import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { LRUCache } from '../../utils/lru-cache';
import { VoteStateService, VoteError } from './vote-state.service';

/**
 * Optimistic update tracking
 */
interface OptimisticUpdate {
  originalValue: number;
  optimisticValue: number;
  timestamp: number;
}

/**
 * Vote button state for UI rendering
 */
export interface VoteButtonState {
  count: string;
  isLoading: boolean;
  isDisabled: boolean;
  hasOptimisticUpdate: boolean;
}

/**
 * UI state service for vote operations
 *
 * @description
 * Responsible for UI-specific vote logic including debouncing, optimistic updates,
 * and loading states. This service provides the interface between UI components
 * and the vote state layer.
 *
 * Architecture:
 * - Layer 3 of 3-service architecture
 * - Uses: VoteStateService (for state management)
 * - Used by: UI Components (comment-card, discussion-thread, etc.)
 *
 * Responsibilities:
 * - Click debouncing (300ms)
 * - Optimistic UI updates with revert capability
 * - Loading state management
 * - UI helper methods (formatting, tooltips, aria labels)
 *
 * @memberof EvaluationModule
 */
@Injectable({
  providedIn: 'root'
})
export class VoteUIStateService implements OnDestroy {

  private destroy$ = new Subject<void>();

  // =============================================================================
  // DEBOUNCING (Layer 1)
  // =============================================================================

  /**
   * Tracks last click timestamp per comment
   * Used for debouncing rapid clicks
   */
  private clickDebouncer = new Map<number, number>();

  /**
   * Debounce time in milliseconds
   * Prevents accidental double-clicks
   */
  private readonly DEBOUNCE_TIME = 300;

  /**
   * Maximum age for click tracker entries (5 minutes)
   */
  private readonly CLICK_TRACKER_MAX_AGE = 300000;

  /**
   * Cleanup interval for stale debounce entries
   */
  private readonly CLEANUP_FREQUENCY = 60000; // 1 minute

  /**
   * Cleanup timer reference
   */
  private cleanupInterval?: ReturnType<typeof setInterval>;

  // =============================================================================
  // OPTIMISTIC UPDATES (Layer 2)
  // =============================================================================

  /**
   * Tracks optimistic updates for rollback capability
   * Maps commentId to update details
   */
  private optimisticUpdates = new Map<number, OptimisticUpdate>();

  /**
   * Maximum age for optimistic updates (30 seconds)
   * After this time, updates are considered confirmed
   */
  private readonly OPTIMISTIC_UPDATE_MAX_AGE = 30000;

  // =============================================================================
  // LOADING STATES (Layer 3)
  // =============================================================================

  /**
   * LRU cache for loading states per comment
   * Max 200 comments - matches vote cache size
   */
  private loadingStates = new LRUCache<number, BehaviorSubject<boolean>>(
    200,
    (commentId: number, subject: BehaviorSubject<boolean>) => {
      subject.complete();
    }
  );

  // =============================================================================
  // ERROR TRACKING
  // =============================================================================

  /**
   * Reactive error state per comment
   * Maps commentId to BehaviorSubject<string | null>
   */
  private errorState$ = new Map<number, BehaviorSubject<string | null>>();

  /**
   * Tracks active errors per comment (legacy support)
   * @deprecated Use errorState$ for reactive error tracking
   */
  private activeErrors = new Map<number, string>();

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(private voteStateService: VoteStateService) {
    this.startCleanupTimer();
    this.subscribeToVoteErrors();
  }

  // =============================================================================
  // PUBLIC API - DEBOUNCING
  // =============================================================================

  /**
   * Checks if click should be debounced
   *
   * @description
   * Returns true if last click was within DEBOUNCE_TIME,
   * preventing accidental double-clicks.
   *
   * @param commentId - Comment identifier (number)
   * @returns true if click should be debounced (ignored)
   *
   * @example
   * ```typescript
   * if (this.voteUIStateService.shouldDebounce(123)) {
   *   console.log('Click ignored - too fast');
   *   return;
   * }
   * // Proceed with vote
   * ```
   */
  shouldDebounce(commentId: number): boolean {
    const lastClick = this.clickDebouncer.get(commentId);

    if (!lastClick) {
      this.clickDebouncer.set(commentId, Date.now());
      return false;
    }

    const timeSinceLastClick = Date.now() - lastClick;

    if (timeSinceLastClick < this.DEBOUNCE_TIME) {
      console.log(`⏱️ VoteUIStateService: Debounced click for ${commentId} (${timeSinceLastClick}ms ago)`);
      return true;
    }

    this.clickDebouncer.set(commentId, Date.now());
    return false;
  }

  /**
   * Gets timestamp of last click for a comment
   *
   * @param commentId - Comment identifier (number)
   * @returns Timestamp of last click, or null if never clicked
   */
  getLastClickTime(commentId: number): number | null {
    return this.clickDebouncer.get(commentId) || null;
  }

  // =============================================================================
  // PUBLIC API - OPTIMISTIC UPDATES
  // =============================================================================

  /**
   * Applies optimistic update to UI before backend confirmation
   *
   * @description
   * Immediately updates the vote count in the UI for instant feedback.
   * Stores original value for potential rollback on error.
   *
   * @param commentId - Comment identifier (number)
   * @param delta - Vote delta (+1 for upvote, -1 for remove)
   *
   * @example
   * ```typescript
   * this.voteUIStateService.applyOptimisticUpdate(123, 1);
   * // UI shows +1 vote immediately
   * ```
   */
  applyOptimisticUpdate(commentId: number, delta: number): void {
    this.voteStateService.getVoteCount$(commentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(currentValue => {
      const optimisticValue = currentValue + delta;

      // Store original value for potential revert
      this.optimisticUpdates.set(commentId, {
        originalValue: currentValue,
        optimisticValue: optimisticValue,
        timestamp: Date.now()
      });

      // Update cache with optimistic value
      this.voteStateService.updateVoteCache(commentId, optimisticValue);

      console.log(`✨ VoteUIStateService: Optimistic update ${commentId}: ${currentValue} → ${optimisticValue}`);
    });
  }

  /**
   * Reverts optimistic update on error
   *
   * @description
   * Restores original vote count when vote submission fails.
   * Called automatically on vote errors.
   *
   * @param commentId - Comment identifier (number)
   */
  revertOptimisticUpdate(commentId: number): void {
    const update = this.optimisticUpdates.get(commentId);

    if (update) {
      console.warn(`⏪ VoteUIStateService: Reverting optimistic update for ${commentId}`);

      // Restore original value
      this.voteStateService.updateVoteCache(commentId, update.originalValue);

      // Remove from tracking
      this.optimisticUpdates.delete(commentId);
    }
  }

  /**
   * Confirms optimistic update after successful backend response
   *
   * @description
   * Removes optimistic update tracking after backend confirms the vote.
   * Backend response provides authoritative vote count.
   *
   * @param commentId - Comment identifier (number)
   */
  confirmOptimisticUpdate(commentId: number): void {
    this.optimisticUpdates.delete(commentId);
  }

  /**
   * Checks if comment has pending optimistic update
   *
   * @param commentId - Comment identifier (number)
   * @returns true if optimistic update is pending
   */
  hasOptimisticUpdate(commentId: number): boolean {
    return this.optimisticUpdates.has(commentId);
  }

  // =============================================================================
  // PUBLIC API - LOADING STATES
  // =============================================================================

  /**
   * Gets observable for voting loading state
   *
   * @description
   * Returns observable that emits true when vote is in progress,
   * false when idle. Used to show loading spinners in UI.
   *
   * @param commentId - Comment identifier (number)
   * @returns Observable<boolean> - true if voting in progress
   *
   * @example
   * ```typescript
   * this.voteUIStateService.isVoting$(123).subscribe(
   *   isVoting => this.showSpinner = isVoting
   * );
   * ```
   */
  isVoting$(commentId: number): Observable<boolean> {
    let state = this.loadingStates.get(commentId);

    if (!state) {
      state = new BehaviorSubject<boolean>(false);
      this.loadingStates.set(commentId, state);
    }

    return state.asObservable();
  }

  /**
   * Sets voting state for a comment
   *
   * @description
   * Called by UI layer to indicate vote operation in progress.
   *
   * @param commentId - Comment identifier (number)
   * @param isVoting - true if voting, false if idle
   */
  setVoting(commentId: number, isVoting: boolean): void {
    let state = this.loadingStates.get(commentId);

    if (!state) {
      state = new BehaviorSubject<boolean>(false);
      this.loadingStates.set(commentId, state);
    }

    state.next(isVoting);
    console.log(`${isVoting ? '⏳' : '✅'} VoteUIStateService: Voting state for ${commentId} = ${isVoting}`);
  }

  /**
   * Clears debounce state for a comment to allow immediate voting
   *
   * @description
   * Removes the timestamp entry from clickDebouncer Map so that
   * shouldDebounce() will not block subsequent vote attempts.
   * This should be called when a vote operation completes to
   * prevent the debouncer from blocking immediate re-votes.
   *
   * @param commentId - Comment identifier (number)
   */
  clearDebounceState(commentId: number): void {
    this.clickDebouncer.delete(commentId);
    console.log(`🧹 VoteUIStateService: Cleared debounce state for ${commentId}`);
  }

  // =============================================================================
  // PUBLIC API - UI HELPERS (Layer 4)
  // =============================================================================

  /**
   * Checks if user can vote on comment
   *
   * @description
   * Returns observable that combines loading state and error state
   * to determine if vote button should be enabled.
   *
   * @param commentId - Comment identifier (number)
   * @returns Observable<boolean> - true if can vote
   *
   * @example
   * ```typescript
   * this.voteUIStateService.canVote$(123).subscribe(
   *   canVote => this.voteButtonDisabled = !canVote
   * );
   * ```
   */
  canVote$(commentId: number): Observable<boolean> {
    return combineLatest([
      this.isVoting$(commentId),
      this.hasError$(commentId)
    ]).pipe(
      map(([isVoting, hasError]) => !isVoting && !hasError)
    );
  }

  /**
   * Gets complete vote button state for rendering
   *
   * @description
   * Combines vote count, loading state, and can-vote status
   * into a single object for easy template binding.
   *
   * @param commentId - Comment identifier (number)
   * @returns Observable<VoteButtonState> with all button properties
   *
   * @example
   * ```typescript
   * // In component
   * voteButtonState$ = this.voteUIStateService.getVoteButtonState(123);
   *
   * // In template
   * <button [disabled]="(voteButtonState$ | async)?.isDisabled">
   *   {{ (voteButtonState$ | async)?.count }}
   * </button>
   * ```
   */
  getVoteButtonState(commentId: number): Observable<VoteButtonState> {
    return combineLatest([
      this.voteStateService.getVoteCount$(commentId),
      this.isVoting$(commentId),
      this.canVote$(commentId)
    ]).pipe(
      map(([voteCount, isVoting, canVote]) => ({
        count: this.formatVoteCount(voteCount),
        isLoading: isVoting,
        isDisabled: !canVote,
        hasOptimisticUpdate: this.hasOptimisticUpdate(commentId)
      }))
    );
  }

  /**
   * Formats vote count for display
   *
   * @description
   * Formats number as string with optional + prefix for positive counts.
   *
   * @param count - Vote count
   * @returns Formatted string (e.g., "+5", "0", "-2")
   *
   * @example
   * ```typescript
   * formatVoteCount(5)   // "+5"
   * formatVoteCount(0)   // "0"
   * formatVoteCount(-2)  // "-2"
   * ```
   */
  formatVoteCount(count: number): string {
    if (count === 0) return '0';
    if (count > 0) return `+${count}`;
    return count.toString();
  }

  /**
   * Gets tooltip text for upvote button
   *
   * @param commentId - Comment identifier (number)
   * @param canVote - Whether user can vote
   * @returns Tooltip text
   */
  getUpvoteTooltip(commentId: number, canVote: boolean): string {
    if (!canVote) {
      return 'Keine Votes verfügbar';
    }

    const hasOptimistic = this.hasOptimisticUpdate(commentId);
    if (hasOptimistic) {
      return 'Vote wird gespeichert...';
    }

    return 'Vote hinzufügen';
  }

  /**
   * Gets tooltip text for remove vote button
   *
   * @param commentId - Comment identifier (number)
   * @param currentCount - Current vote count
   * @returns Tooltip text
   */
  getRemoveVoteTooltip(commentId: number, currentCount: number): string {
    if (currentCount === 0) {
      return 'Keine Votes zum Entfernen';
    }

    const hasOptimistic = this.hasOptimisticUpdate(commentId);
    if (hasOptimistic) {
      return 'Vote wird gespeichert...';
    }

    return 'Vote entfernen';
  }

  /**
   * Gets aria label for vote stats
   *
   * @param commentId - Comment identifier (number)
   * @param totalVotes - Total vote count
   * @param userVoteCount - User's vote count
   * @returns Aria label text
   */
  getVoteStatsAriaLabel(commentId: number, totalVotes: number, userVoteCount: number): string {
    let label = `${totalVotes} ${totalVotes === 1 ? 'Vote' : 'Votes'} insgesamt`;

    if (userVoteCount > 0) {
      label += `, ${userVoteCount} ${userVoteCount === 1 ? 'Vote' : 'Votes'} von dir`;
    }

    const hasOptimistic = this.hasOptimisticUpdate(commentId);
    if (hasOptimistic) {
      label += ', wird gespeichert';
    }

    return label;
  }

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  /**
   * Subscribes to vote errors from state service
   */
  private subscribeToVoteErrors(): void {
    this.voteStateService.onVoteError$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.handleVoteError(error);
    });
  }

  /**
   * Handles vote error
   */
  private handleVoteError(error: VoteError): void {
    console.error(`❌ VoteUIStateService: Vote error for ${error.commentId}:`, error.error);

    // Get or create error state subject
    if (!this.errorState$.has(error.commentId)) {
      this.errorState$.set(error.commentId, new BehaviorSubject<string | null>(null));
    }

    const errorSubject = this.errorState$.get(error.commentId)!;
    errorSubject.next(error.error || 'Unknown error');

    // Store error (legacy support)
    this.activeErrors.set(error.commentId, error.error || 'Unknown error');

    // Revert optimistic update
    this.revertOptimisticUpdate(error.commentId);

    // Clear loading state
    this.setVoting(error.commentId, false);

    // Auto-clear error after 5 seconds
    setTimeout(() => {
      this.clearError(error.commentId);
    }, 5000);
  }

  /**
   * Gets observable for error state
   *
   * @description
   * Returns reactive observable that emits true when error exists,
   * false otherwise. Updates automatically when error state changes.
   *
   * @param commentId - Comment identifier
   * @returns Observable<boolean> - true if error exists
   */
  private hasError$(commentId: number): Observable<boolean> {
    if (!this.errorState$.has(commentId)) {
      this.errorState$.set(commentId, new BehaviorSubject<string | null>(null));
    }

    return this.errorState$.get(commentId)!.pipe(
      map(error => error !== null)
    );
  }

  /**
   * Clears error for specific comment
   */
  clearError(commentId: number): void {
    // Clear reactive state
    if (this.errorState$.has(commentId)) {
      this.errorState$.get(commentId)!.next(null);
    }

    // Clear legacy map
    this.activeErrors.delete(commentId);

  }

  /**
   * Gets current error message for comment
   */
  getError(commentId: number): string | null {
    return this.activeErrors.get(commentId) || null;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  /**
   * Starts automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, this.CLEANUP_FREQUENCY);

  }

  /**
   * Cleans up stale debounce and optimistic update entries
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup old debounce entries
    for (const [commentId, timestamp] of this.clickDebouncer.entries()) {
      if (now - timestamp > this.CLICK_TRACKER_MAX_AGE) {
        this.clickDebouncer.delete(commentId);
        cleaned++;
      }
    }

    // Cleanup old optimistic updates (auto-confirm after max age)
    for (const [commentId, update] of this.optimisticUpdates.entries()) {
      if (now - update.timestamp > this.OPTIMISTIC_UPDATE_MAX_AGE) {
        this.confirmOptimisticUpdate(commentId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
    }
  }

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {

    // Stop cleanup timer
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Complete subjects
    this.destroy$.next();
    this.destroy$.complete();

    // Clear all caches
    this.loadingStates.clear();
    this.clickDebouncer.clear();
    this.optimisticUpdates.clear();
    this.activeErrors.clear();

  }
}
