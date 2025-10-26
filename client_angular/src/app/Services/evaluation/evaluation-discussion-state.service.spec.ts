import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EvaluationDiscussionStateService } from './evaluation-discussion-state.service';
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { LoggerService } from '../logger/logger.service';
import { EvaluationDiscussionDTO } from '@DTOs/index';

describe('EvaluationDiscussionStateService', () => {
  let service: EvaluationDiscussionStateService;
  let mockEvaluationService: jasmine.SpyObj<EvaluationDiscussionService>;
  let mockCacheService: jasmine.SpyObj<EvaluationCacheService>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;

  const mockDiscussions: EvaluationDiscussionDTO[] = [
    {
      id: 1,
      submissionId: 123,
      categoryId: 1,
      comments: [
        {
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
          voteStats: { upVotes: 5, downVotes: 0, totalVotes: 5, score: 5 },
          replies: [],
          replyCount: 0,
        },
      ],
      createdAt: new Date(),
      totalComments: 1,
      availableComments: 9,
      usedComments: 1,
    },
  ];

  beforeEach(() => {
    const evaluationServiceSpy = jasmine.createSpyObj('EvaluationDiscussionService', [
      'getDiscussionsByCategory',
    ]);

    const cacheServiceSpy = jasmine.createSpyObj('EvaluationCacheService', [
      'getDiscussionCache',
      'setDiscussionCache',
      'clearDiscussionCache',
      'clearAll',
    ]);

    const loggerSpy = jasmine.createSpyObj('LoggerService', ['scope']);
    loggerSpy.scope.and.returnValue({
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error'),
    });

    TestBed.configureTestingModule({
      providers: [
        EvaluationDiscussionStateService,
        { provide: EvaluationDiscussionService, useValue: evaluationServiceSpy },
        { provide: EvaluationCacheService, useValue: cacheServiceSpy },
        { provide: LoggerService, useValue: loggerSpy },
      ],
    });

    service = TestBed.inject(EvaluationDiscussionStateService);
    mockEvaluationService = TestBed.inject(EvaluationDiscussionService) as jasmine.SpyObj<EvaluationDiscussionService>;
    mockCacheService = TestBed.inject(EvaluationCacheService) as jasmine.SpyObj<EvaluationCacheService>;
    mockLoggerService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDiscussions()', () => {
    it('should return cached discussions if available', (done) => {
      // Setup cache with existing data
      const cacheSubject = service['cache']['discussionCache'].get(1);
      if (cacheSubject) {
        cacheSubject.next(mockDiscussions);
      }
      mockCacheService.getDiscussionCache.and.returnValue(cacheSubject!);

      service.getDiscussions('123', 1).subscribe(discussions => {
        expect(discussions).toEqual(mockDiscussions);
        expect(mockEvaluationService.getDiscussionsByCategory).not.toHaveBeenCalled();
        done();
      });
    });

    it('should load discussions from backend if cache is empty', (done) => {
      // Setup empty cache
      const cacheSubject = service['cache']['discussionCache'].get(1);
      mockCacheService.getDiscussionCache.and.returnValue(cacheSubject!);
      mockEvaluationService.getDiscussionsByCategory.and.returnValue(of(mockDiscussions));

      service.getDiscussions('123', 1).subscribe(discussions => {
        expect(mockEvaluationService.getDiscussionsByCategory).toHaveBeenCalledWith('123', '1');
        done();
      });
    });

    it('should prevent concurrent loads of the same category', () => {
      const cacheSubject = service['cache']['discussionCache'].get(1);
      mockCacheService.getDiscussionCache.and.returnValue(cacheSubject!);
      mockEvaluationService.getDiscussionsByCategory.and.returnValue(of(mockDiscussions));

      // First call should trigger load
      service.getDiscussions('123', 1);
      expect(mockEvaluationService.getDiscussionsByCategory).toHaveBeenCalledTimes(1);

      // Second concurrent call should not trigger another load
      service.getDiscussions('123', 1);
      expect(mockEvaluationService.getDiscussionsByCategory).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshDiscussions()', () => {
    it('should clear cache and reload discussions', () => {
      mockEvaluationService.getDiscussionsByCategory.and.returnValue(of(mockDiscussions));
      const cacheSubject = service['cache']['discussionCache'].get(1);
      mockCacheService.getDiscussionCache.and.returnValue(cacheSubject!);

      service.refreshDiscussions('123', 1);

      expect(mockCacheService.clearDiscussionCache).toHaveBeenCalledWith(1);
      expect(mockEvaluationService.getDiscussionsByCategory).toHaveBeenCalledWith('123', '1');
    });
  });

  describe('Comment Tracking', () => {
    it('should track comment-to-category mapping', () => {
      const cacheSubject = service['cache']['discussionCache'].get(1);
      mockCacheService.getDiscussionCache.and.returnValue(cacheSubject!);
      mockEvaluationService.getDiscussionsByCategory.and.returnValue(of(mockDiscussions));

      service.getDiscussions('123', 1);

      // Wait for async operation
      setTimeout(() => {
        const categoryId = service.getCategoryForComment('100');
        expect(categoryId).toBe(1);
      }, 100);
    });

    it('should mark category as commented', (done) => {
      service.markCategoryAsCommented(1, '123');

      service.hasCommentedInCategory(1).subscribe(hasCommented => {
        expect(hasCommented).toBe(true);
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide empty fallback on load error', (done) => {
      const cacheSubject = service['cache']['discussionCache'].get(1);
      mockCacheService.getDiscussionCache.and.returnValue(cacheSubject!);
      mockEvaluationService.getDiscussionsByCategory.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      service.getDiscussions('123', 1).subscribe(discussions => {
        expect(discussions).toEqual([]);
        done();
      });
    });
  });

  describe('Cleanup', () => {
    it('should invalidate all caches and clear maps on invalidateAllDiscussions()', () => {
      service['commentIdToCategoryIdMap'].set('100', 1);
      service['categoryLoadingStates'].set(1, true);

      service.invalidateAllDiscussions();

      expect(mockCacheService.clearAll).toHaveBeenCalled();
      expect(service['commentIdToCategoryIdMap'].size).toBe(0);
      expect(service['categoryLoadingStates'].size).toBe(0);
    });

    it('should cleanup on ngOnDestroy', () => {
      const destroySpy = spyOn(service['destroy$'], 'next');
      const completeSpy = spyOn(service['destroy$'], 'complete');

      service.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
