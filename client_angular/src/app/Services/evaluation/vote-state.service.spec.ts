import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { VoteStateService } from './vote-state.service';
import { VoteCoreService } from './vote-core.service';
import { EvaluationRealtimeService, VoteEvent } from './evaluation-realtime.service';
import { EvaluationStateService } from './evaluation-state.service';
import {
  VoteLimitResponseDTO,
  RatingStatsDTO,
  VoteLimitStatusDTO
} from '@DTOs/index';

describe('VoteStateService', () => {
  let service: VoteStateService;
  let mockVoteCoreService: jasmine.SpyObj<VoteCoreService>;
  let mockRealtimeService: jasmine.SpyObj<EvaluationRealtimeService>;
  let mockEvaluationStateService: jasmine.SpyObj<EvaluationStateService>;
  let mockVoteEvents$: Subject<VoteEvent>;

  // Mock data
  const mockVoteLimitResponse: VoteLimitResponseDTO = {
    success: true,
    voteLimitStatus: {
      maxVotes: 10,
      remainingVotes: 5,
      votedCommentIds: [1, 2, 3],
      canVote: true,
      displayText: '5/10 verfügbar'
    },
    userVoteCount: 3,
    message: 'Vote successful'
  };

  const mockRatingStats: RatingStatsDTO = {
    submissionId: 123,
    categoryId: 5,
    averageScore: 7.5,
    totalRatings: 20,
    scoreDistribution: [
      { score: 8, count: 10 },
      { score: 7, count: 10 }
    ],
    userRating: 8,
    userHasRated: true
  };

  const mockVoteLimitStatus: VoteLimitStatusDTO = {
    maxVotes: 10,
    remainingVotes: 7,
    votedCommentIds: [1, 2],
    canVote: true,
    displayText: '7/10 verfügbar'
  };

  beforeEach(() => {
    mockVoteEvents$ = new Subject<VoteEvent>();

    // Create spy objects
    const voteCoreServiceSpy = jasmine.createSpyObj('VoteCoreService', [
      'submitVote',
      'loadRatingStats',
      'loadVoteLimitStatus'
    ]);

    const realtimeServiceSpy = jasmine.createSpyObj('EvaluationRealtimeService', [
      'subscribeToVotes'
    ]);

    const evaluationStateServiceSpy = jasmine.createSpyObj('EvaluationStateService', [
      'getVoteLimitStatusForCategory'
    ]);

    // Configure spy return values
    realtimeServiceSpy.subscribeToVotes.and.returnValue(mockVoteEvents$.asObservable());

    TestBed.configureTestingModule({
      providers: [
        VoteStateService,
        { provide: VoteCoreService, useValue: voteCoreServiceSpy },
        { provide: EvaluationRealtimeService, useValue: realtimeServiceSpy },
        { provide: EvaluationStateService, useValue: evaluationStateServiceSpy }
      ]
    });

    service = TestBed.inject(VoteStateService);
    mockVoteCoreService = TestBed.inject(VoteCoreService) as jasmine.SpyObj<VoteCoreService>;
    mockRealtimeService = TestBed.inject(EvaluationRealtimeService) as jasmine.SpyObj<EvaluationRealtimeService>;
    mockEvaluationStateService = TestBed.inject(EvaluationStateService) as jasmine.SpyObj<EvaluationStateService>;
  });

  afterEach(() => {
    service.ngOnDestroy();
    mockVoteEvents$.complete();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // =============================================================================
  // VOTE SUBMISSION TESTS
  // =============================================================================

  describe('submitVote', () => {
    it('should queue and process vote successfully', fakeAsync(() => {
      mockVoteCoreService.submitVote.and.returnValue(of(mockVoteLimitResponse));

      service.submitVote(123, 'UP', 5);
      tick();

      expect(mockVoteCoreService.submitVote).toHaveBeenCalledWith(123, 'UP');
    }));

    it('should update vote cache after successful vote', fakeAsync(() => {
      mockVoteCoreService.submitVote.and.returnValue(of(mockVoteLimitResponse));

      service.submitVote(123, 'UP', 5);
      tick();

      service.getVoteCount$(123).subscribe(count => {
        expect(count).toBe(3); // userVoteCount from response
      });
    }));

    it('should handle vote submission error with retry', fakeAsync(() => {
      const error = { message: 'Network error', code: 'NETWORK_ERROR' };
      mockVoteCoreService.submitVote.and.returnValue(throwError(() => error));

      service.submitVote(123, 'UP', 5);
      tick(1000); // First retry delay

      // Should have attempted initial call + 1 retry
      expect(mockVoteCoreService.submitVote).toHaveBeenCalledTimes(2);
    }));

    it('should emit error after max retries exceeded', fakeAsync(() => {
      const error = { message: 'Network error', code: 'NETWORK_ERROR' };
      mockVoteCoreService.submitVote.and.returnValue(throwError(() => error));

      let errorEmitted = false;
      service.onVoteError$.subscribe(err => {
        errorEmitted = true;
        expect(err.commentId).toBe(123);
        expect(err.error).toContain('Network error');
      });

      service.submitVote(123, 'UP', 5);

      // Process all retries (exponential backoff: 1s, 2s, 4s)
      tick(1000); // Retry 1
      tick(2000); // Retry 2
      tick(4000); // Retry 3
      tick(100);  // Error emission

      expect(errorEmitted).toBe(true);
      expect(mockVoteCoreService.submitVote).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }));

    it('should process multiple votes in priority order', fakeAsync(() => {
      mockVoteCoreService.submitVote.and.returnValue(of(mockVoteLimitResponse));

      service.submitVote(1, 'UP', 5);
      service.submitVote(2, 'UP', 5);
      service.submitVote(3, 'UP', 5);

      tick();

      // All three should be processed
      expect(mockVoteCoreService.submitVote).toHaveBeenCalledTimes(3);
    }));
  });

  // =============================================================================
  // CACHE TESTS
  // =============================================================================

  describe('getVoteCount$', () => {
    it('should return cached vote count if available', (done) => {
      service.updateVoteCache(123, 5);

      service.getVoteCount$(123).subscribe(count => {
        expect(count).toBe(5);
        done();
      });
    });

    it('should initialize with 0 if not in cache', (done) => {
      service.getVoteCount$(999).subscribe(count => {
        expect(count).toBe(0);
        done();
      });
    });

    it('should return same observable for same comment', () => {
      const obs1 = service.getVoteCount$(123);
      const obs2 = service.getVoteCount$(123);

      // Should return same BehaviorSubject instance
      expect(obs1).toBe(obs2);
    });
  });

  describe('getRatingStats$', () => {
    it('should trigger backend load if not in cache', fakeAsync(() => {
      mockVoteCoreService.loadRatingStats.and.returnValue(of(mockRatingStats));

      service.getRatingStats$(123, 5).subscribe();
      tick();

      expect(mockVoteCoreService.loadRatingStats).toHaveBeenCalledWith(123, 5);
    }));

    it('should return cached stats without backend call', fakeAsync(() => {
      mockVoteCoreService.loadRatingStats.and.returnValue(of(mockRatingStats));

      // First call - triggers backend load
      service.getRatingStats$(123, 5).subscribe();
      tick();

      // Reset spy
      mockVoteCoreService.loadRatingStats.calls.reset();

      // Second call - should use cache
      service.getRatingStats$(123, 5).subscribe(stats => {
        expect(stats).toEqual(mockRatingStats);
      });
      tick();

      expect(mockVoteCoreService.loadRatingStats).not.toHaveBeenCalled();
    }));

    it('should emit null initially then stats when loaded', fakeAsync(() => {
      mockVoteCoreService.loadRatingStats.and.returnValue(of(mockRatingStats));

      const emittedValues: (RatingStatsDTO | null)[] = [];

      service.getRatingStats$(123, 5).subscribe(stats => {
        emittedValues.push(stats);
      });

      tick();

      expect(emittedValues.length).toBe(2);
      expect(emittedValues[0]).toBeNull();
      expect(emittedValues[1]).toEqual(mockRatingStats);
    }));
  });

  describe('getVoteLimitStatus$', () => {
    it('should trigger backend load if not in cache', fakeAsync(() => {
      mockVoteCoreService.loadVoteLimitStatus.and.returnValue(of(mockVoteLimitStatus));

      service.getVoteLimitStatus$(123, 5).subscribe();
      tick();

      expect(mockVoteCoreService.loadVoteLimitStatus).toHaveBeenCalledWith(123, 5);
    }));

    it('should return cached status without backend call', fakeAsync(() => {
      mockVoteCoreService.loadVoteLimitStatus.and.returnValue(of(mockVoteLimitStatus));

      // First call - triggers backend load
      service.getVoteLimitStatus$(123, 5).subscribe();
      tick();

      // Reset spy
      mockVoteCoreService.loadVoteLimitStatus.calls.reset();

      // Second call - should use cache
      service.getVoteLimitStatus$(123, 5).subscribe(status => {
        expect(status).toEqual(mockVoteLimitStatus);
      });
      tick();

      expect(mockVoteCoreService.loadVoteLimitStatus).not.toHaveBeenCalled();
    }));
  });

  // =============================================================================
  // CACHE INVALIDATION TESTS
  // =============================================================================

  describe('Cache Invalidation', () => {
    it('should invalidate vote cache', fakeAsync(() => {
      service.updateVoteCache(123, 5);

      service.invalidateVoteCache(123);

      // After invalidation, should initialize with 0 again
      service.getVoteCount$(123).subscribe(count => {
        expect(count).toBe(0);
      });
    }));

    it('should invalidate stats cache', fakeAsync(() => {
      mockVoteCoreService.loadRatingStats.and.returnValue(of(mockRatingStats));

      // Load stats initially
      service.getRatingStats$(123, 5).subscribe();
      tick();

      // Invalidate
      service.invalidateStatsCache(123, 5);

      // Reset spy to verify new load
      mockVoteCoreService.loadRatingStats.calls.reset();

      // Access again - should trigger new load
      service.getRatingStats$(123, 5).subscribe();
      tick();

      expect(mockVoteCoreService.loadRatingStats).toHaveBeenCalled();
    }));

    it('should invalidate vote limit cache', fakeAsync(() => {
      mockVoteCoreService.loadVoteLimitStatus.and.returnValue(of(mockVoteLimitStatus));

      // Load initially
      service.getVoteLimitStatus$(123, 5).subscribe();
      tick();

      // Invalidate
      service.invalidateVoteLimitCache(123, 5);

      // Reset spy
      mockVoteCoreService.loadVoteLimitStatus.calls.reset();

      // Access again - should trigger new load
      service.getVoteLimitStatus$(123, 5).subscribe();
      tick();

      expect(mockVoteCoreService.loadVoteLimitStatus).toHaveBeenCalled();
    }));
  });

  // =============================================================================
  // REAL-TIME EVENT TESTS
  // =============================================================================

  describe('Real-time Updates', () => {
    it('should handle remote vote update event', fakeAsync(() => {
      const voteEvent: VoteEvent = {
        type: 'vote-changed',
        submissionId: 123,
        commentId: 456,
        voteData: {
          commentId: 456,
          totalVotes: 10,
          userVoteCount: 2
        } as any,
        timestamp: new Date()
      };

      // Initialize cache
      service.updateVoteCache(456, 5);

      // Emit vote event
      mockVoteEvents$.next(voteEvent);
      tick();

      // Cache should be updated with new vote count
      service.getVoteCount$(456).subscribe(count => {
        expect(count).toBe(10); // totalVotes from event
      });
    }));

    it('should set up real-time listeners on construction', () => {
      expect(mockRealtimeService.subscribeToVotes).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // LIFECYCLE TESTS
  // =============================================================================

  describe('ngOnDestroy', () => {
    it('should clear all caches on destroy', () => {
      service.updateVoteCache(1, 5);
      service.updateVoteCache(2, 3);

      const voteCache = (service as any).voteCache;
      expect(voteCache.size).toBe(2);

      service.ngOnDestroy();

      expect(voteCache.size).toBe(0);
    });

    it('should clear vote queue on destroy', fakeAsync(() => {
      mockVoteCoreService.submitVote.and.returnValue(of(mockVoteLimitResponse));

      service.submitVote(1, 'UP');
      service.submitVote(2, 'UP');

      service.ngOnDestroy();

      const queue = (service as any).voteQueue;
      expect(queue.length).toBe(0);
    }));

    it('should complete all subjects on destroy', () => {
      const destroySpy = spyOn((service as any).destroy$, 'next');
      const destroyCompleteSpy = spyOn((service as any).destroy$, 'complete');
      const errorCompleteSpy = spyOn((service as any).errorState$, 'complete');

      service.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(destroyCompleteSpy).toHaveBeenCalled();
      expect(errorCompleteSpy).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // LRU CACHE BEHAVIOR TESTS
  // =============================================================================

  describe('LRU Cache Behavior', () => {
    it('should evict least recently used vote when cache is full', fakeAsync(() => {
      const maxSize = (service as any).voteCache.maxSize;

      // Fill cache to max
      for (let i = 0; i < maxSize; i++) {
        service.updateVoteCache(i, i);
      }

      // Access first comment to make it recently used
      service.getVoteCount$(0).subscribe();

      // Add one more - should evict comment-1 (least recently used)
      service.updateVoteCache(999, 999);

      const cache = (service as any).voteCache;
      expect(cache.has(0)).toBe(true); // Recently accessed
      expect(cache.has(1)).toBe(false); // Evicted
      expect(cache.has(999)).toBe(true); // Newly added
    }));

    it('should complete BehaviorSubject on LRU eviction', fakeAsync(() => {
      const maxSize = (service as any).voteCache.maxSize;

      // Fill cache
      for (let i = 0; i < maxSize + 1; i++) {
        service.updateVoteCache(i, i);
      }

      // The first entry should have been evicted and its subject completed
      // We can verify this by checking it's not in the cache
      const cache = (service as any).voteCache;
      expect(cache.has(0)).toBe(false);
    }));
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle backend load errors gracefully', fakeAsync(() => {
      const error = { status: 500, message: 'Server error' };
      mockVoteCoreService.loadRatingStats.and.returnValue(throwError(() => error));

      // Should not throw, just log error
      service.getRatingStats$(123, 5).subscribe();
      tick();

      // Cache should still have null value
      service.getRatingStats$(123, 5).subscribe(stats => {
        expect(stats).toBeNull();
      });
    }));

    it('should emit vote error with correct format', fakeAsync(() => {
      const error = { message: 'Vote failed', code: 'VOTE_LIMIT_EXCEEDED' };
      mockVoteCoreService.submitVote.and.returnValue(throwError(() => error));

      let emittedError: any = null;
      service.onVoteError$.subscribe(err => {
        emittedError = err;
      });

      service.submitVote(123, 'UP');

      // Max out retries
      tick(1000 + 2000 + 4000 + 100);

      expect(emittedError).toBeTruthy();
      expect(emittedError.commentId).toBe(123);
      expect(emittedError.code).toBe('VOTE_LIMIT_EXCEEDED');
      expect(emittedError.timestamp).toBeDefined();
    }));
  });
});
