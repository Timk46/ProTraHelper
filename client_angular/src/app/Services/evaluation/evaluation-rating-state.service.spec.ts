import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EvaluationRatingStateService } from './evaluation-rating-state.service';
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { LoggerService } from '../logger/logger.service';
import {
  CategoryRatingStatus,
  RatingStatsDTO,
  EvaluationRatingDTO,
} from '@DTOs/index';

describe('EvaluationRatingStateService', () => {
  let service: EvaluationRatingStateService;
  let mockEvaluationService: jasmine.SpyObj<EvaluationDiscussionService>;
  let mockCacheService: jasmine.SpyObj<EvaluationCacheService>;
  let mockLoggerService: jasmine.SpyObj<LoggerService>;

  const mockRatingStatuses: CategoryRatingStatus[] = [
    {
      categoryId: 1,
      categoryName: 'cat1',
      displayName: 'Category 1',
      hasRated: false,
      rating: null,
      ratedAt: null,
      lastUpdatedAt: new Date(),
      canAccessDiscussion: false,
      isRequired: true,
    },
    {
      categoryId: 2,
      categoryName: 'cat2',
      displayName: 'Category 2',
      hasRated: true,
      rating: 8,
      ratedAt: new Date(),
      lastUpdatedAt: new Date(),
      canAccessDiscussion: true,
      isRequired: true,
    },
  ];

  const mockRatingStats: RatingStatsDTO = {
    submissionId: 123,
    categoryId: 1,
    averageScore: 7.5,
    totalRatings: 10,
    scoreDistribution: [
      { score: 7, count: 4 },
      { score: 8, count: 6 },
    ],
    userHasRated: false,
  };

  const mockRating: EvaluationRatingDTO = {
    id: 500,
    submissionId: 123,
    categoryId: 1,
    userId: 999,
    score: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    const evaluationServiceSpy = jasmine.createSpyObj('EvaluationDiscussionService', [
      'getUserRatingStatus',
      'getRatingStats',
      'createRating',
    ]);

    const cacheServiceSpy = jasmine.createSpyObj('EvaluationCacheService', [
      'getRatingStatsCache',
      'setRatingStatsCache',
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
        EvaluationRatingStateService,
        { provide: EvaluationDiscussionService, useValue: evaluationServiceSpy },
        { provide: EvaluationCacheService, useValue: cacheServiceSpy },
        { provide: LoggerService, useValue: loggerSpy },
      ],
    });

    service = TestBed.inject(EvaluationRatingStateService);
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

  describe('loadCategoryRatingStatus()', () => {
    it('should load and merge rating statuses from backend', (done) => {
      mockEvaluationService.getUserRatingStatus.and.returnValue(of(mockRatingStatuses));

      service.loadCategoryRatingStatus('123', 999);

      setTimeout(() => {
        service.categoryRatingStatus$.subscribe(statusMap => {
          expect(statusMap.size).toBe(2);
          expect(statusMap.get(1)?.hasRated).toBe(false);
          expect(statusMap.get(2)?.hasRated).toBe(true);
          expect(statusMap.get(2)?.rating).toBe(8);
          done();
        });
      }, 100);
    });

    it('should preserve fresh local data during merge', (done) => {
      // Setup: Create fresh local status (within 2 minutes)
      const freshLocalStatus: CategoryRatingStatus = {
        categoryId: 1,
        categoryName: 'cat1',
        displayName: 'Category 1',
        hasRated: true,
        rating: 9,
        ratedAt: new Date(),
        lastUpdatedAt: new Date(), // Fresh timestamp
        canAccessDiscussion: true,
        isRequired: true,
      };

      // Inject fresh local data
      service['categoryRatingStatusSubject'].next(new Map([[1, freshLocalStatus]]));

      // Backend returns different data (stale)
      const backendStatus: CategoryRatingStatus = {
        ...mockRatingStatuses[0],
        hasRated: false,
        rating: null,
      };

      mockEvaluationService.getUserRatingStatus.and.returnValue(of([backendStatus]));

      service.loadCategoryRatingStatus('123', 999);

      setTimeout(() => {
        service.categoryRatingStatus$.subscribe(statusMap => {
          // Should preserve fresh local data (rating: 9) over backend (rating: null)
          const status = statusMap.get(1);
          expect(status?.hasRated).toBe(true);
          expect(status?.rating).toBe(9);
          done();
        });
      }, 100);
    });

    it('should use backend data for stale local data', (done) => {
      // Setup: Create stale local status (older than 2 minutes)
      const staleDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const staleLocalStatus: CategoryRatingStatus = {
        categoryId: 1,
        categoryName: 'cat1',
        displayName: 'Category 1',
        hasRated: true,
        rating: 9,
        ratedAt: staleDate,
        lastUpdatedAt: staleDate, // Stale timestamp
        canAccessDiscussion: true,
        isRequired: true,
      };

      service['categoryRatingStatusSubject'].next(new Map([[1, staleLocalStatus]]));

      mockEvaluationService.getUserRatingStatus.and.returnValue(of(mockRatingStatuses));

      service.loadCategoryRatingStatus('123', 999);

      setTimeout(() => {
        service.categoryRatingStatus$.subscribe(statusMap => {
          // Should use backend data (hasRated: false) over stale local (hasRated: true)
          const status = statusMap.get(1);
          expect(status?.hasRated).toBe(false);
          done();
        });
      }, 100);
    });
  });

  describe('isCategoryRated$()', () => {
    it('should return true for rated category', (done) => {
      service['categoryRatingStatusSubject'].next(new Map([[2, mockRatingStatuses[1]]]));

      service.isCategoryRated$(2).subscribe(isRated => {
        expect(isRated).toBe(true);
        done();
      });
    });

    it('should return false for unrated category', (done) => {
      service['categoryRatingStatusSubject'].next(new Map([[1, mockRatingStatuses[0]]]));

      service.isCategoryRated$(1).subscribe(isRated => {
        expect(isRated).toBe(false);
        done();
      });
    });

    it('should return false for unknown category', (done) => {
      service.isCategoryRated$(999).subscribe(isRated => {
        expect(isRated).toBe(false);
        done();
      });
    });
  });

  describe('submitRating()', () => {
    beforeEach(() => {
      mockEvaluationService.createRating.and.returnValue(of(mockRating));
      mockEvaluationService.getRatingStats.and.returnValue(of(mockRatingStats));
    });

    it('should submit rating successfully', (done) => {
      service.submitRating('123', 1, 8).subscribe(rating => {
        expect(rating).toEqual(mockRating);
        expect(mockEvaluationService.createRating).toHaveBeenCalledWith(
          jasmine.objectContaining({
            submissionId: 123,
            categoryId: 1,
            score: 8,
          })
        );
        done();
      });
    });

    it('should mark category as rated after successful submission', (done) => {
      service.submitRating('123', 1, 8).subscribe(() => {
        service.categoryRatingStatus$.subscribe(statusMap => {
          const status = statusMap.get(1);
          expect(status?.hasRated).toBe(true);
          expect(status?.rating).toBe(8);
          expect(status?.canAccessDiscussion).toBe(true);
          done();
        });
      });
    });

    it('should refresh rating stats after submission', (done) => {
      service.submitRating('123', 1, 8).subscribe(() => {
        expect(mockEvaluationService.getRatingStats).toHaveBeenCalledWith('123', '1');
        done();
      });
    });

    it('should handle rating submission error', (done) => {
      mockEvaluationService.createRating.and.returnValue(
        throwError(() => new Error('Server error'))
      );

      service.submitRating('123', 1, 8).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Server error');
          done();
        },
      });
    });
  });

  describe('getRatingStats()', () => {
    it('should return cached stats if available', (done) => {
      const cacheSubject = service['cache']['ratingStatsCache'].get(1);
      if (cacheSubject) {
        cacheSubject.next(mockRatingStats);
      }
      mockCacheService.getRatingStatsCache.and.returnValue(cacheSubject!);

      service.getRatingStats('123', 1).subscribe(stats => {
        expect(stats).toEqual(mockRatingStats);
        // Should not trigger load if cache has non-zero totalRatings
        expect(mockEvaluationService.getRatingStats).not.toHaveBeenCalled();
        done();
      });
    });

    it('should load stats if cache is empty (totalRatings === 0)', () => {
      mockEvaluationService.getRatingStats.and.returnValue(of(mockRatingStats));
      const cacheSubject = service['cache']['ratingStatsCache'].get(1);
      mockCacheService.getRatingStatsCache.and.returnValue(cacheSubject!);

      service.getRatingStats('123', 1);

      expect(mockEvaluationService.getRatingStats).toHaveBeenCalledWith('123', '1');
    });
  });

  describe('Rating Status Merging Logic', () => {
    it('should merge all unique category IDs from both sources', () => {
      const localMap = new Map<number, CategoryRatingStatus>([
        [1, mockRatingStatuses[0]],
      ]);

      const backendStatuses = [mockRatingStatuses[1]]; // Category 2

      const merged = service['mergeRatingStatusMaps'](backendStatuses, localMap);

      expect(merged.size).toBe(2);
      expect(merged.has(1)).toBe(true);
      expect(merged.has(2)).toBe(true);
    });

    it('should prefer fresh local rating over backend', () => {
      const freshLocalStatus: CategoryRatingStatus = {
        ...mockRatingStatuses[1],
        rating: 10,
        lastUpdatedAt: new Date(), // Fresh
      };

      const localMap = new Map([[2, freshLocalStatus]]);

      const backendStatus: CategoryRatingStatus = {
        ...mockRatingStatuses[1],
        rating: 5, // Different from local
      };

      const merged = service['mergeRatingStatusMaps']([backendStatus], localMap);

      // Should keep local rating of 10
      expect(merged.get(2)?.rating).toBe(10);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on ngOnDestroy', () => {
      const destroySpy = spyOn(service['destroy$'], 'next');
      const completeSpy = spyOn(service['destroy$'], 'complete');

      service.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Debug State', () => {
    it('should provide debug state information', () => {
      service['categoryRatingStatusSubject'].next(new Map([
        [1, mockRatingStatuses[0]],
        [2, mockRatingStatuses[1]],
      ]));

      const debugState = service.getDebugState();

      expect(debugState.ratingStatus.totalCategories).toBe(2);
      expect(debugState.ratingStatus.ratedCategories.length).toBe(1); // Only category 2 is rated
      expect(debugState.config.FRESHNESS_THRESHOLD_MS).toBe(2 * 60 * 1000);
    });
  });
});
