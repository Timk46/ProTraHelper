import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// DTOs
import { EvaluationDiscussionDTO, RatingStatsDTO, VoteType } from '@DTOs/index';

// Services
import { LoggerService } from '../logger/logger.service';

// Utils
import { LRUCache } from '../../utils/LRUCache';

/**
 * Centralized cache management service for evaluation data
 *
 * @description
 * Manages all LRU caches for evaluation-related data including:
 * - Discussion threads per category
 * - Rating statistics per category
 * - Vote status per comment
 * - Vote loading states per comment
 *
 * This service provides type-safe cache access and automatic cleanup
 * on eviction via LRU (Least Recently Used) algorithm.
 *
 * @example
 * ```typescript
 * constructor(private cache: EvaluationCacheService) {}
 *
 * // Get cached discussions
 * const discussions$ = this.cache.getDiscussionCache(categoryId);
 *
 * // Invalidate category cache
 * this.cache.invalidateCategory(categoryId);
 * ```
 *
 * @implements {OnDestroy}
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationCacheService {
  private readonly log = this.logger.scope('EvaluationCacheService');

  // =============================================================================
  // CACHE CONFIGURATION
  // =============================================================================

  private readonly CONFIG = {
    CACHE_SIZES: {
      DISCUSSIONS: 20,         // Max 20 categories cached
      RATING_STATS: 20,        // Max 20 rating stats cached
      VOTE_STATUS: 200,        // Max 200 comment vote statuses cached
      VOTE_LOADING: 200,       // Max 200 vote loading states cached
    },
  } as const;

  // =============================================================================
  // LRU CACHES
  // =============================================================================

  /**
   * Cache for discussion threads per category
   * Key: categoryId, Value: BehaviorSubject<EvaluationDiscussionDTO[]>
   */
  private discussionCache = new LRUCache<number, BehaviorSubject<EvaluationDiscussionDTO[]>>(
    this.CONFIG.CACHE_SIZES.DISCUSSIONS,
    (categoryId, subject) => {
      subject.complete();
      this.log.debug('LRU evicted discussion cache', { categoryId });
    }
  );

  /**
   * Cache for rating statistics per category
   * Key: categoryId, Value: BehaviorSubject<RatingStatsDTO>
   */
  private ratingStatsCache = new LRUCache<number, BehaviorSubject<RatingStatsDTO>>(
    this.CONFIG.CACHE_SIZES.RATING_STATS,
    (categoryId, subject) => {
      subject.complete();
      this.log.debug('LRU evicted rating stats cache', { categoryId });
    }
  );

  /**
   * Cache for comment vote status
   * Key: commentId, Value: BehaviorSubject<VoteType | null>
   */
  private commentVoteStatusCache = new LRUCache<string, BehaviorSubject<VoteType | null>>(
    this.CONFIG.CACHE_SIZES.VOTE_STATUS,
    (commentId, subject) => {
      subject.complete();
      this.log.debug('LRU evicted vote status cache', { commentId });
    }
  );

  /**
   * Cache for comment vote loading states
   * Key: commentId, Value: BehaviorSubject<boolean>
   */
  private commentVoteLoadingCache = new LRUCache<string, BehaviorSubject<boolean>>(
    this.CONFIG.CACHE_SIZES.VOTE_LOADING,
    (commentId, subject) => {
      subject.complete();
      this.log.debug('LRU evicted vote loading cache', { commentId });
    }
  );

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(private logger: LoggerService) {
    this.log.debug('EvaluationCacheService initialized', {
      cacheSizes: this.CONFIG.CACHE_SIZES
    });
  }

  // =============================================================================
  // DISCUSSION CACHE MANAGEMENT
  // =============================================================================

  /**
   * Gets the discussion cache subject for a category, creating if needed
   *
   * @param categoryId - The category ID
   * @returns BehaviorSubject containing discussions for the category
   */
  getDiscussionCache(categoryId: number): BehaviorSubject<EvaluationDiscussionDTO[]> {
    if (!this.discussionCache.has(categoryId)) {
      const newSubject = new BehaviorSubject<EvaluationDiscussionDTO[]>([]);
      this.discussionCache.set(categoryId, newSubject);
      this.log.debug('Discussion cache created', { categoryId });
    }
    return this.discussionCache.get(categoryId)!;
  }

  /**
   * Checks if discussion cache exists for a category
   *
   * @param categoryId - The category ID
   * @returns True if cache exists, false otherwise
   */
  hasDiscussionCache(categoryId: number): boolean {
    return this.discussionCache.has(categoryId);
  }

  /**
   * Sets discussion data in cache
   *
   * @param categoryId - The category ID
   * @param discussions - The discussions to cache
   */
  setDiscussionCache(categoryId: number, discussions: EvaluationDiscussionDTO[]): void {
    const subject = this.getDiscussionCache(categoryId);
    subject.next(discussions);
    this.log.debug('Discussion cache updated', { categoryId, count: discussions.length });
  }

  /**
   * Clears discussion cache for a category
   *
   * @param categoryId - The category ID
   */
  clearDiscussionCache(categoryId: number): void {
    if (this.discussionCache.has(categoryId)) {
      const subject = this.discussionCache.get(categoryId)!;
      subject.complete();
      this.discussionCache.delete(categoryId);
      this.log.debug('Discussion cache cleared', { categoryId });
    }
  }

  // =============================================================================
  // RATING STATS CACHE MANAGEMENT
  // =============================================================================

  /**
   * Gets the rating stats cache subject for a category, creating if needed
   *
   * @param categoryId - The category ID
   * @returns BehaviorSubject containing rating stats for the category
   */
  getRatingStatsCache(categoryId: number): BehaviorSubject<RatingStatsDTO> {
    if (!this.ratingStatsCache.has(categoryId)) {
      const defaultStats: RatingStatsDTO = {
        categoryId,
        averageRating: 0,
        totalRatings: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
      };
      const newSubject = new BehaviorSubject<RatingStatsDTO>(defaultStats);
      this.ratingStatsCache.set(categoryId, newSubject);
      this.log.debug('Rating stats cache created', { categoryId });
    }
    return this.ratingStatsCache.get(categoryId)!;
  }

  /**
   * Checks if rating stats cache exists for a category
   *
   * @param categoryId - The category ID
   * @returns True if cache exists, false otherwise
   */
  hasRatingStatsCache(categoryId: number): boolean {
    return this.ratingStatsCache.has(categoryId);
  }

  /**
   * Sets rating stats data in cache
   *
   * @param categoryId - The category ID
   * @param stats - The rating stats to cache
   */
  setRatingStatsCache(categoryId: number, stats: RatingStatsDTO): void {
    const subject = this.getRatingStatsCache(categoryId);
    subject.next(stats);
    this.log.debug('Rating stats cache updated', { categoryId, stats });
  }

  /**
   * Clears rating stats cache for a category
   *
   * @param categoryId - The category ID
   */
  clearRatingStatsCache(categoryId: number): void {
    if (this.ratingStatsCache.has(categoryId)) {
      const subject = this.ratingStatsCache.get(categoryId)!;
      subject.complete();
      this.ratingStatsCache.delete(categoryId);
      this.log.debug('Rating stats cache cleared', { categoryId });
    }
  }

  // =============================================================================
  // VOTE STATUS CACHE MANAGEMENT
  // =============================================================================

  /**
   * Gets the vote status cache subject for a comment, creating if needed
   *
   * @param commentId - The comment ID
   * @returns BehaviorSubject containing vote status for the comment
   */
  getVoteStatusCache(commentId: string): BehaviorSubject<VoteType | null> {
    if (!this.commentVoteStatusCache.has(commentId)) {
      const newSubject = new BehaviorSubject<VoteType | null>(null);
      this.commentVoteStatusCache.set(commentId, newSubject);
      this.log.debug('Vote status cache created', { commentId });
    }
    return this.commentVoteStatusCache.get(commentId)!;
  }

  /**
   * Checks if vote status cache exists for a comment
   *
   * @param commentId - The comment ID
   * @returns True if cache exists, false otherwise
   */
  hasVoteStatusCache(commentId: string): boolean {
    return this.commentVoteStatusCache.has(commentId);
  }

  /**
   * Sets vote status data in cache
   *
   * @param commentId - The comment ID
   * @param voteType - The vote type to cache
   */
  setVoteStatusCache(commentId: string, voteType: VoteType | null): void {
    const subject = this.getVoteStatusCache(commentId);
    subject.next(voteType);
    this.log.debug('Vote status cache updated', { commentId, voteType });
  }

  /**
   * Clears vote status cache for a comment
   *
   * @param commentId - The comment ID
   */
  clearVoteStatusCache(commentId: string): void {
    if (this.commentVoteStatusCache.has(commentId)) {
      const subject = this.commentVoteStatusCache.get(commentId)!;
      subject.complete();
      this.commentVoteStatusCache.delete(commentId);
      this.log.debug('Vote status cache cleared', { commentId });
    }
  }

  // =============================================================================
  // VOTE LOADING CACHE MANAGEMENT
  // =============================================================================

  /**
   * Gets the vote loading cache subject for a comment, creating if needed
   *
   * @param commentId - The comment ID
   * @returns BehaviorSubject containing loading state for the comment
   */
  getVoteLoadingCache(commentId: string): BehaviorSubject<boolean> {
    if (!this.commentVoteLoadingCache.has(commentId)) {
      const newSubject = new BehaviorSubject<boolean>(false);
      this.commentVoteLoadingCache.set(commentId, newSubject);
      this.log.debug('Vote loading cache created', { commentId });
    }
    return this.commentVoteLoadingCache.get(commentId)!;
  }

  /**
   * Checks if vote loading cache exists for a comment
   *
   * @param commentId - The comment ID
   * @returns True if cache exists, false otherwise
   */
  hasVoteLoadingCache(commentId: string): boolean {
    return this.commentVoteLoadingCache.has(commentId);
  }

  /**
   * Sets vote loading state in cache
   *
   * @param commentId - The comment ID
   * @param loading - The loading state to cache
   */
  setVoteLoadingCache(commentId: string, loading: boolean): void {
    const subject = this.getVoteLoadingCache(commentId);
    subject.next(loading);
    this.log.debug('Vote loading cache updated', { commentId, loading });
  }

  /**
   * Clears vote loading cache for a comment
   *
   * @param commentId - The comment ID
   */
  clearVoteLoadingCache(commentId: string): void {
    if (this.commentVoteLoadingCache.has(commentId)) {
      const subject = this.commentVoteLoadingCache.get(commentId)!;
      subject.complete();
      this.commentVoteLoadingCache.delete(commentId);
      this.log.debug('Vote loading cache cleared', { commentId });
    }
  }

  // =============================================================================
  // BULK OPERATIONS
  // =============================================================================

  /**
   * Invalidates all caches for a specific category
   *
   * @param categoryId - The category ID
   */
  invalidateCategory(categoryId: number): void {
    this.clearDiscussionCache(categoryId);
    this.clearRatingStatsCache(categoryId);
    this.log.info('Category cache invalidated', { categoryId });
  }

  /**
   * Clears all caches
   *
   * @description Should be called on service destruction or user logout
   */
  clearAll(): void {
    // Clear discussion cache
    this.discussionCache.forEach((subject) => subject.complete());
    this.discussionCache.clear();

    // Clear rating stats cache
    this.ratingStatsCache.forEach((subject) => subject.complete());
    this.ratingStatsCache.clear();

    // Clear vote status cache
    this.commentVoteStatusCache.forEach((subject) => subject.complete());
    this.commentVoteStatusCache.clear();

    // Clear vote loading cache
    this.commentVoteLoadingCache.forEach((subject) => subject.complete());
    this.commentVoteLoadingCache.clear();

    this.log.info('All caches cleared');
  }

  // =============================================================================
  // DIAGNOSTICS & DEBUGGING
  // =============================================================================

  /**
   * Gets cache statistics for monitoring and debugging
   *
   * @returns Object containing cache statistics
   */
  getCacheStatistics() {
    return {
      discussions: {
        size: this.discussionCache.size,
        maxSize: this.CONFIG.CACHE_SIZES.DISCUSSIONS,
        keys: Array.from(this.discussionCache.keys()),
      },
      ratingStats: {
        size: this.ratingStatsCache.size,
        maxSize: this.CONFIG.CACHE_SIZES.RATING_STATS,
        keys: Array.from(this.ratingStatsCache.keys()),
      },
      voteStatus: {
        size: this.commentVoteStatusCache.size,
        maxSize: this.CONFIG.CACHE_SIZES.VOTE_STATUS,
        sampleKeys: Array.from(this.commentVoteStatusCache.keys()).slice(0, 10), // First 10 for debugging
      },
      voteLoading: {
        size: this.commentVoteLoadingCache.size,
        maxSize: this.CONFIG.CACHE_SIZES.VOTE_LOADING,
        sampleKeys: Array.from(this.commentVoteLoadingCache.keys()).slice(0, 10), // First 10 for debugging
      },
    };
  }
}
