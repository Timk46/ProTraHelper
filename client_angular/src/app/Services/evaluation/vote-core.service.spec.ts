import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { VoteCoreService } from './vote-core.service';
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import {
  VoteLimitResponseDTO,
  RatingStatsDTO,
  VoteLimitStatusDTO
} from '@DTOs/index';

describe('VoteCoreService', () => {
  let service: VoteCoreService;
  let mockEvaluationDiscussionService: jasmine.SpyObj<EvaluationDiscussionService>;

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
    // Create spy object for EvaluationDiscussionService
    const evaluationDiscussionServiceSpy = jasmine.createSpyObj('EvaluationDiscussionService', [
      'voteCommentWithLimits',
      'getRatingStats',
      'getVoteLimitStatus'
    ]);

    TestBed.configureTestingModule({
      providers: [
        VoteCoreService,
        { provide: EvaluationDiscussionService, useValue: evaluationDiscussionServiceSpy }
      ]
    });

    service = TestBed.inject(VoteCoreService);
    mockEvaluationDiscussionService = TestBed.inject(EvaluationDiscussionService) as jasmine.SpyObj<EvaluationDiscussionService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // =============================================================================
  // SUBMIT VOTE TESTS
  // =============================================================================

  describe('submitVote', () => {
    it('should submit UP vote successfully', (done) => {
      mockEvaluationDiscussionService.voteCommentWithLimits.and.returnValue(of(mockVoteLimitResponse));

      service.submitVote(123, 'UP').subscribe(result => {
        expect(result).toEqual(mockVoteLimitResponse);
        expect(result.success).toBe(true);
        expect(result.userVoteCount).toBe(3);
        expect(mockEvaluationDiscussionService.voteCommentWithLimits).toHaveBeenCalledWith('123', 'UP');
        done();
      });
    });

    it('should submit remove vote (null) successfully', (done) => {
      const removeResponse = { ...mockVoteLimitResponse, userVoteCount: 2 };
      mockEvaluationDiscussionService.voteCommentWithLimits.and.returnValue(of(removeResponse));

      service.submitVote(123, null).subscribe(result => {
        expect(result.userVoteCount).toBe(2);
        expect(mockEvaluationDiscussionService.voteCommentWithLimits).toHaveBeenCalledWith('123', null);
        done();
      });
    });

    it('should handle vote submission error', (done) => {
      const error = { status: 400, message: 'Vote limit exceeded' };
      mockEvaluationDiscussionService.voteCommentWithLimits.and.returnValue(throwError(() => error));

      service.submitVote(123, 'UP').subscribe({
        next: () => fail('Should have errored'),
        error: (err) => {
          expect(err).toEqual(error);
          done();
        }
      });
    });

    it('should handle network error gracefully', (done) => {
      const networkError = { status: 0, message: 'Network error' };
      mockEvaluationDiscussionService.voteCommentWithLimits.and.returnValue(throwError(() => networkError));

      service.submitVote(123, 'UP').subscribe({
        next: () => fail('Should have errored'),
        error: (err) => {
          expect(err.status).toBe(0);
          done();
        }
      });
    });
  });

  // =============================================================================
  // LOAD RATING STATS TESTS
  // =============================================================================

  describe('loadRatingStats', () => {
    it('should load rating stats successfully', (done) => {
      mockEvaluationDiscussionService.getRatingStats.and.returnValue(of(mockRatingStats));

      service.loadRatingStats(123, 5).subscribe(stats => {
        expect(stats).toEqual(mockRatingStats);
        expect(stats.averageScore).toBe(7.5);
        expect(stats.totalRatings).toBe(20);
        expect(mockEvaluationDiscussionService.getRatingStats).toHaveBeenCalledWith('123', '5');
        done();
      });
    });

    it('should handle rating stats load error', (done) => {
      const error = { status: 404, message: 'Stats not found' };
      mockEvaluationDiscussionService.getRatingStats.and.returnValue(throwError(() => error));

      service.loadRatingStats(123, 5).subscribe({
        next: () => fail('Should have errored'),
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        }
      });
    });

    it('should load stats with no user rating', (done) => {
      const statsNoUserRating = { ...mockRatingStats, userRating: undefined, userHasRated: false };
      mockEvaluationDiscussionService.getRatingStats.and.returnValue(of(statsNoUserRating));

      service.loadRatingStats(123, 5).subscribe(stats => {
        expect(stats.userHasRated).toBe(false);
        expect(stats.userRating).toBeUndefined();
        done();
      });
    });
  });

  // =============================================================================
  // LOAD VOTE LIMIT STATUS TESTS
  // =============================================================================

  describe('loadVoteLimitStatus', () => {
    it('should load vote limit status successfully', (done) => {
      mockEvaluationDiscussionService.getVoteLimitStatus.and.returnValue(of(mockVoteLimitStatus));

      service.loadVoteLimitStatus(123, 5).subscribe(status => {
        expect(status).toEqual(mockVoteLimitStatus);
        expect(status.remainingVotes).toBe(7);
        expect(status.canVote).toBe(true);
        expect(mockEvaluationDiscussionService.getVoteLimitStatus).toHaveBeenCalledWith('123', '5');
        done();
      });
    });

    it('should handle vote limit status load error', (done) => {
      const error = { status: 500, message: 'Server error' };
      mockEvaluationDiscussionService.getVoteLimitStatus.and.returnValue(throwError(() => error));

      service.loadVoteLimitStatus(123, 5).subscribe({
        next: () => fail('Should have errored'),
        error: (err) => {
          expect(err.status).toBe(500);
          done();
        }
      });
    });

    it('should load status when no votes remaining', (done) => {
      const noVotesStatus = { ...mockVoteLimitStatus, remainingVotes: 0, canVote: false };
      mockEvaluationDiscussionService.getVoteLimitStatus.and.returnValue(of(noVotesStatus));

      service.loadVoteLimitStatus(123, 5).subscribe(status => {
        expect(status.remainingVotes).toBe(0);
        expect(status.canVote).toBe(false);
        done();
      });
    });
  });

  // =============================================================================
  // LIFECYCLE TESTS
  // =============================================================================

  describe('ngOnDestroy', () => {
    it('should complete all observables on destroy', () => {
      const destroySpy = spyOn((service as any).destroy$, 'next');
      const completeSpy = spyOn((service as any).destroy$, 'complete');

      service.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should cancel pending requests on destroy', (done) => {
      mockEvaluationDiscussionService.voteCommentWithLimits.and.returnValue(of(mockVoteLimitResponse));

      const subscription = service.submitVote(123, 'UP').subscribe({
        next: () => {
          // This should not execute if destroyed before completion
          fail('Should not complete after destroy');
        },
        error: () => {
          // Expected behavior
          done();
        }
      });

      // Destroy service before observable completes
      service.ngOnDestroy();
    });
  });

  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================

  describe('Integration scenarios', () => {
    it('should handle multiple concurrent vote submissions', (done) => {
      mockEvaluationDiscussionService.voteCommentWithLimits.and.returnValue(of(mockVoteLimitResponse));

      let completedCalls = 0;
      const totalCalls = 3;

      for (let i = 0; i < totalCalls; i++) {
        service.submitVote(i, 'UP').subscribe(() => {
          completedCalls++;
          if (completedCalls === totalCalls) {
            expect(mockEvaluationDiscussionService.voteCommentWithLimits).toHaveBeenCalledTimes(totalCalls);
            done();
          }
        });
      }
    });

    it('should handle sequential vote and stats loading', (done) => {
      mockEvaluationDiscussionService.voteCommentWithLimits.and.returnValue(of(mockVoteLimitResponse));
      mockEvaluationDiscussionService.getRatingStats.and.returnValue(of(mockRatingStats));

      service.submitVote(123, 'UP').subscribe(() => {
        service.loadRatingStats(123, 5).subscribe(stats => {
          expect(stats).toEqual(mockRatingStats);
          expect(mockEvaluationDiscussionService.voteCommentWithLimits).toHaveBeenCalled();
          expect(mockEvaluationDiscussionService.getRatingStats).toHaveBeenCalled();
          done();
        });
      });
    });
  });
});
