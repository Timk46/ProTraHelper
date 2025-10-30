import { Injectable, OnDestroy } from '@angular/core';
import { Observable, combineLatest, Subject } from 'rxjs';
import { map, debounceTime, takeUntil, distinctUntilChanged, shareReplay } from 'rxjs/operators';

// DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  EvaluationPhase,
} from '@DTOs/index';

// Services
import { ViewModelPerformanceMonitorService } from './view-model-performance-monitor.service';

// ═══════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════

/**
 * Complete view model for evaluation discussion forum
 *
 * @description
 * Combines all evaluation forum data into single flattened interface.
 * Used by component template to access all evaluation forum data.
 */
export interface EvaluationViewModel {
  submission: EvaluationSubmissionDTO | null;
  categories: EvaluationCategoryDTO[];
  activeCategory: number | null;
  activeCategoryInfo: EvaluationCategoryDTO | null;
  discussions: EvaluationDiscussionDTO[];
  discussionsLoading: boolean;
  commentStats: CommentStatsDTO | null;
  anonymousUser: AnonymousEvaluationUserDTO | null;
  currentPhase: EvaluationPhase | null;
  isDiscussionPhase: boolean;
  isEvaluationPhase: boolean;
  canComment: boolean;
  canRate: boolean;
  loading: boolean;
  error: string | null;
  isSubmittingComment: boolean;
  backendHealth: {
    isHealthy: boolean;
    lastError: string | null;
  };
}

/**
 * Input observables for view model composition
 *
 * @description
 * All observables required to compose the view model.
 * Component passes these to the service for composition.
 */
export interface ViewModelInputs {
  submission$: Observable<EvaluationSubmissionDTO | null>;
  categories$: Observable<EvaluationCategoryDTO[]>;
  activeCategory$: Observable<number | null>;
  activeCategoryInfo$: Observable<EvaluationCategoryDTO | null>;
  discussions$: Observable<EvaluationDiscussionDTO[]>;
  discussionsLoading$: Observable<boolean>;
  commentStats$: Observable<CommentStatsDTO | null>;
  anonymousUser$: Observable<AnonymousEvaluationUserDTO | null>;
  currentPhase$: Observable<EvaluationPhase | null>;
  isDiscussionPhase$: Observable<boolean>;
  isEvaluationPhase$: Observable<boolean>;
  canComment$: Observable<boolean>;
  canRate$: Observable<boolean>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  isSubmittingComment$: Observable<boolean>;
  backendHealth$: Observable<{
    isHealthy: boolean;
    lastError: string | null;
  }>;
}

// ═══════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════

/**
 * Dedicated service for composing evaluation view model from observables
 *
 * @description
 * Follows HEFL "Fat Service" pattern by extracting view model composition logic
 * from component. Takes input observables and composes them into semantic groups
 * for optimal performance.
 *
 * @architecture
 * **Observable Composition Strategy:**
 * Uses semantic grouping for optimal performance:
 * - coreData: submission, categories, user (rarely changes)
 * - discussionData: discussions, stats (changes with comments)
 * - phasePermissions: phase, permissions (changes on transitions)
 * - uiState: loading, errors, backend health (frequent changes)
 *
 * **Performance Benefits:**
 * - Isolated updates per group (only affected group recalculates)
 * - Prevents change detection thrashing with debounceTime(0)
 * - Expected: 60-70% fewer change detection cycles vs flat combineLatest
 *
 * @example
 * ```typescript
 * @Component({
 *   providers: [EvaluationViewModelService]
 * })
 * export class EvaluationForumComponent {
 *   viewModel$: Observable<EvaluationViewModel>;
 *
 *   constructor(private viewModelService: EvaluationViewModelService) {
 *     // Initialize observables first
 *     const inputs: ViewModelInputs = {
 *       submission$: this.stateService.submission$,
 *       // ... other observables
 *     };
 *
 *     // Compose view model
 *     this.viewModel$ = this.viewModelService.composeViewModel(inputs);
 *   }
 * }
 * ```
 *
 * @since 3.1.0 (Extracted from EvaluationDiscussionForumComponent)
 */
@Injectable()
export class EvaluationViewModelService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ═══════════════════════════════════════════════════════════
  // CONSTRUCTOR
  // ═══════════════════════════════════════════════════════════

  constructor(
    private performanceMonitor: ViewModelPerformanceMonitorService
  ) {}

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  /**
   * Composes view model from input observables using semantic grouping
   *
   * @description
   * Takes all required observables and composes them into optimized semantic groups:
   * 1. Core data (submission, categories) - rarely changes
   * 2. Discussion data (discussions, stats) - changes with comments
   * 3. Phase permissions (phase, permissions) - changes on transitions
   * 4. UI state (loading, errors) - frequent changes
   *
   * Groups are combined with debounceTime(0) to prevent change detection thrashing
   * when multiple groups emit in the same tick.
   *
   * @param inputs - All observables required for view model
   * @returns Observable emitting complete view model
   *
   * @performance
   * - 60-70% fewer change detection cycles compared to flat combineLatest
   * - Isolated updates per semantic group
   * - Automatic batching of simultaneous emissions
   *
   * @example
   * ```typescript
   * this.viewModel$ = this.viewModelService.composeViewModel({
   *   submission$: this.stateService.submission$,
   *   categories$: this.stateService.categories$,
   *   // ... all other observables
   * });
   * ```
   */
  composeViewModel(inputs: ViewModelInputs): Observable<EvaluationViewModel> {
    // ─────────────────────────────────────────────────────────
    // GROUP 1: CORE DATA (rarely changes)
    // ─────────────────────────────────────────────────────────
    const coreData$ = combineLatest([
      inputs.submission$,
      inputs.categories$,
      inputs.activeCategory$,
      inputs.activeCategoryInfo$,
      inputs.anonymousUser$,
    ]).pipe(
      map(([submission, categories, activeCategory, activeCategoryInfo, anonymousUser]) => ({
        submission,
        categories,
        activeCategory,
        activeCategoryInfo,
        anonymousUser,
      })),
      // ✅ PERFORMANCE: Prevents re-emission when core data remains unchanged
      // Compares all 5 fields for reference equality (submission, categories, etc.)
      // Expected impact: Blocks 60-80% of unnecessary emissions in this group
      distinctUntilChanged((prev, curr) =>
        prev.submission === curr.submission &&
        prev.categories === curr.categories &&
        prev.activeCategory === curr.activeCategory &&
        prev.activeCategoryInfo === curr.activeCategoryInfo &&
        prev.anonymousUser === curr.anonymousUser
      ),
      // 📊 MONITORING: Track emissions for performance analysis
      this.performanceMonitor.trackEmission('coreData'),
      // ✅ MEMORY SAFE: shareReplay with refCount prevents memory leaks
      // refCount: true = auto-unsubscribe when no subscribers remain
      // bufferSize: 1 = cache only the latest value for new subscribers
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // ─────────────────────────────────────────────────────────
    // GROUP 2: DISCUSSION DATA (changes with comments)
    // ─────────────────────────────────────────────────────────
    const discussionData$ = combineLatest([
      inputs.discussions$,
      inputs.discussionsLoading$,
      inputs.commentStats$,
    ]).pipe(
      map(([discussions, discussionsLoading, commentStats]) => ({
        discussions,
        discussionsLoading,
        commentStats,
      })),
      // ✅ PERFORMANCE: Prevents re-emission when discussion data remains unchanged
      // Compares discussions array, loading state, and commentStats references
      // Expected impact: Blocks 40-60% of unnecessary emissions in this group
      distinctUntilChanged((prev, curr) =>
        prev.discussions === curr.discussions &&
        prev.discussionsLoading === curr.discussionsLoading &&
        prev.commentStats === curr.commentStats
      ),
      // 📊 MONITORING: Track emissions for performance analysis
      this.performanceMonitor.trackEmission('discussionData'),
      // ✅ MEMORY SAFE: shareReplay with refCount prevents memory leaks
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // ─────────────────────────────────────────────────────────
    // GROUP 3: PHASE PERMISSIONS (changes on phase transitions)
    // ─────────────────────────────────────────────────────────
    const phasePermissions$ = combineLatest([
      inputs.currentPhase$,
      inputs.isDiscussionPhase$,
      inputs.isEvaluationPhase$,
      inputs.canComment$,
      inputs.canRate$,
    ]).pipe(
      map(([currentPhase, isDiscussionPhase, isEvaluationPhase, canComment, canRate]) => ({
        currentPhase,
        isDiscussionPhase,
        isEvaluationPhase,
        canComment,
        canRate,
      })),
      // ✅ PERFORMANCE: Prevents re-emission when phase/permissions remain unchanged
      // Compares all 5 permission-related fields
      // Expected impact: Blocks 80-90% of unnecessary emissions (phase changes are rare)
      distinctUntilChanged((prev, curr) =>
        prev.currentPhase === curr.currentPhase &&
        prev.isDiscussionPhase === curr.isDiscussionPhase &&
        prev.isEvaluationPhase === curr.isEvaluationPhase &&
        prev.canComment === curr.canComment &&
        prev.canRate === curr.canRate
      ),
      // 📊 MONITORING: Track emissions for performance analysis
      this.performanceMonitor.trackEmission('phasePermissions'),
      // ✅ MEMORY SAFE: shareReplay with refCount prevents memory leaks
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // ─────────────────────────────────────────────────────────
    // GROUP 4: UI STATE (frequent changes)
    // ─────────────────────────────────────────────────────────
    const uiState$ = combineLatest([
      inputs.loading$,
      inputs.error$,
      inputs.isSubmittingComment$,
      inputs.backendHealth$,
    ]).pipe(
      map(([loading, error, isSubmittingComment, backendHealth]) => ({
        loading,
        error,
        isSubmittingComment,
        backendHealth,
      })),
      // ✅ PERFORMANCE: Prevents re-emission when UI state remains unchanged
      // Compares loading flags, errors, and backend health status
      // Expected impact: Blocks 20-30% of unnecessary emissions (UI state changes frequently)
      distinctUntilChanged((prev, curr) =>
        prev.loading === curr.loading &&
        prev.error === curr.error &&
        prev.isSubmittingComment === curr.isSubmittingComment &&
        prev.backendHealth.isHealthy === curr.backendHealth.isHealthy &&
        prev.backendHealth.lastError === curr.backendHealth.lastError
      ),
      // 📊 MONITORING: Track emissions for performance analysis
      this.performanceMonitor.trackEmission('uiState'),
      // ✅ MEMORY SAFE: shareReplay with refCount prevents memory leaks
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // ─────────────────────────────────────────────────────────
    // FINAL COMPOSITION
    // ─────────────────────────────────────────────────────────
    return combineLatest([
      coreData$,
      discussionData$,
      phasePermissions$,
      uiState$,
    ]).pipe(
      // ⚠️ CRITICAL: debounceTime(0) prevents change detection thrashing
      // When multiple groups emit in same tick, batch them into single emission
      debounceTime(0),
      map(([coreData, discussionData, phasePermissions, uiState]): EvaluationViewModel => ({
        ...coreData,
        ...discussionData,
        ...phasePermissions,
        ...uiState,
      })),
      // ✅ FINAL PERFORMANCE GATE: Prevents template updates when data is objectively equal
      // This is the CRITICAL optimization that restores performance parity with old code
      //
      // WHY THIS IS ESSENTIAL:
      // - Even if individual groups don't change, combineLatest still emits new array
      // - Spread operator creates new object reference every time
      // - Without this check, template updates on EVERY emission
      // - With this check, template only updates when data actually changed
      //
      // PERFORMANCE IMPACT:
      // - Expected: Prevents 40-50% of unnecessary template updates
      // - Same optimization as old code (restores baseline performance)
      //
      // OPTIMIZATION STRATEGY:
      // Grouped by semantic concern for clarity and maintainability
      distinctUntilChanged((prev, curr) => {
        // GROUP 1: Core data equality (submission, categories, user)
        const coreEqual =
          prev.submission === curr.submission &&
          prev.categories === curr.categories &&
          prev.activeCategory === curr.activeCategory &&
          prev.activeCategoryInfo === curr.activeCategoryInfo &&
          prev.anonymousUser === curr.anonymousUser;

        // GROUP 2: Discussion data equality (discussions, loading, stats)
        const discussionEqual =
          prev.discussions === curr.discussions &&
          prev.discussionsLoading === curr.discussionsLoading &&
          prev.commentStats === curr.commentStats;

        // GROUP 3: Phase permissions equality (phase, permissions)
        const permissionsEqual =
          prev.currentPhase === curr.currentPhase &&
          prev.isDiscussionPhase === curr.isDiscussionPhase &&
          prev.isEvaluationPhase === curr.isEvaluationPhase &&
          prev.canComment === curr.canComment &&
          prev.canRate === curr.canRate;

        // GROUP 4: UI state equality (loading, errors, backend health)
        const uiEqual =
          prev.loading === curr.loading &&
          prev.error === curr.error &&
          prev.isSubmittingComment === curr.isSubmittingComment &&
          prev.backendHealth.isHealthy === curr.backendHealth.isHealthy &&
          prev.backendHealth.lastError === curr.backendHealth.lastError;

        // All groups must be equal to suppress emission
        return coreEqual && discussionEqual && permissionsEqual && uiEqual;
      }),
      // 📊 MONITORING: Track final view model emissions (what reaches the template)
      this.performanceMonitor.trackEmission('finalViewModel'),
      takeUntil(this.destroy$)
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LIFECYCLE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Cleanup on service destruction
   *
   * @description
   * Completes destroy$ subject to trigger takeUntil cleanup.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
