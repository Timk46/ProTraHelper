import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, timer, Subject } from 'rxjs';
import { retry, catchError, takeUntil } from 'rxjs/operators';

// Services
import { EvaluationStateService } from './evaluation-state.service';
import { LegacyVoteAdapter } from './legacy-vote.adapter';

// DTOs
import { VoteType, VoteLimitResponseDTO, EvaluationCommentDTO } from '@DTOs/index';


/**
 * Result of a vote operation
 */
export interface VoteResult {
  success: boolean;
  voteCount?: number;
  error?: string;
}

/**
 * Vote state for a specific comment
 */
interface CommentVoteState {
  voteStatus: BehaviorSubject<VoteType | null>;
  voteCount: BehaviorSubject<number>;
  loading: BehaviorSubject<boolean>;
  error: BehaviorSubject<string | null>;
  pendingOperations: number;
  expectedVoteCount: number;
  operationLock: boolean;
  operationTimeout: any;
  refCount: number; // 🔧 BLOCKER 1 FIX: Reference counting for lifecycle management
  lastAccessed: number; // 🔧 BLOCKER 1 FIX: Timestamp for stale state detection
}

/**
 * 🎯 CommentVoteManagerService
 *
 * Centralized service for managing vote operations on evaluation comments.
 * Extracted from CommentItemComponent to improve separation of concerns.
 *
 * Features:
 * - Atomic vote operations with race condition prevention
 * - Multi-source vote status loading (local data, API fallback)
 * - Vote count extraction with 4-priority fallback system
 * - Smart synchronization with backend
 * - Retry mechanism with exponential backoff
 * - Session vote tracking integration
 *
 * @architecture
 * This service follows HEFL best practices by:
 * - Using DTOs from @DTOs/index
 * - Providing Observable-based reactive API
 * - Implementing proper error handling
 * - Supporting atomic operations
 */
@Injectable({
  providedIn: 'root'
})
export class CommentVoteManagerService {
  /**
   * Map of comment states - key is commentId as string
   */
  private commentStates = new Map<string, CommentVoteState>();

  /**
   * Global destroy subject for cleanup
   */
  private destroy$ = new Subject<void>();

  /**
   * 🔧 BLOCKER 1 FIX: Auto-cleanup interval for memory leak prevention
   * Runs every 5 minutes to clean up stale comment states
   */
  private cleanupInterval: any;

  /**
   * 🔧 BLOCKER 1 FIX: Cleanup threshold (10 minutes of inactivity)
   */
  private readonly STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

  constructor(
    private evaluationStateService: EvaluationStateService,
    private legacyVoteAdapter: LegacyVoteAdapter,
  ) {
    // 🔧 BLOCKER 1 FIX: Start auto-cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleStates();
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('✅ CommentVoteManagerService initialized with auto-cleanup');
  }

  // =============================================================================
  // PUBLIC API - Observable Streams
  // =============================================================================

  /**
   * Get observable stream for vote status of a comment
   */
  getVoteStatus$(commentId: string): Observable<VoteType | null> {
    return this.getOrCreateState(commentId).voteStatus.asObservable();
  }

  /**
   * Get observable stream for vote count of a comment
   */
  getVoteCount$(commentId: string): Observable<number> {
    return this.getOrCreateState(commentId).voteCount.asObservable();
  }

  /**
   * Get observable stream for loading state of a comment
   */
  getLoadingState$(commentId: string): Observable<boolean> {
    return this.getOrCreateState(commentId).loading.asObservable();
  }

  /**
   * Get observable stream for error state of a comment
   */
  getError$(commentId: string): Observable<string | null> {
    return this.getOrCreateState(commentId).error.asObservable();
  }

  /**
   * 🔧 BLOCKER 3 FIX: Get observable stream for local vote count
   * This is the same as getVoteCount$ but with explicit naming for migration clarity
   */
  getLocalVoteCount$(commentId: string): Observable<number> {
    return this.getVoteCount$(commentId);
  }

  /**
   * 🔧 BLOCKER 3 FIX: Get observable stream for pending operations state
   * Returns true if there are any pending vote operations
   */
  hasPendingOperations$(commentId: string): Observable<boolean> {
    const state = this.getOrCreateState(commentId);
    // Return loading state as a proxy for pending operations
    return state.loading.asObservable();
  }

  // =============================================================================
  // PUBLIC API - Vote Operations
  // =============================================================================

  /**
   * Add a vote to a comment (atomic operation with race prevention)
   *
   * @param commentId - The comment ID to vote on
   * @param anonymousUserId - The ID of the anonymous user voting
   * @param submissionId - The submission ID (required for vote limits)
   * @param categoryId - The category ID (required for vote limits)
   * @returns Promise<VoteResult> with success status and vote count
   */
  async addVote(commentId: string, anonymousUserId: string | number, submissionId: number, categoryId: number): Promise<VoteResult> {
    const state = this.getOrCreateState(commentId);

    // 🔒 Race Prevention: Check debouncing
    if (!this.legacyVoteAdapter.shouldAllowClick(Number(commentId))) {
      console.log('🚫 Vote blocked by debouncer');
      return { success: false, error: 'Vote blocked by debouncer' };
    }

    // 🔒 Race Prevention: Check atomic lock
    if (state.operationLock) {
      console.warn('🔒 Vote operation already in progress, blocking duplicate');
      return { success: false, error: 'Operation already in progress' };
    }

    // 🔒 Race Prevention: Start operation
    if (!this.legacyVoteAdapter.startOperation(Number(commentId))) {
      console.log('🚫 Vote blocked - operation already pending');
      return { success: false, error: 'Operation already pending' };
    }

    // Set atomic lock
    state.operationLock = true;
    state.loading.next(true);

    try {
      const result = await this.performVoteOperation(commentId, 'UP', anonymousUserId, submissionId, categoryId);
      return result;
    } finally {
      // Clear lock after delay
      state.operationTimeout = setTimeout(() => {
        state.operationLock = false;
      }, 200);
      state.loading.next(false);
    }
  }

  /**
   * Remove a vote from a comment (atomic operation with race prevention)
   *
   * @param commentId - The comment ID to remove vote from
   * @param anonymousUserId - The ID of the anonymous user
   * @param submissionId - The submission ID (required for vote limits)
   * @param categoryId - The category ID (required for vote limits)
   * @returns Promise<VoteResult> with success status and vote count
   */
  async removeVote(commentId: string, anonymousUserId: string | number, submissionId: number, categoryId: number): Promise<VoteResult> {
    const state = this.getOrCreateState(commentId);

    // 🔒 Race Prevention: Check debouncing
    if (!this.legacyVoteAdapter.shouldAllowClick(Number(commentId))) {
      console.log('🚫 Vote removal blocked by debouncer');
      return { success: false, error: 'Vote removal blocked by debouncer' };
    }

    // 🔒 Race Prevention: Check if vote count is zero
    if (state.voteCount.value === 0) {
      return { success: false, error: 'No votes to remove' };
    }

    // 🔒 Race Prevention: Check atomic lock
    if (state.operationLock) {
      console.warn('🔒 Vote removal operation already in progress');
      return { success: false, error: 'Operation already in progress' };
    }

    // 🔒 Race Prevention: Start operation
    if (!this.legacyVoteAdapter.startOperation(Number(commentId))) {
      console.log('🚫 Vote removal blocked - operation already pending');
      return { success: false, error: 'Operation already pending' };
    }

    // Set atomic lock
    state.operationLock = true;
    state.loading.next(true);

    try {
      const result = await this.performVoteOperation(commentId, null, anonymousUserId, submissionId, categoryId);
      return result;
    } finally {
      // Clear lock after delay
      state.operationTimeout = setTimeout(() => {
        state.operationLock = false;
      }, 200);
      state.loading.next(false);
    }
  }

  // =============================================================================
  // PUBLIC API - Initialization & Cleanup
  // =============================================================================

  /**
   * Initialize vote state for a comment
   *
   * @param commentId - The comment ID to initialize
   * @param comment - The comment DTO with vote data
   * @param anonymousUserId - The ID of the anonymous user
   */
  initializeComment(commentId: string, comment: EvaluationCommentDTO, anonymousUserId?: string | number): void {
    const state = this.getOrCreateState(commentId);

    // Load vote status from local data
    const localVote = this.getUserVoteFromLocal(comment, anonymousUserId);
    state.voteStatus.next(localVote);

    // Extract vote count from local data
    const localVoteCount = this.extractVoteCountFromLocalData(comment, anonymousUserId);
    state.voteCount.next(localVoteCount);

    // Load from API as fallback
    if (localVote === null) {
      this.loadUserVoteStatus(commentId);
    }

    console.log('🚀 Vote state initialized:', {
      commentId,
      voteStatus: localVote,
      voteCount: localVoteCount,
      source: 'local-data'
    });
  }

  /**
   * Reset state for a comment (cleanup)
   */
  resetCommentState(commentId: string): void {
    const state = this.commentStates.get(commentId);
    if (state) {
      // Clear timeout
      if (state.operationTimeout) {
        clearTimeout(state.operationTimeout);
      }

      // Complete subjects
      state.voteStatus.complete();
      state.voteCount.complete();
      state.loading.complete();
      state.error.complete();

      // Remove from map
      this.commentStates.delete(commentId);

      // Reset legacy adapter state
      this.legacyVoteAdapter.resetCommentState(Number(commentId));

      console.log('🧹 Comment state cleaned up:', commentId);
    }
  }

  /**
   * 🔧 BLOCKER 1 FIX: Increment reference count for a comment
   * Should be called when a component starts using this comment state
   */
  incrementRefCount(commentId: string): void {
    const state = this.getOrCreateState(commentId);
    state.refCount++;
    console.log(`📊 RefCount incremented for ${commentId}: ${state.refCount}`);
  }

  /**
   * 🔧 BLOCKER 1 FIX: Decrement reference count for a comment
   * Should be called when a component stops using this comment state (ngOnDestroy)
   */
  decrementRefCount(commentId: string): void {
    const state = this.commentStates.get(commentId);
    if (state) {
      state.refCount = Math.max(0, state.refCount - 1);
      console.log(`📊 RefCount decremented for ${commentId}: ${state.refCount}`);

      // If refCount reaches 0 and state is stale, cleanup immediately
      if (state.refCount === 0 && Date.now() - state.lastAccessed > this.STALE_THRESHOLD) {
        console.log(`🧹 Immediate cleanup for ${commentId} (refCount=0, stale)`);
        this.resetCommentState(commentId);
      }
    }
  }

  /**
   * Cleanup all states
   */
  ngOnDestroy(): void {
    // 🔧 BLOCKER 1 FIX: Clear auto-cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Auto-cleanup interval stopped');
    }

    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup all comment states
    this.commentStates.forEach((state, commentId) => {
      this.resetCommentState(commentId);
    });
    this.commentStates.clear();
  }

  // =============================================================================
  // PRIVATE METHODS - State Management
  // =============================================================================

  /**
   * 🔧 BLOCKER 1 FIX: Cleanup stale comment states
   * Called periodically by cleanup interval
   * Removes states that have refCount=0 and haven't been accessed for STALE_THRESHOLD
   */
  private cleanupStaleStates(): void {
    const now = Date.now();
    const staleComments: string[] = [];

    // Find all stale comments
    for (const [commentId, state] of this.commentStates.entries()) {
      if (state.refCount === 0 && now - state.lastAccessed > this.STALE_THRESHOLD) {
        staleComments.push(commentId);
      }
    }

    // Cleanup stale comments
    if (staleComments.length > 0) {
      console.log(`🧹 Cleaning up ${staleComments.length} stale comment states:`, staleComments);
      staleComments.forEach(commentId => this.resetCommentState(commentId));
    } else {
      console.log('✅ No stale states to cleanup');
    }

    console.log(`📊 Active comment states: ${this.commentStates.size}`);
  }

  /**
   * Get or create vote state for a comment
   * 🔧 BLOCKER 1 FIX: Now tracks refCount and lastAccessed for auto-cleanup
   */
  private getOrCreateState(commentId: string): CommentVoteState {
    if (!this.commentStates.has(commentId)) {
      this.commentStates.set(commentId, {
        voteStatus: new BehaviorSubject<VoteType | null>(null),
        voteCount: new BehaviorSubject<number>(0),
        loading: new BehaviorSubject<boolean>(false),
        error: new BehaviorSubject<string | null>(null),
        pendingOperations: 0,
        expectedVoteCount: 0,
        operationLock: false,
        operationTimeout: null,
        refCount: 1, // 🔧 BLOCKER 1 FIX: Initial reference
        lastAccessed: Date.now() // 🔧 BLOCKER 1 FIX: Track access time
      });
    } else {
      // 🔧 BLOCKER 1 FIX: Update lastAccessed on every access
      const state = this.commentStates.get(commentId)!;
      state.lastAccessed = Date.now();
    }
    return this.commentStates.get(commentId)!;
  }

  // =============================================================================
  // PRIVATE METHODS - Vote Operations
  // =============================================================================

  /**
   * Perform vote operation (UP or null for remove)
   *
   * 🔧 NOTE: This method uses LegacyVoteAdapter which internally calls
   * evaluationStateService.voteCommentWithEnhancedLimits()
   */
  private async performVoteOperation(
    commentId: string,
    voteType: VoteType,
    anonymousUserId: string | number,
    submissionId: number,
    categoryId: number
  ): Promise<VoteResult> {
    const state = this.getOrCreateState(commentId);

    state.pendingOperations++;

    // Update expected vote count
    if (voteType === 'UP') {
      state.expectedVoteCount = state.voteCount.value + 1;
    } else {
      state.expectedVoteCount = Math.max(0, state.voteCount.value - 1);
    }

    try {
      // 🔧 FIX: Use voteCommentWithEnhancedLimits instead of submitVote
      // Note: Method signature is (commentId, voteType, categoryId) - no submissionId needed
      const result = await this.evaluationStateService.voteCommentWithEnhancedLimits(
        commentId,
        voteType,
        categoryId
      ).toPromise();

      // Update state from result
      this.onVoteCompleted(commentId, result);

      state.pendingOperations--;

      return {
        success: true,
        voteCount: state.voteCount.value
      };
    } catch (error) {
      console.error('❌ Vote operation failed:', error);

      state.pendingOperations--;
      state.error.next(error instanceof Error ? error.message : 'Vote operation failed');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Vote operation failed'
      };
    }
  }

  /**
   * Handle vote completion event
   */
  private onVoteCompleted(commentId: string, voteResult: VoteLimitResponseDTO | unknown): void {
    const state = this.getOrCreateState(commentId);

    // Extract vote count from result
    const extractedCount = this.extractVoteCountFromResponse(voteResult);

    if (extractedCount !== null) {
      state.voteCount.next(extractedCount);

      // Perform smart sync
      this.performFinalSynchronization(commentId, state);
    }
  }

  /**
   * Smart synchronization - reconcile expected vs actual vote count
   */
  private performFinalSynchronization(commentId: string, state: CommentVoteState): void {
    const expected = state.expectedVoteCount;
    const actual = state.voteCount.value;

    if (expected !== actual) {
      console.warn('⚠️ Vote count mismatch detected:', {
        commentId,
        expected,
        actual,
        difference: actual - expected
      });

      // Race condition detected - use actual count from backend
      state.expectedVoteCount = actual;
    }
  }

  // =============================================================================
  // PRIVATE METHODS - Vote Status Loading
  // =============================================================================

  /**
   * Load user vote status from API with retry mechanism
   */
  private loadUserVoteStatus(commentId: string): void {
    const state = this.getOrCreateState(commentId);

    state.loading.next(true);

    this.evaluationStateService
      .getUserVoteStatus(commentId)
      .pipe(
        retry({ count: 2, delay: (error, retryCount) => timer(Math.pow(2, retryCount) * 1000) }),
        catchError((error: any) => {
          console.error('❌ Failed to load user vote status after retries:', {
            commentId,
            error: error,
            errorMessage: error?.message,
            errorStatus: error?.status
          });
          state.loading.next(false);
          state.error.next('Failed to load vote status');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (voteType: VoteType | null) => {
          state.loading.next(false);
          state.voteStatus.next(voteType);
          console.log('✅ Vote status loaded from API:', {
            commentId,
            voteType
          });
        }
      });
  }

  /**
   * Get user vote from local comment data (votes array)
   */
  private getUserVoteFromLocal(comment: EvaluationCommentDTO, anonymousUserId?: string | number): VoteType | null {
    if (!anonymousUserId) return null;

    const userVote = comment.votes.find(
      (vote: any) => vote.userId === Number(anonymousUserId)
    );

    return userVote ? userVote.voteType : null;
  }

  /**
   * Extract vote count from local comment data
   * 4-priority fallback system:
   * 1. Direct userVoteCount property
   * 2. voteDetails.userVoteCounts
   * 3. voteStats.userVoteCount (legacy)
   * 4. Count votes array
   *
   * 🔧 BLOCKER 2 FIX: Made public so components can use it for vote count extraction
   */
  public extractVoteCountFromLocalData(comment: EvaluationCommentDTO, anonymousUserId?: string | number): number {
    if (!anonymousUserId) return 0;

    // PRIORITY 1: Direct userVoteCount
    if (typeof (comment as any).userVoteCount === 'number') {
      return (comment as any).userVoteCount;
    }

    // PRIORITY 2: voteDetails.userVoteCounts
    const voteDetails = (comment as any).voteDetails;
    if (voteDetails?.userVoteCounts) {
      const userVoteData = voteDetails.userVoteCounts.find(
        (vc: any) => vc.userId === Number(anonymousUserId)
      );
      if (userVoteData && typeof userVoteData.voteCount === 'number') {
        return userVoteData.voteCount;
      }
    }

    // PRIORITY 3: voteStats.userVoteCount (legacy) - REMOVED
    // 🔧 FIX: voteStats doesn't have userVoteCount property according to DTO
    // userVoteCount is directly on comment, not on voteStats

    // PRIORITY 4: Count votes array
    const userVotes = comment.votes.filter(
      (vote: any) => vote.userId === Number(anonymousUserId) && vote.voteType === 'UP'
    );
    return userVotes.length;
  }

  /**
   * Extract vote count from vote operation response
   */
  private extractVoteCountFromResponse(voteResult: VoteLimitResponseDTO | unknown): number | null {
    if (!voteResult) return null;

    const result = voteResult as any;

    // Try different response structures
    if (typeof result.userVoteCount === 'number') {
      return result.userVoteCount;
    }

    if (result.comment?.userVoteCount !== undefined) {
      return result.comment.userVoteCount;
    }

    if (result.voteCount !== undefined) {
      return result.voteCount;
    }

    return null;
  }
}
