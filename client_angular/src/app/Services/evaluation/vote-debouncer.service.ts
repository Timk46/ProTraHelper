import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, timer } from 'rxjs';
import { debounceTime, throttleTime, distinctUntilChanged, shareReplay } from 'rxjs/operators';

/**
 * 🔧 HEFL Vote Debouncer Service
 *
 * Prevents race conditions in voting UI by:
 * - Debouncing rapid button clicks
 * - Throttling vote operations per comment
 * - Tracking disabled states during operations
 * - Providing visual feedback for pending operations
 *
 * @deprecated THIS SERVICE IS DEPRECATED AND WILL BE REMOVED.
 * Migration deadline: 2 weeks from now.
 *
 * **Migration Path:**
 * Replace this service with the new 3-service architecture:
 * - VoteCoreService: HTTP operations
 * - VoteStateService: State management
 * - VoteUIStateService: UI logic (includes debouncing functionality)
 *
 * **Example Migration:**
 * ```typescript
 * // BEFORE (deprecated):
 * constructor(private voteDebouncer: VoteDebounceService) {}
 * if (this.voteDebouncer.shouldAllowClick(commentId)) { ... }
 * this.voteDebouncer.startOperation(commentId);
 *
 * // AFTER (new architecture):
 * constructor(private voteUI: VoteUIStateService) {}
 * if (!this.voteUI.shouldDebounce(commentId)) { ... }
 * this.voteUI.setVoting(commentId, true);
 * ```
 *
 * See LegacyVoteAdapter for temporary compatibility layer.
 *
 * @example
 * ```typescript
 * constructor(private voteDebouncer: VoteDebounceService) {}
 *
 * onVoteClick(commentId: string) {
 *   if (this.voteDebouncer.isButtonDisabled(commentId)) {
 *     return; // Prevent rapid clicking
 *   }
 *
 *   this.voteDebouncer.disableButton(commentId, 1000); // Disable for 1 second
 *   // ... perform vote operation
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class VoteDebounceService implements OnDestroy {
  // 🔧 BUTTON STATE: Track disabled buttons per comment
  private disabledButtons = new Map<string, boolean>();
  private buttonStateTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // 🔧 CLICK TRACKING: Prevent rapid-fire clicking with time-based cleanup
  private clickTracker = new Map<string, number>();
  private readonly CLICK_THRESHOLD = 300; // ms between allowed clicks
  private readonly CLICK_TRACKER_MAX_AGE = 300000; // 5 minutes

  // 🔧 OPERATION TRACKING: Prevent concurrent operations on same comment
  private pendingOperations = new Set<string>();

  // 🔧 CLEANUP: Automatic cleanup interval to prevent memory leaks
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private readonly CLEANUP_FREQUENCY = 60000; // 1 minute

  constructor() {
    console.warn(
      '⚠️ DEPRECATION WARNING: VoteDebounceService is deprecated and will be removed in 2 weeks.\n' +
      'Migrate to new services: VoteCoreService, VoteStateService, VoteUIStateService\n' +
      'See LegacyVoteAdapter for temporary compatibility.'
    );
    // Start automatic cleanup to prevent unbounded Map growth
    this.startCleanupTimer();
  }

  /**
   * 🔧 LIFECYCLE: Cleanup on service destruction (fixes memory leak)
   *
   * @description
   * Called automatically by Angular when the service is destroyed.
   * Ensures all timers and Maps are properly cleaned up to prevent memory leaks.
   *
   * @memberof VoteDebounceService
   */
  ngOnDestroy(): void {
    console.log('🧹 VoteDebounceService: ngOnDestroy called, cleaning up...');
    this.cleanup();
  }

  /**
   * 🔧 PUBLIC API: Check if vote button should be disabled
   */
  isButtonDisabled(commentId: string): boolean {
    return this.disabledButtons.get(commentId) || false;
  }

  /**
   * 🔧 PUBLIC API: Check if operation is pending for comment
   */
  isPendingOperation(commentId: string): boolean {
    return this.pendingOperations.has(commentId);
  }

  /**
   * 🔧 PUBLIC API: Check if click should be allowed (debounced)
   */
  shouldAllowClick(commentId: string): boolean {
    const now = Date.now();
    const lastClick = this.clickTracker.get(commentId) || 0;
    
    if (now - lastClick < this.CLICK_THRESHOLD) {
      console.log('🔧 VoteDebouncer: Click too rapid, ignoring:', {
        commentId,
        timeSinceLastClick: now - lastClick,
        threshold: this.CLICK_THRESHOLD
      });
      return false;
    }

    // Update click timestamp
    this.clickTracker.set(commentId, now);
    return true;
  }

  /**
   * 🔧 PUBLIC API: Temporarily disable vote button
   */
  disableButton(commentId: string, durationMs: number = 1000): void {
    console.log('🔧 VoteDebouncer: Disabling button:', { commentId, durationMs });
    
    // Clear existing timer if any
    const existingTimer = this.buttonStateTimers.get(commentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Disable button
    this.disabledButtons.set(commentId, true);

    // Re-enable after duration
    const timer = setTimeout(() => {
      this.disabledButtons.set(commentId, false);
      this.buttonStateTimers.delete(commentId);
      console.log('🔧 VoteDebouncer: Re-enabled button:', commentId);
    }, durationMs);

    this.buttonStateTimers.set(commentId, timer);
  }

  /**
   * 🔧 PUBLIC API: Mark operation as started
   */
  startOperation(commentId: string): boolean {
    if (this.pendingOperations.has(commentId)) {
      console.log('🔧 VoteDebouncer: Operation already pending:', commentId);
      return false; // Operation already in progress
    }

    console.log('🔧 VoteDebouncer: Starting operation:', commentId);
    this.pendingOperations.add(commentId);
    this.disableButton(commentId, 2000); // Disable for 2 seconds during operation
    return true;
  }

  /**
   * 🔧 PUBLIC API: Mark operation as completed
   */
  completeOperation(commentId: string): void {
    console.log('🔧 VoteDebouncer: Completing operation:', commentId);
    this.pendingOperations.delete(commentId);
    
    // Re-enable button after short delay to prevent rapid re-clicking
    setTimeout(() => {
      this.disabledButtons.set(commentId, false);
    }, 300);
  }

  /**
   * 🔧 PUBLIC API: Mark operation as failed (immediate re-enable)
   */
  failOperation(commentId: string): void {
    console.log('🔧 VoteDebouncer: Operation failed:', commentId);
    this.pendingOperations.delete(commentId);
    this.disabledButtons.set(commentId, false);
    
    // Clear timer to prevent delayed re-enabling
    const timer = this.buttonStateTimers.get(commentId);
    if (timer) {
      clearTimeout(timer);
      this.buttonStateTimers.delete(commentId);
    }
  }

  /**
   * 🔧 PUBLIC API: Get observable for button disabled state
   */
  getButtonDisabledState$(commentId: string): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      const interval = setInterval(() => {
        subscriber.next(this.isButtonDisabled(commentId));
      }, 100);

      return () => clearInterval(interval);
    }).pipe(
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  /**
   * 🔧 PUBLIC API: Reset all state for comment (cleanup)
   */
  resetCommentState(commentId: string): void {
    console.log('🔧 VoteDebouncer: Resetting state for:', commentId);
    
    this.pendingOperations.delete(commentId);
    this.disabledButtons.delete(commentId);
    this.clickTracker.delete(commentId);
    
    const timer = this.buttonStateTimers.get(commentId);
    if (timer) {
      clearTimeout(timer);
      this.buttonStateTimers.delete(commentId);
    }
  }

  /**
   * 🔧 CLEANUP: Clear all state (called on service destroy)
   */
  cleanup(): void {
    console.log('🧹 VoteDebouncer: Cleaning up all state');

    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear all timers
    this.buttonStateTimers.forEach(timer => clearTimeout(timer));

    // Clear all maps
    this.disabledButtons.clear();
    this.buttonStateTimers.clear();
    this.clickTracker.clear();
    this.pendingOperations.clear();
  }

  /**
   * 🔧 PRIVATE: Start automatic cleanup timer to prevent memory leaks
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, this.CLEANUP_FREQUENCY);
  }

  /**
   * 🔧 PRIVATE: Clean up stale entries from clickTracker
   * Removes entries older than CLICK_TRACKER_MAX_AGE
   */
  private cleanupStaleEntries(): void {
    const now = Date.now();
    let evicted = 0;

    // Clean up old click tracking entries
    for (const [commentId, timestamp] of this.clickTracker.entries()) {
      if (now - timestamp > this.CLICK_TRACKER_MAX_AGE) {
        this.clickTracker.delete(commentId);
        evicted++;
      }
    }

    // Clean up disabled buttons that no longer have timers
    // (This handles cases where timers completed but state wasn't cleared)
    for (const [commentId, isDisabled] of this.disabledButtons.entries()) {
      if (!isDisabled && !this.buttonStateTimers.has(commentId)) {
        this.disabledButtons.delete(commentId);
      }
    }

    if (evicted > 0) {
      console.log(`🧹 VoteDebouncer: Auto-cleanup evicted ${evicted} stale entries`);
      console.log(`📊 VoteDebouncer: Current state - ` +
        `clickTracker: ${this.clickTracker.size}, ` +
        `disabledButtons: ${this.disabledButtons.size}, ` +
        `pendingOps: ${this.pendingOperations.size}`);
    }
  }

  /**
   * 🔧 DEBUG: Get current state for debugging
   */
  getDebugState(): DebugState {
    return {
      disabledButtons: Array.from(this.disabledButtons.entries()),
      pendingOperations: Array.from(this.pendingOperations),
      clickTracker: Array.from(this.clickTracker.entries()),
      activeTimers: this.buttonStateTimers.size
    };
  }
}

/**
 * 🔧 INTERFACE: Debug state structure
 */
interface DebugState {
  disabledButtons: [string, boolean][];
  pendingOperations: string[];
  clickTracker: [string, number][];
  activeTimers: number;
}