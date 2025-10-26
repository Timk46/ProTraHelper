import { TestBed } from '@angular/core/testing';
import { EvaluationCacheService } from './evaluation-cache.service';
import { LoggerService } from '../logger/logger.service';

describe('EvaluationCacheService', () => {
  let service: EvaluationCacheService;
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    const loggerSpyObj = jasmine.createSpyObj('LoggerService', ['scope']);
    loggerSpyObj.scope.and.returnValue({
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error'),
    });

    TestBed.configureTestingModule({
      providers: [
        EvaluationCacheService,
        { provide: LoggerService, useValue: loggerSpyObj },
      ],
    });

    service = TestBed.inject(EvaluationCacheService);
    loggerSpy = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Discussion Cache', () => {
    it('should create discussion cache on first access', () => {
      const cache = service.getDiscussionCache(1);
      expect(cache).toBeTruthy();
      expect(service.hasDiscussionCache(1)).toBe(true);
    });

    it('should return same cache instance on subsequent access', () => {
      const cache1 = service.getDiscussionCache(1);
      const cache2 = service.getDiscussionCache(1);
      expect(cache1).toBe(cache2);
    });

    it('should update discussion cache', () => {
      const discussions = [
        { id: '1', title: 'Test Discussion', comments: [] } as any,
      ];
      service.setDiscussionCache(1, discussions);

      const cache = service.getDiscussionCache(1);
      cache.subscribe(value => {
        expect(value).toEqual(discussions);
      });
    });

    it('should clear discussion cache', () => {
      service.getDiscussionCache(1);
      service.clearDiscussionCache(1);
      expect(service.hasDiscussionCache(1)).toBe(false);
    });
  });

  describe('Rating Stats Cache', () => {
    it('should create rating stats cache with default values', () => {
      const cache = service.getRatingStatsCache(1);
      expect(cache).toBeTruthy();
      expect(service.hasRatingStatsCache(1)).toBe(true);

      cache.subscribe(stats => {
        expect(stats.categoryId).toBe(1);
        expect(stats.averageScore).toBe(0);
        expect(stats.totalRatings).toBe(0);
      });
    });

    it('should update rating stats cache', () => {
      const stats = {
        submissionId: 123,
        categoryId: 1,
        averageScore: 7.5,
        totalRatings: 10,
        scoreDistribution: [
          { score: 7, count: 5 },
          { score: 8, count: 5 }
        ],
        userHasRated: true,
      };
      service.setRatingStatsCache(1, stats);

      const cache = service.getRatingStatsCache(1);
      cache.subscribe(value => {
        expect(value).toEqual(stats);
      });
    });
  });

  describe('Vote Status Cache', () => {
    it('should create vote status cache on first access', () => {
      const cache = service.getVoteStatusCache('comment1');
      expect(cache).toBeTruthy();
      expect(service.hasVoteStatusCache('comment1')).toBe(true);
    });

    it('should update vote status cache', () => {
      service.setVoteStatusCache('comment1', 'UP');

      const cache = service.getVoteStatusCache('comment1');
      cache.subscribe(value => {
        expect(value).toBe('UP');
      });
    });
  });

  describe('Vote Loading Cache', () => {
    it('should create vote loading cache with false default', () => {
      const cache = service.getVoteLoadingCache('comment1');
      expect(cache).toBeTruthy();

      cache.subscribe(loading => {
        expect(loading).toBe(false);
      });
    });

    it('should update vote loading cache', () => {
      service.setVoteLoadingCache('comment1', true);

      const cache = service.getVoteLoadingCache('comment1');
      cache.subscribe(value => {
        expect(value).toBe(true);
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should invalidate all caches for a category', () => {
      service.getDiscussionCache(1);
      service.getRatingStatsCache(1);

      service.invalidateCategory(1);

      expect(service.hasDiscussionCache(1)).toBe(false);
      expect(service.hasRatingStatsCache(1)).toBe(false);
    });

    it('should clear all caches', () => {
      service.getDiscussionCache(1);
      service.getRatingStatsCache(1);
      service.getVoteStatusCache('comment1');
      service.getVoteLoadingCache('comment1');

      service.clearAll();

      expect(service.hasDiscussionCache(1)).toBe(false);
      expect(service.hasRatingStatsCache(1)).toBe(false);
      expect(service.hasVoteStatusCache('comment1')).toBe(false);
      expect(service.hasVoteLoadingCache('comment1')).toBe(false);
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', () => {
      service.getDiscussionCache(1);
      service.getDiscussionCache(2);
      service.getRatingStatsCache(1);
      service.getVoteStatusCache('comment1');

      const stats = service.getCacheStatistics();

      expect(stats.discussions.size).toBe(2);
      expect(stats.ratingStats.size).toBe(1);
      expect(stats.voteStatus.size).toBe(1);
      expect(stats.voteLoading.size).toBe(0);
    });
  });
});
