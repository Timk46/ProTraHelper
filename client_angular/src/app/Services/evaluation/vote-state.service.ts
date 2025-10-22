import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, firstValueFrom, EMPTY } from 'rxjs';
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
 * Vote error codes for categorization
 */
export enum VoteErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VOTE_LIMIT_EXCEEDED = 'VOTE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TIMEOUT = 'TIMEOUT',
  INVALID_OPERATION = 'INVALID_OPERATION',
  UNKNOWN = 'UNKNOWN'
}

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
  submissionId?: number;
}

/**
 * Vote error information
 */
export interface VoteError {
  commentId: number;
  error: string | null;
  timestamp: number;
  code: VoteErrorCode;
  retryCount?: number;
  isRetryable: boolean;
  httpStatus?: number;
}

/**
 * Vote update data from real-time events
 */
interface VoteUpdateData {
  commentId?: number | string;
  totalVotes: number;
  userVoteCount?: number;
}

/**
 * Cache metrics for monitoring
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  lastReset: number;
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
   * Cache metrics for monitoring performance
   */
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    lastReset: Date.now()
  };

  /**
   * Metrics logging frequency (every N operations)
   */
  private readonly METRICS_LOG_FREQUENCY = 100;

  /**
   * LRU cache for user vote counts per comment
   * Max 200 comments - automatically evicts least recently used entries
   */
  private voteCache = new LRUCache<number, BehaviorSubject<number>>(
    200,
    (commentId: number, subject: BehaviorSubject<number>) => {
      subject.complete();
      this.cacheMetrics.evictions++;
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

  /**
   * Batch size for concurrent vote processing
   */
  private readonly QUEUE_BATCH_SIZE = 5;

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
      this.cacheMetrics.misses++;
      cached = new BehaviorSubject<number>(0);
      this.voteCache.set(commentId, cached);

    } else {
      this.cacheMetrics.hits++;
    }

    // Log metrics periodically
    this.logCacheMetricsIfNeeded();

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

  }

  /**
   * Processes vote queue with retry logic and batching
   *
   * @description
   * Processes queue in batches for better performance.
   * Uses Promise.allSettled to process multiple operations concurrently.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      console.log('⏳ VoteStateService: Queue processing already in progress');
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.voteQueue.length > 0) {
        // Extract batch from queue
        const batch = this.voteQueue.splice(0, this.QUEUE_BATCH_SIZE);

        console.log(`📦 VoteStateService: Processing batch of ${batch.length} operations`);

        // Process batch concurrently
        const results = await Promise.allSettled(
          batch.map(async (operation) => {
            try {
              await this.executeVoteOperation(operation);
            } catch (error) {
              await this.handleVoteOperationError(operation, error);
            }
          })
        );

        // Log batch results
        const fulfilled = results.filter(r => r.status === 'fulfilled').length;
        const rejected = results.filter(r => r.status === 'rejected').length;
      }
    } finally {
      this.isProcessingQueue = false;
    }
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
    if (operation.categoryId && operation.submissionId) {
      this.invalidateVoteLimitCache(operation.submissionId, operation.categoryId);
    }

  }

  /**
   * Handles vote operation errors with exponential backoff retry
   */
  private async handleVoteOperationError(operation: VoteOperation, error: any): Promise<void> {
    console.error(`❌ VoteStateService: Vote operation failed for ${operation.commentId}:`, error);

    const errorCode = this.categorizeError(error);
    const isRetryable = this.isErrorRetryable(errorCode);

    if (isRetryable && operation.retryCount < this.MAX_RETRY_ATTEMPTS) {
      // Calculate exponential backoff delay
      const delayMs = this.RETRY_BASE_DELAY * Math.pow(2, operation.retryCount);


      await this.delay(delayMs);

      // Increment retry count and increase priority
      operation.retryCount++;
      operation.priority++;

      // Re-queue operation
      this.enqueueOperation(operation);
    } else {
      const reason = isRetryable
        ? `after ${this.MAX_RETRY_ATTEMPTS} retries`
        : 'error is not retryable';

      console.error(`❌ VoteStateService: Vote failed ${reason} for ${operation.commentId} - Code: ${errorCode}`);

      // Emit error event
      this.errorState$.next({
        commentId: operation.commentId,
        error: this.getErrorMessage(error, errorCode),
        timestamp: Date.now(),
        code: errorCode,
        retryCount: operation.retryCount,
        isRetryable,
        httpStatus: error?.status
      });
    }
  }

  /**
   * Categorizes error into specific error code
   */
  private categorizeError(error: any): VoteErrorCode {
    // Check for specific error codes from backend
    if (error?.code === 'VOTE_LIMIT_EXCEEDED' || error?.message?.includes('vote limit')) {
      return VoteErrorCode.VOTE_LIMIT_EXCEEDED;
    }

    // Check HTTP status codes
    if (error?.status === 401 || error?.status === 403) {
      return VoteErrorCode.UNAUTHORIZED;
    }

    // Check for timeout errors
    if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
      return VoteErrorCode.TIMEOUT;
    }

    // Check for network errors
    if (!navigator.onLine || error?.name === 'NetworkError' || error?.status === 0) {
      return VoteErrorCode.NETWORK_ERROR;
    }

    // Check for invalid operations
    if (error?.status === 400 || error?.status === 422) {
      return VoteErrorCode.INVALID_OPERATION;
    }

    return VoteErrorCode.UNKNOWN;
  }

  /**
   * Determines if error is retryable
   */
  private isErrorRetryable(errorCode: VoteErrorCode): boolean {
    switch (errorCode) {
      case VoteErrorCode.NETWORK_ERROR:
      case VoteErrorCode.TIMEOUT:
      case VoteErrorCode.UNKNOWN:
        return true;

      case VoteErrorCode.VOTE_LIMIT_EXCEEDED:
      case VoteErrorCode.UNAUTHORIZED:
      case VoteErrorCode.INVALID_OPERATION:
        return false;

      default:
        return false;
    }
  }

  /**
   * Gets user-friendly error message
   */
  private getErrorMessage(error: any, errorCode: VoteErrorCode): string {
    switch (errorCode) {
      case VoteErrorCode.VOTE_LIMIT_EXCEEDED:
        return 'Vote-Limit erreicht. Du hast keine Votes mehr verfügbar.';

      case VoteErrorCode.UNAUTHORIZED:
        return 'Nicht autorisiert. Bitte melde dich erneut an.';

      case VoteErrorCode.TIMEOUT:
        return 'Zeitüberschreitung. Bitte versuche es erneut.';

      case VoteErrorCode.NETWORK_ERROR:
        return 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.';

      case VoteErrorCode.INVALID_OPERATION:
        return 'Ungültige Operation. Bitte lade die Seite neu.';

      case VoteErrorCode.UNKNOWN:
      default:
        return error?.message || 'Vote konnte nicht gespeichert werden.';
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


    this.voteCoreService.loadRatingStats(submissionId, categoryId).pipe(
      takeUntil(this.destroy$),
      tap(stats => {
        const cached = this.statsCache.get(key);
        if (cached) {
          cached.next(stats);
        }
      }),
      catchError((error: unknown) => {
        console.error(`❌ VoteStateService: Failed to load rating stats for ${key}:`, error);
        return EMPTY;
      })
    ).subscribe();
  }

  /**
   * Loads vote limit status from backend
   */
  private loadVoteLimitStatusFromBackend(submissionId: number, categoryId: number): void {
    const key = this.getVoteLimitCacheKey(submissionId, categoryId);


    this.voteCoreService.loadVoteLimitStatus(submissionId, categoryId).pipe(
      takeUntil(this.destroy$),
      tap(status => {
        const cached = this.voteLimitCache.get(key);
        if (cached) {
          cached.next(status);
        }
      }),
      catchError((error: unknown) => {
        console.error(`❌ VoteStateService: Failed to load vote limit status for ${key}:`, error);
        return EMPTY;
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

  }

  /**
   * Handles remote vote update from socket
   */
  private handleRemoteVoteUpdate(event: VoteEvent): void {
    if (!event.commentId) return;

    const commentId = event.commentId; // Already a number from VoteEvent DTO

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

  /**
   * Logs cache metrics if threshold reached
   */
  private logCacheMetricsIfNeeded(): void {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;

    if (total > 0 && total % this.METRICS_LOG_FREQUENCY === 0) {
      const hitRate = ((this.cacheMetrics.hits / total) * 100).toFixed(1);
      const uptime = ((Date.now() - this.cacheMetrics.lastReset) / 1000).toFixed(0);

    }
  }

  // =============================================================================
  // LIFECYCLE
  // =============================================================================

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {

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

  }
}
