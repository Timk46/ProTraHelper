import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { VoteUIStateService } from './vote-ui-state.service';
import { VoteStateService, VoteError, VoteErrorCode } from './vote-state.service';

describe('VoteUIStateService', () => {
  let service: VoteUIStateService;
  let mockVoteStateService: jasmine.SpyObj<VoteStateService>;
  let mockVoteErrors$: Subject<VoteError>;

  beforeEach(() => {
    mockVoteErrors$ = new Subject<VoteError>();

    const voteStateServiceSpy = jasmine.createSpyObj('VoteStateService', [
      'getVoteCount$',
      'updateVoteCache',
      'invalidateVoteCache'
    ]);

    // Define onVoteError$ as a property
    Object.defineProperty(voteStateServiceSpy, 'onVoteError$', {
      get: () => mockVoteErrors$.asObservable()
    });

    TestBed.configureTestingModule({
      providers: [
        VoteUIStateService,
        { provide: VoteStateService, useValue: voteStateServiceSpy }
      ]
    });

    service = TestBed.inject(VoteUIStateService);
    mockVoteStateService = TestBed.inject(VoteStateService) as jasmine.SpyObj<VoteStateService>;
  });

  afterEach(() => {
    service.ngOnDestroy();
    mockVoteErrors$.complete();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // =============================================================================
  // DEBOUNCING TESTS
  // =============================================================================

  describe('Debouncing', () => {
    it('should not debounce first click', () => {
      const shouldDebounce = service.shouldDebounce(123);
      expect(shouldDebounce).toBe(false);
    });

    it('should debounce rapid clicks within 300ms', fakeAsync(() => {
      // First click
      service.shouldDebounce(123);

      // Second click immediately after
      tick(100);
      const shouldDebounce = service.shouldDebounce(123);

      expect(shouldDebounce).toBe(true);
    }));

    it('should allow click after debounce time expires', fakeAsync(() => {
      // First click
      service.shouldDebounce(123);

      // Wait for debounce time to expire
      tick(350);

      // Second click should be allowed
      const shouldDebounce = service.shouldDebounce(123);
      expect(shouldDebounce).toBe(false);
    }));

    it('should track last click time', () => {
      const beforeClick = Date.now();
      service.shouldDebounce(123);
      const lastClickTime = service.getLastClickTime(123);

      expect(lastClickTime).toBeGreaterThanOrEqual(beforeClick);
      expect(lastClickTime).toBeLessThanOrEqual(Date.now());
    });

    it('should return null for never-clicked comment', () => {
      const lastClickTime = service.getLastClickTime(999);
      expect(lastClickTime).toBeNull();
    });

    it('should debounce per comment independently', fakeAsync(() => {
      // Click comment-1
      service.shouldDebounce(1);
      tick(100);

      // Click comment-1 again (should debounce)
      expect(service.shouldDebounce(1)).toBe(true);

      // Click comment-2 (should NOT debounce - different comment)
      expect(service.shouldDebounce(2)).toBe(false);
    }));
  });

  // =============================================================================
  // OPTIMISTIC UPDATE TESTS
  // =============================================================================

  describe('Optimistic Updates', () => {
    it('should apply optimistic update', (done) => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(123, 1);

      setTimeout(() => {
        expect(mockVoteStateService.updateVoteCache).toHaveBeenCalledWith(123, 6);
        expect(service.hasOptimisticUpdate(123)).toBe(true);
        done();
      }, 10);
    });

    it('should track original value for revert', (done) => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(123, 1);

      setTimeout(() => {
        const optimisticUpdates = (service as any).optimisticUpdates;
        const update = optimisticUpdates.get(123);

        expect(update.originalValue).toBe(5);
        expect(update.optimisticValue).toBe(6);
        done();
      }, 10);
    });

    it('should revert optimistic update', (done) => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(123, 1);

      setTimeout(() => {
        service.revertOptimisticUpdate(123);

        expect(mockVoteStateService.updateVoteCache).toHaveBeenCalledWith(123, 5);
        expect(service.hasOptimisticUpdate(123)).toBe(false);
        done();
      }, 10);
    });

    it('should confirm optimistic update', (done) => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(123, 1);

      setTimeout(() => {
        service.confirmOptimisticUpdate(123);

        expect(service.hasOptimisticUpdate(123)).toBe(false);
        done();
      }, 10);
    });

    it('should handle multiple optimistic updates', (done) => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(1, 1);
      service.applyOptimisticUpdate(2, -1);

      setTimeout(() => {
        expect(service.hasOptimisticUpdate(1)).toBe(true);
        expect(service.hasOptimisticUpdate(2)).toBe(true);
        done();
      }, 10);
    });

    it('should not fail on revert of non-existent update', () => {
      expect(() => {
        service.revertOptimisticUpdate(888);
      }).not.toThrow();
    });
  });

  // =============================================================================
  // LOADING STATE TESTS
  // =============================================================================

  describe('Loading States', () => {
    it('should initialize loading state as false', (done) => {
      service.isVoting$(123).subscribe(isVoting => {
        expect(isVoting).toBe(false);
        done();
      });
    });

    it('should set voting state', (done) => {
      service.setVoting(123, true);

      service.isVoting$(123).subscribe(isVoting => {
        expect(isVoting).toBe(true);
        done();
      });
    });

    it('should toggle voting state', fakeAsync(() => {
      let emittedValues: boolean[] = [];

      service.isVoting$(123).subscribe(isVoting => {
        emittedValues.push(isVoting);
      });

      service.setVoting(123, true);
      tick();

      service.setVoting(123, false);
      tick();

      expect(emittedValues).toEqual([false, true, false]);
    }));

    it('should manage loading states per comment independently', (done) => {
      service.setVoting(1, true);
      service.setVoting(2, false);

      let count = 0;
      service.isVoting$(1).subscribe(isVoting1 => {
        expect(isVoting1).toBe(true);
        count++;
        if (count === 2) done();
      });

      service.isVoting$(2).subscribe(isVoting2 => {
        expect(isVoting2).toBe(false);
        count++;
        if (count === 2) done();
      });
    });
  });

  // =============================================================================
  // UI HELPER TESTS
  // =============================================================================

  describe('canVote$', () => {
    it('should return true when not voting and no error', (done) => {
      service.canVote$(123).subscribe(canVote => {
        expect(canVote).toBe(true);
        done();
      });
    });

    it('should return false when voting in progress', fakeAsync(() => {
      service.setVoting(123, true);
      tick();

      service.canVote$(123).subscribe(canVote => {
        expect(canVote).toBe(false);
      });
    }));
  });

  describe('getVoteButtonState', () => {
    it('should combine all button properties', fakeAsync(() => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      service.setVoting(123, false);

      service.getVoteButtonState(123).subscribe(state => {
        expect(state.count).toBe('+5');
        expect(state.isLoading).toBe(false);
        expect(state.isDisabled).toBe(false);
        expect(state.hasOptimisticUpdate).toBe(false);
      });

      tick();
    }));

    it('should indicate optimistic update in button state', fakeAsync(() => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(123, 1);
      tick(10);

      service.getVoteButtonState(123).subscribe(state => {
        expect(state.hasOptimisticUpdate).toBe(true);
      });

      tick();
    }));

    it('should disable button when voting', fakeAsync(() => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      service.setVoting(123, true);

      service.getVoteButtonState(123).subscribe(state => {
        expect(state.isDisabled).toBe(true);
        expect(state.isLoading).toBe(true);
      });

      tick();
    }));
  });

  describe('formatVoteCount', () => {
    it('should format zero as "0"', () => {
      expect(service.formatVoteCount(0)).toBe('0');
    });

    it('should format positive numbers with + prefix', () => {
      expect(service.formatVoteCount(5)).toBe('+5');
      expect(service.formatVoteCount(1)).toBe('+1');
      expect(service.formatVoteCount(999)).toBe('+999');
    });

    it('should format negative numbers without modification', () => {
      expect(service.formatVoteCount(-5)).toBe('-5');
      expect(service.formatVoteCount(-1)).toBe('-1');
    });
  });

  describe('Tooltip Methods', () => {
    it('should return correct upvote tooltip when can vote', () => {
      const tooltip = service.getUpvoteTooltip(123, true);
      expect(tooltip).toBe('Vote hinzufügen');
    });

    it('should return correct upvote tooltip when cannot vote', () => {
      const tooltip = service.getUpvoteTooltip(123, false);
      expect(tooltip).toBe('Keine Votes verfügbar');
    });

    it('should indicate saving when optimistic update pending', (done) => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(123, 1);

      setTimeout(() => {
        const tooltip = service.getUpvoteTooltip(123, true);
        expect(tooltip).toBe('Vote wird gespeichert...');
        done();
      }, 10);
    });

    it('should return correct remove vote tooltip', () => {
      expect(service.getRemoveVoteTooltip(123, 0)).toBe('Keine Votes zum Entfernen');
      expect(service.getRemoveVoteTooltip(123, 5)).toBe('Vote entfernen');
    });

    it('should generate aria label with vote counts', () => {
      const label = service.getVoteStatsAriaLabel(123, 10, 2);
      expect(label).toContain('10 Votes insgesamt');
      expect(label).toContain('2 Votes von dir');
    });

    it('should generate aria label for single vote', () => {
      const label = service.getVoteStatsAriaLabel(123, 1, 1);
      expect(label).toContain('1 Vote insgesamt');
      expect(label).toContain('1 Vote von dir');
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle vote error and revert optimistic update', fakeAsync(() => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      // Apply optimistic update
      service.applyOptimisticUpdate(123, 1);
      tick(10);

      // Emit error
      const error: VoteError = {
        commentId: 123,
        error: 'Vote failed',
        timestamp: Date.now(),
        code: VoteErrorCode.NETWORK_ERROR,
        isRetryable: true
      };

      mockVoteErrors$.next(error);
      tick();

      // Should have reverted
      expect(service.hasOptimisticUpdate(123)).toBe(false);
      expect(mockVoteStateService.updateVoteCache).toHaveBeenCalledWith(123, 5);
    }));

    it('should clear loading state on error', fakeAsync(() => {
      service.setVoting(123, true);
      tick();

      const error: VoteError = {
        commentId: 123,
        error: 'Vote failed',
        timestamp: Date.now(),
        code: VoteErrorCode.TIMEOUT,
        isRetryable: true
      };

      mockVoteErrors$.next(error);
      tick();

      service.isVoting$(123).subscribe(isVoting => {
        expect(isVoting).toBe(false);
      });
    }));

    it('should store error message', fakeAsync(() => {
      const error: VoteError = {
        commentId: 123,
        error: 'Vote limit exceeded',
        timestamp: Date.now(),
        code: VoteErrorCode.VOTE_LIMIT_EXCEEDED,
        isRetryable: false
      };

      mockVoteErrors$.next(error);
      tick();

      const errorMessage = service.getError(123);
      expect(errorMessage).toBe('Vote limit exceeded');
    }));

    it('should auto-clear error after 5 seconds', fakeAsync(() => {
      const error: VoteError = {
        commentId: 123,
        error: 'Vote failed',
        timestamp: Date.now(),
        code: VoteErrorCode.UNKNOWN,
        isRetryable: true
      };

      mockVoteErrors$.next(error);
      tick();

      expect(service.getError(123)).toBeTruthy();

      // Wait 5 seconds
      tick(5000);

      expect(service.getError(123)).toBeNull();
    }));

    it('should clear error manually', fakeAsync(() => {
      const error: VoteError = {
        commentId: 123,
        error: 'Vote failed',
        timestamp: Date.now(),
        code: VoteErrorCode.NETWORK_ERROR,
        isRetryable: true
      };

      mockVoteErrors$.next(error);
      tick();

      service.clearError(123);

      expect(service.getError(123)).toBeNull();
    }));
  });

  // =============================================================================
  // CLEANUP TESTS
  // =============================================================================

  describe('Cleanup', () => {
    it('should cleanup stale debounce entries', fakeAsync(() => {
      // Add debounce entry
      service.shouldDebounce(999);

      // Fast-forward past max age (5 minutes)
      tick(300000 + 60000); // Max age + cleanup interval

      const clickDebouncer = (service as any).clickDebouncer;
      expect(clickDebouncer.has(999)).toBe(false);
    }));

    it('should auto-confirm old optimistic updates', fakeAsync(() => {
      mockVoteStateService.getVoteCount$.and.returnValue(of(5));
      mockVoteStateService.updateVoteCache.and.stub();

      service.applyOptimisticUpdate(123, 1);
      tick(10);

      // Fast-forward past max age (30 seconds)
      tick(30000 + 60000); // Max age + cleanup interval

      expect(service.hasOptimisticUpdate(123)).toBe(false);
    }));

    it('should clear all data on destroy', () => {
      service.setVoting(1, true);
      service.shouldDebounce(2);

      const loadingStates = (service as any).loadingStates;
      const clickDebouncer = (service as any).clickDebouncer;

      expect(loadingStates.size).toBeGreaterThan(0);
      expect(clickDebouncer.size).toBeGreaterThan(0);

      service.ngOnDestroy();

      expect(loadingStates.size).toBe(0);
      expect(clickDebouncer.size).toBe(0);
    });

    it('should stop cleanup timer on destroy', () => {
      const cleanupInterval = (service as any).cleanupInterval;
      expect(cleanupInterval).toBeDefined();

      service.ngOnDestroy();

      const cleanupIntervalAfter = (service as any).cleanupInterval;
      expect(cleanupIntervalAfter).toBeUndefined();
    });
  });

  // =============================================================================
  // LRU CACHE BEHAVIOR
  // =============================================================================

  describe('LRU Cache for Loading States', () => {
    it('should evict least recently used loading state when full', () => {
      const maxSize = (service as any).loadingStates.maxSize;

      // Fill cache to max
      for (let i = 0; i < maxSize; i++) {
        service.setVoting(i, true);
      }

      // Access first comment to make it recently used
      service.isVoting$(0).subscribe();

      // Add one more - should evict comment-1
      service.setVoting(999, true);

      const loadingStates = (service as any).loadingStates;
      expect(loadingStates.has(0)).toBe(true); // Recently accessed
      expect(loadingStates.has(1)).toBe(false); // Evicted
      expect(loadingStates.has(999)).toBe(true); // Newly added
    });
  });
});
