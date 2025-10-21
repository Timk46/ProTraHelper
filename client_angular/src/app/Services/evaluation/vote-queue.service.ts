import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer, of } from 'rxjs';
import { 
  concatMap, 
  debounceTime, 
  distinctUntilChanged, 
  catchError, 
  retry, 
  shareReplay, 
  filter, 
  map, 
  tap,
  takeUntil
} from 'rxjs/operators';

// DTOs (explicit imports for strict mode compliance)
export type VoteType = 'UP' | null;
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { VoteResultDTO } from '@DTOs/index';
import { LRUCache } from '../../utils/lru-cache';

/**
 * 🔧 HEFL Vote Queue Service
 *
 * Architektur-konforme Lösung für Vote-Management mit:
 * - Optimistic Updates mit lokalem Cache
 * - Race Condition Prevention durch Operation Queuing
 * - Memory-sichere Observable-Pattern
 * - Debounced/Throttled Vote Operations
 * - Proper Error Handling mit Rollback
 *
 * @deprecated THIS SERVICE IS DEPRECATED AND WILL BE REMOVED.
 * Migration deadline: 2 weeks from now.
 *
 * **Migration Path:**
 * Replace this service with the new 3-service architecture:
 * - VoteCoreService: HTTP operations
 * - VoteStateService: State management (includes queue functionality)
 * - VoteUIStateService: UI logic (debouncing, optimistic updates)
 *
 * **Example Migration:**
 * ```typescript
 * // BEFORE (deprecated):
 * constructor(private voteQueue: VoteQueueService) {}
 * this.voteQueue.queueVoteOperation(commentId, voteType);
 * this.voteQueue.getLocalVoteCount$(commentId).subscribe(...);
 *
 * // AFTER (new architecture):
 * constructor(private voteState: VoteStateService) {}
 * await this.voteState.submitVote(commentId, voteType, categoryId);
 * this.voteState.getVoteCount$(commentId).subscribe(...);
 * ```
 *
 * See LegacyVoteAdapter for temporary compatibility layer.
 *
 * @example
 * ```typescript
 * constructor(private voteQueue: VoteQueueService) {}
 *
 * onVote(commentId: string, voteType: VoteType) {
 *   this.voteQueue.queueVoteOperation(commentId, voteType);
 * }
 *
 * ngOnInit() {
 *   this.voteQueue.getLocalVoteCount$(commentId)
 *     .subscribe(count => this.updateUI(count));
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class VoteQueueService {
  private destroy$ = new Subject<void>();

  // 🔧 LOCAL CACHE: Vote counts per comment (LRU for memory management)
  private localVoteCache = new LRUCache<string, BehaviorSubject<number>>(
    200, // Max 200 comments with vote tracking
    (commentId, subject) => {
      subject.complete();
      console.log('🧹 VoteQueue: LRU evicted vote cache for comment', commentId);
    }
  );

  // 🔧 OPERATION QUEUE: Pending vote operations to prevent race conditions
  private voteOperationQueue$ = new Subject<VoteOperation>();

  // 🔧 LOADING STATE: Track ongoing operations per comment (LRU)
  private loadingState = new LRUCache<string, BehaviorSubject<boolean>>(
    200, // Max 200 comments with loading state
    (commentId, subject) => {
      subject.complete();
      console.log('🧹 VoteQueue: LRU evicted loading state for comment', commentId);
    }
  );

  // 🔧 ERROR STATE: Track errors per comment for UI feedback (LRU)
  private errorState = new LRUCache<string, BehaviorSubject<string | null>>(
    200, // Max 200 comments with error tracking
    (commentId, subject) => {
      subject.complete();
      console.log('🧹 VoteQueue: LRU evicted error state for comment', commentId);
    }
  );

  constructor(
    private evaluationService: EvaluationDiscussionService
  ) {
    console.warn(
      '⚠️ DEPRECATION WARNING: VoteQueueService is deprecated and will be removed in 2 weeks.\n' +
      'Migrate to new services: VoteCoreService, VoteStateService, VoteUIStateService\n' +
      'See LegacyVoteAdapter for temporary compatibility.'
    );
    this.setupVoteOperationProcessor();
  }

  /**
   * 🔧 ARCHITECTURE: Setup sequential vote operation processing
   * Uses concatMap to ensure operations are processed one at a time
   */
  private setupVoteOperationProcessor(): void {
    this.voteOperationQueue$
      .pipe(
        // 🔧 DEBOUNCE: Prevent rapid-fire clicking
        debounceTime(300),
        
        // 🔧 SEQUENTIAL: Process one operation at a time to prevent race conditions
        concatMap(operation => this.processVoteOperation(operation)),
        
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  /**
   * 🔧 PUBLIC API: Queue a vote operation for processing
   * This is the main method Components should call
   * 
   * @param commentId - The comment to vote on
   * @param voteType - 'UP' to add vote, null to remove vote
   * @returns Observable<boolean> - Success/failure of the operation
   */
  queueVoteOperation(commentId: string, voteType: VoteType | null): Observable<boolean> {
    console.log('🔧 VoteQueue: Queueing vote operation:', { commentId, voteType });

    // 🔧 OPTIMISTIC UPDATE: Update local cache immediately
    this.performOptimisticUpdate(commentId, voteType);
    
    // 🔧 SET LOADING: Show loading state
    this.setLoadingState(commentId, true);
    this.clearError(commentId);

    // 🔧 QUEUE OPERATION: Add to processing queue
    const operation: VoteOperation = {
      commentId,
      voteType,
      timestamp: Date.now(),
      optimisticCount: this.getLocalVoteCount(commentId)
    };

    this.voteOperationQueue$.next(operation);

    // Return observable that completes when operation finishes
    return this.getLoadingState$(commentId).pipe(
      filter(loading => !loading),
      map(() => this.getError(commentId) === null),
      shareReplay(1)
    );
  }

  /**
   * 🔧 PUBLIC API: Get current local vote count for a comment
   * Components can subscribe to this for reactive UI updates
   */
  getLocalVoteCount$(commentId: string): Observable<number> {
    if (!this.localVoteCache.has(commentId)) {
      this.localVoteCache.set(commentId, new BehaviorSubject<number>(0));
    }
    
    return this.localVoteCache.get(commentId)!.asObservable().pipe(
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  /**
   * 🔧 PUBLIC API: Get loading state for a comment
   */
  getLoadingState$(commentId: string): Observable<boolean> {
    if (!this.loadingState.has(commentId)) {
      this.loadingState.set(commentId, new BehaviorSubject<boolean>(false));
    }
    
    return this.loadingState.get(commentId)!.asObservable().pipe(
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  /**
   * 🔧 PUBLIC API: Get error state for a comment
   */
  getError$(commentId: string): Observable<string | null> {
    if (!this.errorState.has(commentId)) {
      this.errorState.set(commentId, new BehaviorSubject<string | null>(null));
    }
    
    return this.errorState.get(commentId)!.asObservable().pipe(
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  /**
   * 🔧 INITIALIZATION: Set initial vote count for a comment
   * Called when component loads with backend data
   */
  initializeVoteCount(commentId: string, initialCount: number): void {
    console.log('🔧 VoteQueue: Initializing vote count:', { commentId, initialCount });
    
    if (!this.localVoteCache.has(commentId)) {
      this.localVoteCache.set(commentId, new BehaviorSubject<number>(initialCount));
    } else {
      this.localVoteCache.get(commentId)!.next(initialCount);
    }
  }

  /**
   * 🔧 PRIVATE: Perform optimistic update to local cache
   */
  private performOptimisticUpdate(commentId: string, voteType: VoteType | null): void {
    const currentCount = this.getLocalVoteCount(commentId);
    let newCount: number;

    if (voteType === 'UP') {
      newCount = currentCount + 1;
    } else if (voteType === null) {
      newCount = Math.max(0, currentCount - 1);
    } else {
      newCount = currentCount; // No change for invalid vote types
    }

    console.log('🔧 VoteQueue: Optimistic update:', { 
      commentId, 
      voteType, 
      from: currentCount, 
      to: newCount 
    });

    this.setLocalVoteCount(commentId, newCount);
  }

  /**
   * 🔧 PRIVATE: Process a single vote operation
   */
  private processVoteOperation(operation: VoteOperation): Observable<void> {
    console.log('🔧 VoteQueue: Processing vote operation:', operation);

    return this.evaluationService.voteComment(operation.commentId, operation.voteType).pipe(
      retry({ count: 2, delay: (error, retryCount) => timer(Math.pow(2, retryCount) * 1000) }),
      
      tap((result: VoteResult) => {
        console.log('✅ VoteQueue: Vote operation successful:', result);
        this.handleVoteSuccess(operation, result);
      }),
      
      catchError((error: Error) => {
        console.error('❌ VoteQueue: Vote operation failed:', error);
        this.handleVoteError(operation, error);
        return of(void 0);
      }),
      
      map(() => void 0) // Ensure void return type
    );
  }

  /**
   * 🔧 PRIVATE: Handle successful vote operation
   */
  private handleVoteSuccess(operation: VoteOperation, result: VoteResult): void {
    // 🔧 SYNC: Update local cache with backend result if available
    if (result && typeof result.userVoteCount === 'number') {
      this.setLocalVoteCount(operation.commentId, result.userVoteCount);
      console.log('🔧 VoteQueue: Synced with backend result:', {
        commentId: operation.commentId,
        backendCount: result.userVoteCount
      });
    } else {
      // Keep optimistic value if backend doesn't provide count
      console.log('🔧 VoteQueue: Keeping optimistic value (no backend count)');
    }

    this.setLoadingState(operation.commentId, false);
    this.clearError(operation.commentId);
  }

  /**
   * 🔧 PRIVATE: Handle failed vote operation with rollback
   */
  private handleVoteError(operation: VoteOperation, error: Error): void {
    console.log('🔧 VoteQueue: Rolling back failed operation:', operation);

    // 🔧 ROLLBACK: Revert optimistic update
    if (operation.voteType === 'UP') {
      // We added 1, so subtract 1 to rollback
      const currentCount = this.getLocalVoteCount(operation.commentId);
      this.setLocalVoteCount(operation.commentId, Math.max(0, currentCount - 1));
    } else if (operation.voteType === null) {
      // We subtracted 1, so add 1 to rollback
      const currentCount = this.getLocalVoteCount(operation.commentId);
      this.setLocalVoteCount(operation.commentId, currentCount + 1);
    }

    this.setLoadingState(operation.commentId, false);
    this.setError(operation.commentId, `Vote fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
  }

  /**
   * 🔧 PRIVATE: Helper methods for cache management
   */
  private getLocalVoteCount(commentId: string): number {
    if (!this.localVoteCache.has(commentId)) {
      return 0;
    }
    return this.localVoteCache.get(commentId)!.value;
  }

  private setLocalVoteCount(commentId: string, count: number): void {
    if (!this.localVoteCache.has(commentId)) {
      this.localVoteCache.set(commentId, new BehaviorSubject<number>(count));
    } else {
      this.localVoteCache.get(commentId)!.next(count);
    }
  }

  private setLoadingState(commentId: string, loading: boolean): void {
    if (!this.loadingState.has(commentId)) {
      this.loadingState.set(commentId, new BehaviorSubject<boolean>(loading));
    } else {
      this.loadingState.get(commentId)!.next(loading);
    }
  }

  private setError(commentId: string, error: string | null): void {
    if (!this.errorState.has(commentId)) {
      this.errorState.set(commentId, new BehaviorSubject<string | null>(error));
    } else {
      this.errorState.get(commentId)!.next(error);
    }
  }

  private clearError(commentId: string): void {
    this.setError(commentId, null);
  }

  private getError(commentId: string): string | null {
    if (!this.errorState.has(commentId)) {
      return null;
    }
    return this.errorState.get(commentId)!.value;
  }

  /**
   * 🔧 CLEANUP: Clean up resources
   */
  ngOnDestroy(): void {
    console.log('🧹 VoteQueueService cleanup');

    this.destroy$.next();
    this.destroy$.complete();

    // Clean up all BehaviorSubjects (LRU .clear() will call cleanup callbacks automatically)
    this.localVoteCache.clear();
    this.loadingState.clear();
    this.errorState.clear();
  }
}

/**
 * 🔧 INTERFACE: Vote operation definition
 */
interface VoteOperation {
  commentId: string;
  voteType: VoteType | null;
  timestamp: number;
  optimisticCount: number;
}

/**
 * 🔧 TYPE: Vote result from backend (using shared DTO)
 */
type VoteResult = VoteResultDTO;