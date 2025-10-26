import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, takeUntil, take, tap } from 'rxjs/operators';

// DTOs
import {
  CategoryRatingStatus,
  RatingStatsDTO,
  EvaluationRatingDTO,
  CreateEvaluationRatingDTO,
} from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Manages rating status, statistics, and submission
 *
 * @description
 * This service is responsible for:
 * - Loading and caching rating status per category
 * - Loading and caching rating statistics
 * - Submitting ratings
 * - Merging backend and local rating status (preserving fresh local data)
 * - Providing observables for rating-related UI state
 *
 * @example
 * ```typescript
 * constructor(private ratingState: EvaluationRatingStateService) {}
 *
 * // Check if category is rated
 * this.ratingState.isCategoryRated$(categoryId)
 *   .subscribe(isRated => console.log('Rated:', isRated));
 *
 * // Submit a rating
 * this.ratingState.submitRating(submissionId, categoryId, 8)
 *   .subscribe(rating => console.log('Rating submitted:', rating));
 * ```
 *
 * @implements {OnDestroy}
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationRatingStateService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationRatingStateService');

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  private readonly CONFIG = {
    FRESHNESS_THRESHOLD_MS: 2 * 60 * 1000, // 2 minutes
  } as const;

  // =============================================================================
  // STATE SUBJECTS
  // =============================================================================

  /**
   * Map of categoryId → CategoryRatingStatus
   * Tracks whether user has rated each category and with what score
   */
  private categoryRatingStatusSubject = new BehaviorSubject<Map<number, CategoryRatingStatus>>(
    new Map()
  );

  /**
   * Loading state for rating status operations
   */
  private ratingStatusLoadingSubject = new BehaviorSubject<boolean>(false);

  /**
   * All ratings for the current submission
   */
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable stream of rating status per category
   */
  readonly categoryRatingStatus$ = this.categoryRatingStatusSubject.asObservable();

  /**
   * Observable stream of rating status loading state
   */
  readonly ratingStatusLoading$ = this.ratingStatusLoadingSubject.asObservable();

  /**
   * Observable stream of all ratings
   */
  readonly ratings$ = this.ratingsSubject.asObservable();

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private cache: EvaluationCacheService,
    private logger: LoggerService
  ) {
    this.log.debug('EvaluationRatingStateService initialized');
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnDestroy(): void {
    this.log.debug('Service destroying - cleanup started');
    this.destroy$.next();
    this.destroy$.complete();
    this.log.debug('Service destroyed - cleanup completed');
  }

  // =============================================================================
  // PUBLIC API - RATING STATUS
  // =============================================================================

  /**
   * Loads rating status for all categories of a submission
   *
   * @description
   * Fetches user's rating status from backend and merges with local cache.
   * Preserves fresh local data (within 2 minutes) to prevent UI flicker.
   *
   * @param submissionId - The submission ID
   * @param userId - The user ID (anonymous user ID)
   */
  loadCategoryRatingStatus(submissionId: string, userId: number): void {
    this.ratingStatusLoadingSubject.next(true);
    this.log.debug('Loading category rating status', { submissionId, userId });

    this.evaluationService.getUserRatingStatus(String(submissionId), userId).pipe(
      take(1),
      tap(statuses => {
        this.log.info('Received rating statuses from backend', {
          count: statuses.length,
          statuses: statuses.map(s => ({ id: s.categoryId, hasRated: s.hasRated })),
        });

        // Merge with existing local data
        const currentStatusMap = this.categoryRatingStatusSubject.value;
        const mergedStatusMap = this.mergeRatingStatusMaps(statuses, currentStatusMap);

        this.log.info('Rating status merged with local preservation', {
          totalCategories: mergedStatusMap.size,
          ratedCategories: Array.from(mergedStatusMap.values()).filter(s => s.hasRated).length,
        });

        this.categoryRatingStatusSubject.next(mergedStatusMap);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.ratingStatusLoadingSubject.next(false);
      },
      error: error => {
        this.log.error('Failed to load category rating status', { error });
        this.ratingStatusLoadingSubject.next(false);
      },
    });
  }

  /**
   * Checks if a specific category has been rated by the user
   *
   * @param categoryId - The category ID
   * @returns Observable<boolean> True if rated, false otherwise
   */
  isCategoryRated$(categoryId: number): Observable<boolean> {
    return this.categoryRatingStatus$.pipe(
      map(statusMap => {
        const status = statusMap.get(categoryId);
        return status?.hasRated ?? false;
      })
    );
  }

  /**
   * Gets the rating status for a specific category
   *
   * @param categoryId - The category ID
   * @returns Observable<CategoryRatingStatus | null> The rating status or null
   */
  getCategoryRatingStatus$(categoryId: number): Observable<CategoryRatingStatus | null> {
    return this.categoryRatingStatus$.pipe(
      map(statusMap => statusMap.get(categoryId) ?? null)
    );
  }

  /**
   * Updates rating status for a category after rating submission
   *
   * @description
   * Called after successful rating submission to update local cache.
   * Marks category as rated and stores the rating value.
   *
   * @param categoryId - The category ID
   * @param rating - The rating value
   * @param submissionId - The submission ID (for logging)
   */
  markCategoryAsRated(categoryId: number, rating: number, submissionId: string): void {
    const currentStatusMap = new Map(this.categoryRatingStatusSubject.value);
    const existingStatus = currentStatusMap.get(categoryId);

    const updatedStatus: CategoryRatingStatus = {
      ...existingStatus,
      categoryId,
      hasRated: true,
      rating,
      lastUpdatedAt: new Date(),
      canAccessDiscussion: true,
      ratedAt: new Date(),
    } as CategoryRatingStatus;

    currentStatusMap.set(categoryId, updatedStatus);
    this.categoryRatingStatusSubject.next(currentStatusMap);

    this.log.info('Category marked as rated', {
      categoryId,
      rating,
      submissionId,
    });
  }

  // =============================================================================
  // PUBLIC API - RATING STATS
  // =============================================================================

  /**
   * Gets rating statistics for a category
   *
   * @description
   * Returns an observable stream of rating stats. If cache is empty,
   * triggers a load from the backend.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Observable<RatingStatsDTO> Stream of rating stats
   */
  getRatingStats(submissionId: string, categoryId: number): Observable<RatingStatsDTO> {
    const subject = this.cache.getRatingStatsCache(categoryId);

    // Load stats if cache has default values (totalRatings === 0)
    if (subject.value.totalRatings === 0) {
      this.loadRatingStats(submissionId, categoryId);
    }

    return subject.asObservable();
  }

  /**
   * Refreshes rating statistics for a category
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   */
  refreshRatingStats(submissionId: string, categoryId: number): void {
    this.log.info('Refreshing rating stats', { submissionId, categoryId });
    this.loadRatingStats(submissionId, categoryId);
  }

  // =============================================================================
  // PUBLIC API - RATING SUBMISSION
  // =============================================================================

  /**
   * Submits a rating for a specific category
   *
   * @description
   * Creates a new rating and updates local cache with new stats.
   * Automatically refreshes rating statistics after successful submission.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param score - The rating score (1-10)
   * @returns Observable<EvaluationRatingDTO> The created rating
   */
  submitRating(
    submissionId: string,
    categoryId: number,
    score: number
  ): Observable<EvaluationRatingDTO> {
    this.log.info('Submitting rating', { submissionId, categoryId, score });

    const createRatingDto: CreateEvaluationRatingDTO = {
      submissionId: Number(submissionId),
      categoryId: categoryId,
      score,
    };

    return this.evaluationService.createRating(createRatingDto).pipe(
      map(rating => {
        // Update local cache
        this.markCategoryAsRated(categoryId, score, submissionId);
        this.refreshRatingStats(submissionId, categoryId);

        this.log.info('Rating submitted successfully', {
          ratingId: rating.id,
          categoryId,
          score,
        });

        return rating;
      })
    );
  }

  /**
   * Gets the current rating for a specific category
   *
   * @param categoryId - The category ID
   * @returns Observable<EvaluationRatingDTO | null> The current rating or null
   */
  getCurrentRating(categoryId: number): Observable<EvaluationRatingDTO | null> {
    return this.ratingsSubject.asObservable().pipe(
      map(ratings => {
        const rating = ratings.find(r => r.categoryId === categoryId);
        return rating || null;
      })
    );
  }

  // =============================================================================
  // PRIVATE METHODS - RATING STATUS MERGING
  // =============================================================================

  /**
   * Merges backend and local rating status maps
   *
   * @description
   * Intelligently merges backend and local rating status maps,
   * preferring fresh local data (updated within last 2 minutes) over
   * potentially stale backend cache data. This prevents UI flicker
   * and preserves optimistic updates.
   *
   * @param backendStatuses - Statuses from backend API
   * @param currentStatusMap - Current local status map
   * @returns Merged status map with fresh local data preserved
   * @private
   */
  private mergeRatingStatusMaps(
    backendStatuses: CategoryRatingStatus[],
    currentStatusMap: Map<number, CategoryRatingStatus>
  ): Map<number, CategoryRatingStatus> {
    const mergedStatusMap = new Map<number, CategoryRatingStatus>();

    // Convert backend array to map for efficient lookup
    const backendStatusMap = new Map(
      backendStatuses.map(status => [status.categoryId, status])
    );

    // Get all unique category IDs from both sources
    const allCategoryIds = new Set([
      ...currentStatusMap.keys(),
      ...backendStatusMap.keys()
    ]);

    // Merge logic: prefer fresh local data over backend
    allCategoryIds.forEach(categoryId => {
      const localStatus = currentStatusMap.get(categoryId);
      const backendStatus = backendStatusMap.get(categoryId);

      // Preserve fresh local data (updated within threshold) with rating
      if (localStatus?.lastUpdatedAt) {
        const isLocalFresh = localStatus.lastUpdatedAt.getTime() >
          (Date.now() - this.CONFIG.FRESHNESS_THRESHOLD_MS);
        const localHasRating = localStatus.hasRated && localStatus.rating !== null;

        if (isLocalFresh && localHasRating) {
          mergedStatusMap.set(categoryId, localStatus);
          this.log.debug('Preserved fresh local status', { categoryId });
          return;
        }
      }

      // Use backend data if available, otherwise fall back to local
      const statusToUse = backendStatus || localStatus;
      if (statusToUse) {
        mergedStatusMap.set(categoryId, statusToUse);
      }
    });

    return mergedStatusMap;
  }

  // =============================================================================
  // PRIVATE METHODS - RATING STATS LOADING
  // =============================================================================

  /**
   * Loads rating statistics for a specific category from backend
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @private
   */
  private loadRatingStats(submissionId: string, categoryId: number): void {
    this.log.debug('Loading rating stats', { submissionId, categoryId });

    this.evaluationService.getRatingStats(submissionId, categoryId.toString()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: stats => {
        this.cache.setRatingStatsCache(categoryId, stats);
        this.log.info('Rating stats loaded successfully', {
          categoryId,
          averageRating: stats.averageRating,
          totalRatings: stats.totalRatings,
        });
      },
      error: error => {
        this.log.error('Failed to load rating stats', { categoryId, error });
      },
    });
  }

  // =============================================================================
  // DIAGNOSTICS & DEBUGGING
  // =============================================================================

  /**
   * Gets current state for debugging
   *
   * @returns Object containing current state information
   */
  getDebugState() {
    return {
      ratingStatus: {
        totalCategories: this.categoryRatingStatusSubject.value.size,
        ratedCategories: Array.from(this.categoryRatingStatusSubject.value.values())
          .filter(s => s.hasRated)
          .map(s => ({ id: s.categoryId, rating: s.rating })),
      },
      loading: this.ratingStatusLoadingSubject.value,
      config: this.CONFIG,
    };
  }
}
