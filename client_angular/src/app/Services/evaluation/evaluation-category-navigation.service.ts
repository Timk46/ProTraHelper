import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

// DTOs
import { EvaluationCategoryDTO } from '@DTOs/index';

// Services
import { LoggerService } from '../logger/logger.service';

/**
 * Specialized service for evaluation category navigation state
 *
 * @description
 * Manages the state of which category is currently active in the evaluation forum.
 * Provides a centralized location for category selection state without
 * owning the complex transition logic (which remains in EvaluationStateService
 * to avoid circular dependencies).
 *
 * Responsibilities:
 * - Track currently active category ID
 * - Provide category change notifications
 * - Initialize default category from available categories
 * - Simple category selection (without complex loading orchestration)
 *
 * Extracted from EvaluationStateService for better separation of concerns.
 *
 * @architecture
 * This service follows HEFL best practices by:
 * - Using DTOs from @DTOs/index
 * - Providing Observable-based reactive API
 * - Avoiding circular dependencies (doesn't inject other evaluation services)
 * - Simple state management only
 *
 * @since 3.0.0 (Extracted from EvaluationStateService)
 */
@Injectable({
  providedIn: 'root',
})
export class EvaluationCategoryNavigationService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationCategoryNavigationService');

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // =============================================================================
  // STATE SUBJECTS
  // =============================================================================

  /**
   * Currently active category ID
   */
  private activeCategorySubject = new BehaviorSubject<number | null>(null);

  /**
   * Category transition loading state
   * Set to true while transitioning between categories
   */
  private categoryTransitionLoadingSubject = new BehaviorSubject<boolean>(false);

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for active category ID
   * Emits the currently selected category or null if none selected
   */
  readonly activeCategory$ = this.activeCategorySubject.asObservable().pipe(
    distinctUntilChanged()
  );

  /**
   * Observable for category transition loading state
   * Emits true while transitioning, false when idle
   */
  readonly categoryTransitionLoading$ = this.categoryTransitionLoadingSubject.asObservable();

  // =============================================================================
  // CONSTRUCTOR & INITIALIZATION
  // =============================================================================

  constructor(
    private logger: LoggerService
  ) {
    this.log.info('EvaluationCategoryNavigationService initialized');
  }

  // =============================================================================
  // PUBLIC API - CATEGORY SELECTION
  // =============================================================================

  /**
   * Sets the active category
   *
   * @description
   * Updates the active category state. This is a simple state update
   * without orchestration logic. Complex transitions (with data loading)
   * should be handled by EvaluationStateService.
   *
   * @param categoryId - The category ID to set as active
   *
   * @example
   * ```typescript
   * this.categoryNav.setActiveCategory(5);
   * ```
   */
  setActiveCategory(categoryId: number | null): void {
    if (this.activeCategorySubject.value !== categoryId) {
      this.log.info('Setting active category', { categoryId });
      this.activeCategorySubject.next(categoryId);
    }
  }

  /**
   * Initializes the default category from available categories
   *
   * @description
   * Sets the first category as active if no category is currently selected.
   * This is typically called after categories are loaded.
   *
   * @param categories - Available categories
   *
   * @example
   * ```typescript
   * this.categories$.subscribe(categories => {
   *   this.categoryNav.initializeDefaultCategory(categories);
   * });
   * ```
   */
  initializeDefaultCategory(categories: EvaluationCategoryDTO[]): void {
    const currentCategory = this.activeCategorySubject.value;

    if (categories.length > 0 && currentCategory === null) {
      const firstCategory = categories[0];
      this.log.info('Initializing default category', { categoryId: firstCategory.id });
      this.activeCategorySubject.next(firstCategory.id);
    }
  }

  /**
   * Starts a category transition (sets loading state)
   *
   * @description
   * Sets the transition loading state to true. Call this before
   * starting complex transition operations. Remember to call
   * endTransition() when done.
   */
  startTransition(): void {
    this.log.debug('Category transition started');
    this.categoryTransitionLoadingSubject.next(true);
  }

  /**
   * Ends a category transition (clears loading state)
   *
   * @description
   * Sets the transition loading state to false. Call this after
   * completing transition operations (success or error).
   */
  endTransition(): void {
    this.log.debug('Category transition ended');
    this.categoryTransitionLoadingSubject.next(false);
  }

  // =============================================================================
  // PUBLIC API - ACCESSORS
  // =============================================================================

  /**
   * Gets the current active category synchronously
   *
   * @returns Current category ID or null if none selected
   *
   * @example
   * ```typescript
   * const categoryId = this.categoryNav.getCurrentActiveCategory();
   * if (categoryId) {
   *   console.log('Active category:', categoryId);
   * }
   * ```
   */
  getCurrentActiveCategory(): number | null {
    return this.activeCategorySubject.value;
  }

  /**
   * Checks if currently transitioning between categories
   *
   * @returns True if transitioning, false otherwise
   */
  isTransitioning(): boolean {
    return this.categoryTransitionLoadingSubject.value;
  }

  // =============================================================================
  // PUBLIC API - STATE MANAGEMENT
  // =============================================================================

  /**
   * Clears the active category selection
   *
   * @description
   * Resets the active category to null. Useful when navigating away
   * from the evaluation forum.
   */
  clearActiveCategory(): void {
    this.log.info('Clearing active category');
    this.activeCategorySubject.next(null);
  }

  // =============================================================================
  // LIFECYCLE CLEANUP
  // =============================================================================

  /**
   * Cleanup on service destruction
   *
   * @description
   * Completes all active observables to prevent memory leaks.
   * Called automatically by Angular when service is destroyed.
   */
  ngOnDestroy(): void {
    this.log.info('EvaluationCategoryNavigationService destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
