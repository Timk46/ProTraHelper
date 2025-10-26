import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { EvaluationFacade } from './evaluation.facade';
import { EvaluationStateService } from './evaluation-state.service';
import { LoggerService } from '../logger/logger.service';
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  CategoryRatingStatus,
  EvaluationCommentDTO,
  EvaluationRatingDTO,
  EvaluationPhase,
  EvaluationStatus,
} from '@DTOs/index';

describe('EvaluationFacade', () => {
  let facade: EvaluationFacade;
  let mockStateService: jasmine.SpyObj<EvaluationStateService>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;

  const mockSubmission: EvaluationSubmissionDTO = {
    id: 123,
    title: 'Test Submission',
    description: 'Test description',
    authorId: 1,
    pdfFileId: 456,
    sessionId: 10,
    status: EvaluationStatus.SUBMITTED,
    phase: EvaluationPhase.DISCUSSION,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategories: EvaluationCategoryDTO[] = [
    {
      id: 1,
      name: 'cat1',
      displayName: 'Category 1',
      description: 'Test category 1',
      icon: 'check_circle',
      order: 1,
    },
    {
      id: 2,
      name: 'cat2',
      displayName: 'Category 2',
      description: 'Test category 2',
      icon: 'palette',
      order: 2,
    },
  ];

  const mockDiscussions: EvaluationDiscussionDTO[] = [
    {
      id: 1,
      submissionId: 123,
      categoryId: 1,
      comments: [],
      createdAt: new Date(),
      totalComments: 0,
      availableComments: 10,
      usedComments: 0,
    },
  ];

  const mockCommentStats: CommentStatsDTO = {
    submissionId: 123,
    totalAvailable: 10,
    totalUsed: 2,
    categories: [],
    overallProgress: 20,
    averageUsage: 20,
    userLimits: {
      userId: 999,
      totalLimit: 10,
      totalUsed: 2,
      canComment: true,
    },
  };

  const mockAnonymousUser: AnonymousEvaluationUserDTO = {
    id: 999,
    userId: 1,
    displayName: 'Anonymous User',
    submissionId: 123,
    colorCode: '#2196F3',
    createdAt: new Date(),
  };

  const mockComment: EvaluationCommentDTO = {
    id: 100,
    submissionId: 123,
    categoryId: 1,
    authorId: 999,
    content: 'Test comment',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 999,
      type: 'anonymous',
      displayName: 'Anonymous User',
      colorCode: '#2196F3',
    },
    votes: [],
    voteStats: { upVotes: 0, downVotes: 0, totalVotes: 0, score: 0 },
    replies: [],
    replyCount: 0,
  };

  const mockRating: EvaluationRatingDTO = {
    id: 200,
    submissionId: 123,
    categoryId: 1,
    userId: 999,
    score: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Create spy object with all required methods
    const stateServiceSpy = jasmine.createSpyObj('EvaluationStateService', [
      'loadSubmission',
      'refreshAll',
      'transitionToCategory',
      'isCategoryRated$',
      'hasCommentedInCategory$',
      'addComment',
      'addReply',
      'submitRating',
      'getRatingStats',
    ], {
      // Add property spies
      submissionSubject: new BehaviorSubject(mockSubmission),
      activeCategorySubject: new BehaviorSubject(1),
      anonymousUserSubject: new BehaviorSubject(mockAnonymousUser),
    });

    // Setup observable properties
    Object.defineProperty(stateServiceSpy, 'submission$', {
      get: () => of(mockSubmission),
    });
    Object.defineProperty(stateServiceSpy, 'categories$', {
      get: () => of(mockCategories),
    });
    Object.defineProperty(stateServiceSpy, 'activeCategory$', {
      get: () => of(1),
    });
    Object.defineProperty(stateServiceSpy, 'activeCategoryInfo$', {
      get: () => of(mockCategories[0]),
    });
    Object.defineProperty(stateServiceSpy, 'activeDiscussions$', {
      get: () => of(mockDiscussions),
    });
    Object.defineProperty(stateServiceSpy, 'commentStats$', {
      get: () => of(mockCommentStats),
    });
    Object.defineProperty(stateServiceSpy, 'anonymousUser$', {
      get: () => of(mockAnonymousUser),
    });
    Object.defineProperty(stateServiceSpy, 'loading$', {
      get: () => of(false),
    });
    Object.defineProperty(stateServiceSpy, 'error$', {
      get: () => of(null),
    });
    Object.defineProperty(stateServiceSpy, 'categoryRatingStatus$', {
      get: () => of(new Map<number, CategoryRatingStatus>()),
    });
    Object.defineProperty(stateServiceSpy, 'categoryCommentStatus$', {
      get: () => of(new Map<number, boolean>()),
    });
    Object.defineProperty(stateServiceSpy, 'voteLimitStatus$', {
      get: () => of(new Map()),
    });

    const loggerSpy = jasmine.createSpyObj('LoggerService', ['scope']);
    loggerSpy.scope.and.returnValue({
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error'),
    });

    TestBed.configureTestingModule({
      providers: [
        EvaluationFacade,
        { provide: EvaluationStateService, useValue: stateServiceSpy },
        { provide: LoggerService, useValue: loggerSpy },
      ],
    });

    facade = TestBed.inject(EvaluationFacade);
    mockStateService = TestBed.inject(EvaluationStateService) as jasmine.SpyObj<EvaluationStateService>;
    mockLoggerService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  describe('ViewModel (vm$)', () => {
    it('should combine all state into single ViewModel', (done) => {
      facade.vm$.subscribe(vm => {
        expect(vm.submission).toEqual(mockSubmission);
        expect(vm.categories).toEqual(mockCategories);
        expect(vm.activeCategory).toBe(1);
        expect(vm.activeCategoryInfo).toEqual(mockCategories[0]);
        expect(vm.discussions).toEqual(mockDiscussions);
        expect(vm.commentStats).toEqual(mockCommentStats);
        expect(vm.anonymousUser).toEqual(mockAnonymousUser);
        expect(vm.loading).toBe(false);
        expect(vm.error).toBe(null);
        done();
      });
    });

    it('should compute isReady flag correctly', (done) => {
      facade.vm$.subscribe(vm => {
        expect(vm.isReady).toBe(true); // !loading && !!submission && categories.length > 0
        done();
      });
    });

    it('should compute hasError flag correctly', (done) => {
      // Change error state
      Object.defineProperty(mockStateService, 'error$', {
        get: () => of('Some error'),
      });

      // Need to recreate facade with new service state
      const newFacade = new EvaluationFacade(mockStateService, mockLoggerService);

      newFacade.vm$.subscribe(vm => {
        expect(vm.hasError).toBe(true);
        done();
      });
    });

    it('should set isReady to false when loading', (done) => {
      Object.defineProperty(mockStateService, 'loading$', {
        get: () => of(true),
      });

      const newFacade = new EvaluationFacade(mockStateService, mockLoggerService);

      newFacade.vm$.subscribe(vm => {
        expect(vm.isReady).toBe(false);
        done();
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize evaluation with submission and user ID', () => {
      facade.initializeEvaluation('123', 1);

      expect(mockStateService.loadSubmission).toHaveBeenCalledWith('123', 1);
    });

    it('should refresh all evaluation data', () => {
      facade.refreshEvaluation('123', 1);

      expect(mockStateService.refreshAll).toHaveBeenCalledWith('123', 1);
    });
  });

  describe('Category Management', () => {
    it('should switch category', (done) => {
      mockStateService.transitionToCategory.and.returnValue(of(void 0));

      facade.switchCategory(2).subscribe(() => {
        expect(mockStateService.transitionToCategory).toHaveBeenCalledWith(2);
        done();
      });
    });

    it('should check if category is rated', (done) => {
      mockStateService.isCategoryRated$.and.returnValue(of(true));

      facade.isCategoryRated$(1).subscribe(isRated => {
        expect(isRated).toBe(true);
        expect(mockStateService.isCategoryRated$).toHaveBeenCalledWith(1);
        done();
      });
    });

    it('should check if user has commented in category', (done) => {
      mockStateService.hasCommentedInCategory$.and.returnValue(of(true));

      facade.hasCommentedInCategory$(1).subscribe(hasCommented => {
        expect(hasCommented).toBe(true);
        expect(mockStateService.hasCommentedInCategory$).toHaveBeenCalledWith(1);
        done();
      });
    });
  });

  describe('Comment Management', () => {
    it('should submit comment successfully', (done) => {
      mockStateService.addComment.and.returnValue(of(mockComment));

      facade.submitComment('Test content').subscribe(comment => {
        expect(comment).toEqual(mockComment);
        expect(mockStateService.addComment).toHaveBeenCalledWith('123', 1, 'Test content');
        done();
      });
    });

    it('should throw error if submission not loaded', (done) => {
      // Simulate no submission loaded
      mockStateService['submissionSubject'].next(null);

      facade.submitComment('Test').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Invalid state');
          done();
        },
      });
    });

    it('should throw error if no active category', (done) => {
      // Simulate no active category
      mockStateService['activeCategorySubject'].next(null);

      facade.submitComment('Test').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Invalid state');
          done();
        },
      });
    });

    it('should submit reply successfully', (done) => {
      mockStateService.addReply.and.returnValue(of(mockComment));

      facade.submitReply('100', 'Reply content').subscribe(comment => {
        expect(comment).toEqual(mockComment);
        expect(mockStateService.addReply).toHaveBeenCalledWith('123', 1, '100', 'Reply content');
        done();
      });
    });
  });

  describe('Rating Management', () => {
    it('should submit rating successfully', (done) => {
      mockStateService.submitRating.and.returnValue(of(mockRating));

      facade.submitRating(8).subscribe(rating => {
        expect(rating).toEqual(mockRating);
        expect(mockStateService.submitRating).toHaveBeenCalledWith('123', 1, 8);
        done();
      });
    });

    it('should throw error if submission not loaded when submitting rating', (done) => {
      mockStateService['submissionSubject'].next(null);

      facade.submitRating(8).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Invalid state');
          done();
        },
      });
    });

    it('should get rating stats', (done) => {
      const mockStats = {
        submissionId: 123,
        categoryId: 1,
        averageScore: 7.5,
        totalRatings: 10,
        scoreDistribution: [],
        userHasRated: false,
      };
      mockStateService.getRatingStats.and.returnValue(of(mockStats));

      facade.getRatingStats(1).subscribe(stats => {
        expect(stats).toEqual(mockStats);
        expect(mockStateService.getRatingStats).toHaveBeenCalledWith('123', 1);
        done();
      });
    });

    it('should throw error if no submission loaded when getting rating stats', (done) => {
      mockStateService['submissionSubject'].next(null);

      facade.getRatingStats(1).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('No submission loaded');
          done();
        },
      });
    });
  });

  describe('Helper Methods', () => {
    it('should get current submission ID', () => {
      const submissionId = facade.getCurrentSubmissionId();
      expect(submissionId).toBe('123');
    });

    it('should return null if no submission', () => {
      mockStateService['submissionSubject'].next(null);
      const submissionId = facade.getCurrentSubmissionId();
      expect(submissionId).toBe(null);
    });

    it('should get current category ID', () => {
      const categoryId = facade.getCurrentCategoryId();
      expect(categoryId).toBe(1);
    });

    it('should get current anonymous user', () => {
      const user = facade.getCurrentAnonymousUser();
      expect(user).toEqual(mockAnonymousUser);
    });
  });

  describe('Integration: Complete User Flow', () => {
    it('should support full evaluation workflow', (done) => {
      // 1. Initialize
      facade.initializeEvaluation('123', 1);
      expect(mockStateService.loadSubmission).toHaveBeenCalled();

      // 2. Wait for ViewModel to be ready
      facade.vm$.subscribe(vm => {
        if (vm.isReady) {
          expect(vm.submission).toBeTruthy();
          expect(vm.categories.length).toBeGreaterThan(0);

          // 3. Submit rating
          mockStateService.submitRating.and.returnValue(of(mockRating));
          facade.submitRating(8).subscribe(() => {

            // 4. Submit comment
            mockStateService.addComment.and.returnValue(of(mockComment));
            facade.submitComment('Great work!').subscribe(() => {

              // 5. Switch category
              mockStateService.transitionToCategory.and.returnValue(of(void 0));
              facade.switchCategory(2).subscribe(() => {
                expect(mockStateService.transitionToCategory).toHaveBeenCalledWith(2);
                done();
              });
            });
          });
        }
      });
    });
  });
});
