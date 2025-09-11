import { Injectable } from '@angular/core';
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
export class VoteDebounceService {
  // 🔧 BUTTON STATE: Track disabled buttons per comment
  private disabledButtons = new Map<string, boolean>();
  private buttonStateTimers = new Map<string, any>();

  // 🔧 CLICK TRACKING: Prevent rapid-fire clicking
  private clickTracker = new Map<string, number>();
  private readonly CLICK_THRESHOLD = 300; // ms between allowed clicks

  // 🔧 OPERATION TRACKING: Prevent concurrent operations on same comment
  private pendingOperations = new Set<string>();

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
    
    // Clear all timers
    this.buttonStateTimers.forEach(timer => clearTimeout(timer));
    
    // Clear all maps
    this.disabledButtons.clear();
    this.buttonStateTimers.clear();
    this.clickTracker.clear();
    this.pendingOperations.clear();
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