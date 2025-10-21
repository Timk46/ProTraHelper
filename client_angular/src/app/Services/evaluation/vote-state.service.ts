import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, firstValueFrom } from 'rxjs';
import { filter, takeUntil, catchError, tap } from 'rxjs/operators';
import {
  VoteType,
  VoteLimitResponseDTO,
  RatingStatsDTO,
  VoteLimitStatusDTO
} from '@DTOs/index';
import { LRUCache } from '../../utils/lru-cache';
import { VoteCoreService } from './vote-core.service';
import { EvaluationRealtimeService, VoteEvent } from './evaluation-realtime.service';
import { EvaluationStateService } from './evaluation-state.service';

/**
 * Vote operation for queue management
 */
interface VoteOperation {
  commentId: number;
  voteType: VoteType;
  timestamp: number;
  priority: number;
  retryCount: number;
  categoryId?: number;
}

/**
 * Vote error information
 */
export interface VoteError {
  commentId: number;
  error: string | null;
  timestamp: number;
  code?: string;
}

/**
 * State management service for vote operations
 *
 * @description
 * Responsible for vote state management, caching, queue, and real-time updates.
 * Acts as the central state layer between backend (VoteCoreService) and UI (VoteUIStateService).
 *
 * Architecture:
 * - Layer 2 of 3-service architecture
 * - Uses: VoteCoreService (for HTTP), EvaluationRealtimeService (for Socket.io)
 * - Used by: VoteUIStateService
 *
 * Responsibilities:
 * - LRU cache management for votes and stats
 * - Priority queue for vote operations
 * - Retry logic with exponential backoff
 * - Real-time socket event handling
 * - Cache invalidation on real-time updates
 *
 * @memberof EvaluationModule
 */
@Injectable({
  providedIn: 'root'
})
export class VoteStateService implements OnDestroy {

  private destroy$ = new Subject<void>();

  // =============================================================================
  // CACHE MANAGEMENT (Layer 1)
  // =============================================================================

  /**
   * LRU cache for user vote counts per comment
   * Max 200 comments - automatically evicts least recently used entries
   */
  private voteCache = new LRUCache<number, BehaviorSubject<number>>(
    200,
    (commentId: number, subject: BehaviorSubject<number>) => {
      subject.complete();
      console.log(`🧹 VoteStateService: LRU evicted vote cache for comment ${commentId}`);
    }
  );

  /**
   * LRU cache for rating statistics per category
   * Max 20 categories - sufficient for typical evaluation sessions
   */
  private statsCache = new LRUCache<string, BehaviorSubject<RatingStatsDTO | null>>(
    20,
    (key, subject) => {
      subject.complete();
      console.log(`🧹 VoteStateService: LRU evicted stats cache for ${key}`);
    }
  );

  /**
   * LRU cache for vote limit status per category
   * Max 20 categories
   */
  private voteLimitCache = new LRUCache<string, BehaviorSubject<VoteLimitStatusDTO | null>>(
    20,
    (key, subject) => {
      subject.complete();
      console.log(`🧹 VoteStateService: LRU evicted vote limit cache for ${key}`);
    }
  );

  // =============================================================================
  // QUEUE MANAGEMENT (Layer 2)
  // =============================================================================

  /**
   * Priority queue for vote operations
   * Higher priority = processed first
   */
  private voteQueue: VoteOperation[] = [];

  /**
   * Flag indicating queue processing is in progress
   */
  private isProcessingQueue = false;

  /**
   * Maximum retry attempts for failed vote operations
   */
  private readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Base delay for exponential backoff (ms)
   */
  private readonly RETRY_BASE_DELAY = 1000;

  // =============================================================================
  // ERROR HANDLING (Layer 3)
  // =============================================================================

  /**
   * Subject for vote errors
   */
  private errorState$ = new Subject<VoteError>();

  /**
   * Observable for vote errors
   */
  public get onVoteError$(): Observable<VoteError> {
    return this.errorState$.asObservable();
  }

  // =============================================================================
  // CONSTRUCTOR & INITIALIZATION
  // =============================================================================

  constructor(
    private voteCoreService: VoteCoreService,
    private realtimeService: EvaluationRealtimeService,
    private evaluationStateService: EvaluationStateService
  ) {
    this.setupRealtimeListeners();
  }

  // =============================================================================
  // PUBLIC API - VOTE OPERATIONS
  // =============================================================================

  /**
   * Submits a vote to the queue for processing
   *
   * @description
   * Adds vote to priority queue and triggers processing.
   * Returns immediately - actual submission happens asynchronously.
   *
   * @param commentId - Comment identifier (number)
   * @param voteType - Vote type ('UP' or null)
   * @param categoryId - Optional category identifier for priority calculation
   * @returns Promise that resolves when vote is submitted
   *
   * @example
   * ```typescript
   * await this.voteStateService.submitVote(123, 'UP', 5);
   * ```
   */
  async submitVote(commentId: number, voteType: VoteType, categoryId?: number): Promise<void> {
    console.log(`🗳️ VoteStateService: Queuing ${voteType || 'remove'} vote for comment ${commentId}`);

    const operation: VoteOperation = {
      commentId,
      voteType,
      timestamp: Date.now(),
      priority: this.calculatePriority(commentId, categoryId),
      retryCount: 0,
      categoryId
    };

    this.enqueueOperation(operation);
    await this.processQueue();
  }

  /**
   * Gets observable for current vote count of a comment
   *
   * @description
   * Returns cached observable if available, otherwise creates new one
   * and triggers backend load.
   *
   * @param commentId - Comment identifier (number)
   * @returns Observable with vote count (0 if not yet loaded)
   *
   * @example
   * ```typescript
   * this.voteStateService.getVoteCount$(123).subscribe(
   *   count => console.log('Vote count:', count)
   * );
   * ```
   */
  getVoteCount$(commentId: number): Observable<number> {
    let cached = this.voteCache.get(commentId);

    if (!cached) {
      cached = new BehaviorSubject<number>(0);
      this.voteCache.set(commentId, cached);

      console.log(`📊 VoteStateService: Vote count for ${commentId} not in cache, initializing`);
    }

    return cached.asObservable();
  }

  /**
   * Gets observable for rating statistics of a category
   *
   * @description
   * Returns cached observable if available, otherwise creates new one
   * and triggers backend load.
   *
   * @param submissionId - Submission identifier
   * @param categoryId - Category identifier
   * @returns Observable with rating stats (null until loaded)
   *
   * @example
   * ```typescript
   * this.voteStateService.getRatingStats$(123, 5).pipe(
   *   filter(stats => stats !== null)
   * ).subscribe(stats => console.log('Average:', stats.averageScore));
   * ```
   */
  getRatingStats$(submissionId: number, categoryId: number): Observable<RatingStatsDTO | null> {
    const key = this.getStatsCacheKey(submissionId, categoryId);
    let cached = this.statsCache.get(key);

    if (!cached) {
      cached = new BehaviorSubject<RatingStatsDTO | null>(null);
      this.statsCache.set(key, cached);

      // Trigger backend load
      this.loadRatingStatsFromBackend(submissionId, categoryId);
    }

    return cached.asObservable();
  }

  /**
   * Gets observable for vote limit status of a category
   *
   * @param submissionId - Submission identifier
   * @param categoryId - Category identifier
   * @returns Observable with vote limit status (null until loaded)
   */
  getVoteLimitStatus$(submissionId: number, categoryId: number): Observable<VoteLimitStatusDTO | null> {
    const key = this.getVoteLimitCacheKey(submissionId, categoryId);
    let cached = this.voteLimitCache.get(key);

    if (!cached) {
      cached = new BehaviorSubject<VoteLimitStatusDTO | null>(null);
      this.voteLimitCache.set(key, cached);

      // Trigger backend load
      this.loadVoteLimitStatusFromBackend(submissionId, categoryId);
    }

    return cached.asObservable();
  }

  // =============================================================================
  // PUBLIC API - CACHE MANAGEMENT
  // =============================================================================

  /**
   * Invalidates vote cache for specific comment
   *
   * @description
   * Removes comment from cache, forcing fresh load on next access.
   * Called by UI layer or in response to real-time events.
   *
   * @param commentId - Comment identifier (number)
   */
  invalidateVoteCache(commentId: number): void {
    console.log(`🧹 VoteStateService: Invalidating vote cache for ${commentId}`);
    this.voteCache.delete(commentId);
  }

  /**
   * Invalidates rating stats cache for specific category
   *
   * @param submissionId - Submission identifier
   * @param categoryId - Category identifier
   */
  invalidateStatsCache(submissionId: number, categoryId: number): void {
    const key = this.getStatsCacheKey(submissionId, categoryId);
    console.log(`🧹 VoteStateService: Invalidating stats cache for ${key}`);
    this.statsCache.delete(key);
  }

  /**
   * Invalidates vote limit cache for specific category
   *
   * @param submissionId - Submission identifier
   * @param categoryId - Category identifier
   */
  invalidateVoteLimitCache(submissionId: number, categoryId: number): void {
    const key = this.getVoteLimitCacheKey(submissionId, categoryId);
    console.log(`🧹 VoteStateService: Invalidating vote limit cache for ${key}`);
    this.voteLimitCache.delete(key);
  }

  /**
   * Updates vote cache with new value
   *
   * @description
   * Used by UI layer for optimistic updates or after successful vote.
   *
   * @param commentId - Comment identifier (number)
   * @param voteCount - New vote count
   */
  updateVoteCache(commentId: number, voteCount: number): void {
    let cached = this.voteCache.get(commentId);

    if (!cached) {
      cached = new BehaviorSubject<number>(voteCount);
      this.voteCache.set(commentId, cached);
    } else {
      cached.next(voteCount);
    }

    console.log(`✅ VoteStateService: Updated vote cache for ${commentId} = ${voteCount}`);
  }

  // =============================================================================
  // QUEUE PROCESSING (Private)
  // =============================================================================

  /**
   * Adds operation to queue with priority sorting
   */
  private enqueueOperation(operation: VoteOperation): void {
    this.voteQueue.push(operation);

    // Sort by priority (higher first), then by timestamp (older first)
    this.voteQueue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    console.log(`📋 VoteStateService: Operation queued. Queue size: ${this.voteQueue.length}`);
  }

  /**
   * Processes vote queue with retry logic
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      console.log('⏳ VoteStateService: Queue processing already in progress');
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 VoteStateService: Processing queue (${this.voteQueue.length} operations)`);

    while (this.voteQueue.length > 0) {
      const operation = this.voteQueue.shift()!;

      try {
        await this.executeVoteOperation(operation);
      } catch (error) {
        await this.handleVoteOperationError(operation, error);
      }
    }

    this.isProcessingQueue = false;
    console.log('✅ VoteStateService: Queue processing completed');
  }

  /**
   * Executes single vote operation with timeout
   */
  private async executeVoteOperation(operation: VoteOperation): Promise<void> {
    const timeoutMs = 5000;

    console.log(`🗳️ VoteStateService: Executing vote for ${operation.commentId} (attempt ${operation.retryCount + 1})`);

    const votePromise = firstValueFrom(
      this.voteCoreService.submitVote(operation.commentId, operation.voteType)
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Vote operation timeout')), timeoutMs)
    );

    const result = await Promise.race([votePromise, timeoutPromise]) as VoteLimitResponseDTO;

    // Update cache with new vote count
    if (result.userVoteCount !== undefined) {
      this.updateVoteCache(operation.commentId, result.userVoteCount);
    }

    // Invalidate vote limit cache for category
    if (operation.categoryId) {
      // Get submissionId from evaluationStateService if available
      // For now, we don't have it in the operation, so we skip cache invalidation
      // This will be handled by real-time events
    }

    console.log(`✅ VoteStateService: Vote executed successfully for ${operation.commentId}`);
  }

  /**
   * Handles vote operation errors with exponential backoff retry
   */
  private async handleVoteOperationError(operation: VoteOperation, error: any): Promise<void> {
    console.error(`❌ VoteStateService: Vote operation failed for ${operation.commentId}:`, error);

    if (operation.retryCount < this.MAX_RETRY_ATTEMPTS) {
      // Calculate exponential backoff delay
      const delayMs = this.RETRY_BASE_DELAY * Math.pow(2, operation.retryCount);

      console.warn(`🔄 VoteStateService: Retrying vote for ${operation.commentId} in ${delayMs}ms (attempt ${operation.retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);

      await this.delay(delayMs);

      // Increment retry count and increase priority
      operation.retryCount++;
      operation.priority++;

      // Re-queue operation
      this.enqueueOperation(operation);
    } else {
      console.error(`❌ VoteStateService: Vote failed after ${this.MAX_RETRY_ATTEMPTS} retries for ${operation.commentId}`);

      // Emit error event
      this.errorState$.next({
        commentId: operation.commentId,
        error: error?.message || 'Vote konnte nicht gespeichert werden',
        timestamp: Date.now(),
        code: error?.code
      });
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculates priority for vote operation
   * Higher priority for retries and recent operations
   */
  private calculatePriority(commentId: number, categoryId?: number): number {
    // Base priority
    let priority = 1;

    // Increase priority for operations in current category
    // (This would require knowing current category from context)

    return priority;
  }

  // =============================================================================
  // BACKEND LOADING (Private)
  // =============================================================================

  /**
   * Loads rating stats from backend
   */
  private loadRatingStatsFromBackend(submissionId: number, categoryId: number): void {
    const key = this.getStatsCacheKey(submissionId, categoryId);

    console.log(`📊 VoteStateService: Loading rating stats from backend for ${key}`);

    this.voteCoreService.loadRatingStats(submissionId, categoryId).pipe(
      takeUntil(this.destroy$),
      tap(stats => {
        const cached = this.statsCache.get(key);
        if (cached) {
          cached.next(stats);
          console.log(`✅ VoteStateService: Rating stats loaded for ${key}`);
        }
      }),
      catchError(error => {
        console.error(`❌ VoteStateService: Failed to load rating stats for ${key}:`, error);
        return [];
      })
    ).subscribe();
  }

  /**
   * Loads vote limit status from backend
   */
  private loadVoteLimitStatusFromBackend(submissionId: number, categoryId: number): void {
    const key = this.getVoteLimitCacheKey(submissionId, categoryId);

    console.log(`📊 VoteStateService: Loading vote limit status from backend for ${key}`);

    this.voteCoreService.loadVoteLimitStatus(submissionId, categoryId).pipe(
      takeUntil(this.destroy$),
      tap(status => {
        const cached = this.voteLimitCache.get(key);
        if (cached) {
          cached.next(status);
          console.log(`✅ VoteStateService: Vote limit status loaded for ${key}`);
        }
      }),
      catchError(error => {
        console.error(`❌ VoteStateService: Failed to load vote limit status for ${key}:`, error);
        return [];
      })
    ).subscribe();
  }

  // =============================================================================
  // REAL-TIME SUBSCRIPTIONS (Layer 4)
  // =============================================================================

  /**
   * Sets up real-time event listeners
   */
  private setupRealtimeListeners(): void {
    console.log('🔌 VoteStateService: Setting up real-time listeners');

    // Listen for vote updates from other users
    this.realtimeService.subscribeToVotes().pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      this.handleRemoteVoteUpdate(event);
    });

    console.log('✅ VoteStateService: Real-time listeners configured');
  }

  /**
   * Handles remote vote update from socket
   */
  private handleRemoteVoteUpdate(event: VoteEvent): void {
    if (!event.commentId) return;

    const commentId = event.commentId; // Already a number from VoteEvent DTO
    console.log(`🔄 VoteStateService: Remote vote update for comment ${commentId}`);

    // Invalidate cache for affected comment
    this.invalidateVoteCache(commentId);

    // If we have voteData with updated count, update cache directly
    if (event.voteData && 'totalVotes' in event.voteData) {
      const voteData = event.voteData as VoteUpdateData;
      if (typeof voteData.totalVotes === 'number') {
        this.updateVoteCache(commentId, voteData.totalVotes);
      }
    }
  }

  // =============================================================================
  // HELPERS
  // =============================================================================

  /**
   * Generates cache key for rating stats
   */
  private getStatsCacheKey(submissionId: number, categoryId: number): string {
    return `stats-${submissionId}-${categoryId}`;
  }

  /**
   * Generates cache key for vote limit status
   */
  private getVoteLimitCacheKey(submissionId: number, categoryId: number): string {
    return `limit-${submissionId}-${categoryId}`;
  }

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    console.log('🧹 VoteStateService: Cleaning up');

    // Complete all subjects
    this.destroy$.next();
    this.destroy$.complete();
    this.errorState$.complete();

    // Clear all caches (calls onEvict for each entry)
    this.voteCache.clear();
    this.statsCache.clear();
    this.voteLimitCache.clear();

    // Clear queue
    this.voteQueue = [];

    console.log('✅ VoteStateService: Cleanup completed');
  }
}

/**
 * Interface: Vote update data from real-time events
 */
interface VoteUpdateData {
  commentId?: number | string;
  totalVotes: number;
  userVoteCount?: number;
}
