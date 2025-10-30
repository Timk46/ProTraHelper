import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Global service to track session votes across all categories and components
 * This ensures vote limits are enforced consistently across the entire discussion forum
 */
@Injectable({
  providedIn: 'root'
})
export class VoteSessionService implements OnDestroy {

  private readonly STORAGE_KEY = 'hefl_vote_session';

  /**
   * Global session vote counter - tracks total votes given in current session
   * This persists across component instances and categories AND page refreshes
   */
  private sessionVotesGivenSubject = new BehaviorSubject<number>(this.loadSessionVotes());

  /**
   * Observable stream of session votes for components to subscribe to
   */
  public sessionVotesGiven$: Observable<number> = this.sessionVotesGivenSubject.asObservable();

  /**
   * Debounced localStorage save stream to batch writes and prevent blocking
   */
  private saveDebouncer = new Subject<number>();

  constructor() {
    // Setup debounced localStorage writes (batch writes every 500ms)
    this.saveDebouncer.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(count => {
      try {
        localStorage.setItem(this.STORAGE_KEY, count.toString());
      } catch (error) {
        console.warn('Failed to save session votes to localStorage:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.saveDebouncer.complete();
  }

  /**
   * Get current session vote count
   */
  getSessionVotes(): number {
    return this.sessionVotesGivenSubject.value;
  }

  /**
   * Load session votes from localStorage on service initialization
   */
  private loadSessionVotes(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.warn('Failed to load session votes from localStorage:', error);
      return 0;
    }
  }

  /**
   * Save session votes to localStorage for persistence across page refreshes
   * Uses debouncing to batch writes and prevent UI blocking
   */
  private saveSessionVotes(count: number): void {
    this.saveDebouncer.next(count);
  }

  /**
   * Add a vote to the session counter with persistence
   */
  addSessionVote(): void {
    const current = this.sessionVotesGivenSubject.value;
    const newValue = current + 1;
    this.sessionVotesGivenSubject.next(newValue);
    this.saveSessionVotes(newValue);
  }

  /**
   * Remove a vote from the session counter (when vote is removed) with persistence
   */
  removeSessionVote(): void {
    const current = this.sessionVotesGivenSubject.value;
    const newValue = Math.max(0, current - 1);
    this.sessionVotesGivenSubject.next(newValue);
    this.saveSessionVotes(newValue);
  }

  /**
   * Reset session votes (called when forum is refreshed/reloaded or new session starts)
   */
  resetSessionVotes(): void {
    this.sessionVotesGivenSubject.next(0);
    this.saveSessionVotes(0);
  }

  /**
   * Initialize session votes from backend data
   * Called on component init with actual vote count from database
   * @param votedCommentCount Number of votes already given (from backend)
   */
  initializeFromBackend(votedCommentCount: number): void {
    this.sessionVotesGivenSubject.next(votedCommentCount);
    this.saveSessionVotes(votedCommentCount);
    console.log(`📊 Session votes initialized from backend: ${votedCommentCount}`);
  }

  /**
   * Calculate effective available votes considering session votes
   * @param baseAvailableVotes Base available votes from server
   * @returns Effective available votes after session votes
   */
  getEffectiveAvailableVotes(baseAvailableVotes: number): number {
    const sessionVotes = this.getSessionVotes();
    return Math.max(0, baseAvailableVotes - sessionVotes);
  }

  /**
   * Check if more votes can be given
   * @param baseAvailableVotes Base available votes from server
   * @returns True if more votes can be given
   */
  canGiveMoreVotes(baseAvailableVotes: number): boolean {
    return this.getEffectiveAvailableVotes(baseAvailableVotes) > 0;
  }
}