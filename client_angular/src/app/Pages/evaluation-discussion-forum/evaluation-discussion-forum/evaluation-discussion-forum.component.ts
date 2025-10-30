import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Observable, Subject, combineLatest, BehaviorSubject, of, timer } from 'rxjs';
import { takeUntil, map, filter, switchMap, take, startWith, debounceTime, distinctUntilChanged, shareReplay, finalize, tap, catchError } from 'rxjs/operators';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  EvaluationPhase,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  RatingStatsDTO,
  EvaluationRatingDTO,
} from '@DTOs/index';

// Services
import { EvaluationStateService } from '../../../Services/evaluation/evaluation-state.service';
import { EvaluationVoteLimitService } from '../../../Services/evaluation/evaluation-vote-limit.service';
import { VoteSessionService } from '../../../Services/evaluation/vote-session.service';
import { EvaluationGlobalStateService } from '../services/evaluation-global-state.service';
import {
  EvaluationNavigationService,
  NavigationContext
} from '../services/evaluation-navigation.service';
import { EvaluationPerformanceService } from '../services/evaluation-performance.service';
import { BundleAnalyzerService } from '../services/bundle-analyzer.service';
import { MemoryLeakDetectorService } from '../services/memory-leak-detector.service';
import { LoggerService } from '../../../Services/logger/logger.service';
import { EvaluationViewModelService, EvaluationViewModel, ViewModelInputs } from '../services/evaluation-view-model.service';
import { ViewModelPerformanceMonitorService } from '../services/view-model-performance-monitor.service';

// Child Components
import { CategoryTabsComponent } from '../components/category-tabs/category-tabs.component';
import { PdfViewerPanelComponent } from '../components/pdf-viewer-panel/pdf-viewer-panel.component';
import { PerformanceDashboardComponent } from '../components/performance-dashboard/performance-dashboard.component';
import { DiscussionThreadComponent } from '../components/discussion-thread/discussion-thread.component';
import { ErrorFallbackComponent } from '../components/error-fallback/error-fallback.component';
import { RatingSliderComponent } from '../components/rating-slider/rating-slider.component';
import { RatingGateComponent } from '../components/rating-gate/rating-gate.component';
import { VotingMechanismDialogComponent } from '../components/voting-mechanism-dialog/voting-mechanism-dialog.component';
import { UserService } from 'src/app/Services/auth/user.service';
import { PdfSimpleViewerPanelComponent } from '../components/pdf-simple-viewer-panel/pdf-simple-viewer-panel.component';
import { PdfExportService } from '../../../Services/pdf/pdf-export.service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Event data for rating deletion
 */
interface RatingDeletionEvent {
  categoryId: number;
}

/**
 * Event data for discussion access granted
 */
interface DiscussionAccessEvent {
  categoryId: number;
}

/**
 * Configuration for message display
 */
interface MessageConfig {
  title: string;
  action: string;
  duration: number;
}

/**
 * Message type configurations for unified message display
 */
const MESSAGE_CONFIGS: Record<'error' | 'success' | 'warning' | 'info', MessageConfig> = {
  error: { title: 'Fehler', action: 'Schließen', duration: 5000 },
  success: { title: 'Erfolg', action: 'OK', duration: 3000 },
  warning: { title: 'Warnung', action: 'OK', duration: 4000 },
  info: { title: 'Information', action: 'OK', duration: 3000 }
};

@Component({
  selector: 'app-evaluation-discussion-forum',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatDividerModule,
    MatTooltipModule,
    MatExpansionModule,
    CategoryTabsComponent,
    PdfViewerPanelComponent,
    PdfSimpleViewerPanelComponent,
    DiscussionThreadComponent,
    RatingSliderComponent,
    RatingGateComponent,
    ErrorFallbackComponent,
    PerformanceDashboardComponent,
  ],
  providers: [
    EvaluationViewModelService,
    ViewModelPerformanceMonitorService // Performance monitoring
  ], // Component-scoped services
  templateUrl: './evaluation-discussion-forum.component.html',
  styleUrl: './evaluation-discussion-forum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationDiscussionForumComponent implements OnInit, OnDestroy {
  // Scoped logger for this component
  private readonly log = this.logger.scope('EvaluationForum');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private stateService: EvaluationStateService,
    private voteLimitService: EvaluationVoteLimitService,
    private voteSessionService: VoteSessionService,
    private userservice: UserService,
    private globalStateService: EvaluationGlobalStateService,
    private navigationService: EvaluationNavigationService,
    private performanceService: EvaluationPerformanceService,
    private bundleAnalyzer: BundleAnalyzerService,
    private memoryLeakDetector: MemoryLeakDetectorService,
    private logger: LoggerService,
    private pdfExportService: PdfExportService,
    private viewModelService: EvaluationViewModelService,
    private performanceMonitor: ViewModelPerformanceMonitorService
  ) {
  }
  // =============================================================================
  // TEMPLATE UTILITIES
  // =============================================================================

  protected readonly EvaluationPhase = EvaluationPhase;

  // =============================================================================
  // COMPONENT REFERENCES
  // =============================================================================

  @ViewChild(RatingSliderComponent) ratingSlider!: RatingSliderComponent;

  // =============================================================================
  // COMPONENT STATE - ENHANCED WITH GLOBAL STATE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // 🔧 RACE CONDITION FIX: Centralized category selection with switchMap
  private categorySelection$ = new Subject<number>();

  // 🔧 LOADING STATE: Block UI during category transitions
  public isCategoryTransitionLoading = false;

  // 🚀 PHASE 5: Integration observables for comprehensive state management
  public applicationState$ = this.globalStateService.applicationState$;

  // 🚀 PHASE 6: Performance monitoring state
  public showPerformanceDashboard = false; // Can be toggled for development/debugging
  public navigationContext$ = this.navigationService.navigationContext$;
  public systemStatus$ = this.globalStateService.systemStatus$;
  public userContext$ = this.globalStateService.userContext$;

  // Enhanced error handling with global state integration
  public hasGlobalError$ = this.globalStateService.systemStatus$.pipe(
    map(status => status.errorCount > 0)
  );

  // Combined loading state from multiple sources
  public isGlobalLoading$ = combineLatest([
    this.stateService.loading$,
    this.globalStateService.uiState$
  ]).pipe(
    map(([serviceLoading, uiState]) => serviceLoading || uiState.isLoading)
  );

  // Enhanced permission system
  public userPermissions$ = this.userContext$.pipe(
    map(context => context.permissions)
  );

  // Deep linking support
  public currentSubmissionId$ = this.navigationService.submissionId$;
  public currentCategoryId$ = this.navigationService.categoryId$;
  public highlightedCommentId$ = this.navigationService.commentId$;


  // =============================================================================
  // COMPONENT STATE - REACTIVE STREAMS
  // =============================================================================

  // Core data streams
  submission$!: Observable<EvaluationSubmissionDTO | null>;
  categories$!: Observable<EvaluationCategoryDTO[]>;
  activeCategory$!: Observable<number | null>;
  activeCategoryInfo$!: Observable<EvaluationCategoryDTO | null>;
  discussions$!: Observable<EvaluationDiscussionDTO[]>;
  commentStats$!: Observable<CommentStatsDTO | null>;
  anonymousUser$!: Observable<AnonymousEvaluationUserDTO | null>;
  currentPhase$!: Observable<EvaluationPhase | null>;

  // UI state streams
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  // Derived state streams
  isDiscussionPhase$!: Observable<boolean>;
  isEvaluationPhase$!: Observable<boolean>;
  hasRatedCurrentCategory$!: Observable<boolean>;
  hasCommentedCurrentCategory$!: Observable<boolean>;
  canComment$!: Observable<boolean>;
  canRate$!: Observable<boolean>;

  // 🚀 OPTIMIZED: View model managed by dedicated service (EvaluationViewModelService)
  // Uses semantic grouping for optimal performance (60-70% fewer change detection cycles)
  // Initialized in initializeObservableStreams() after all input observables are ready
  viewModel$!: Observable<EvaluationViewModel>;

  // 🛠️ NEW: Separate observable for vote-related data
  voteStatus$!: Observable<{
    canVote: boolean;
    availableVotes: number;
    totalVotes: number;
    isLoading: boolean;
  }>;

  // =============================================================================
  // COMPONENT LIFECYCLE
  // =============================================================================

  // Legacy state - keeping for compatibility during migration
  private submissionId: string | null = null;
  currentCategoryIndex = 0;
  private isSubmittingComment$ = new BehaviorSubject<boolean>(false);
  isVotingComment: Map<string, boolean> = new Map();
  private commentSubmissionQueue$ = new Subject<string>();
  private lastSubmittedContent: string | null = null;
  currentMessageText: string = '';
  private currentSnackBarRef: MatSnackBarRef<any> | null = null;

  // Rating gate access control - replaced with reactive state from stateService

  // Rating panel visibility control
  showRatingPanel: boolean = false;

  // Rating panel expansion control
  isRatingPanelExpanded: boolean = false;
  
  // Discussion header panel expansion control
  isDiscussionHeaderExpanded: boolean = false;

  // Temporary flag to immediately hide rating input after submission
  ratingJustSubmitted: boolean = false;

  // 🔧 MEMORY SAFE: Enhanced initialization with comprehensive setup and proper cleanup
  private initializeObservableStreams(): void {
    // Core state streams from service with proper cleanup to prevent memory leaks
    this.submission$ = this.stateService.submission$.pipe(
      takeUntil(this.destroy$)
    );
    this.categories$ = this.stateService.categories$.pipe(
      takeUntil(this.destroy$)
    );
    this.activeCategory$ = this.stateService.activeCategory$.pipe(
      takeUntil(this.destroy$)
    );
    this.activeCategoryInfo$ = this.stateService.activeCategoryInfo$.pipe(
      takeUntil(this.destroy$)
    );
    this.discussions$ = this.stateService.activeDiscussions$.pipe(
      takeUntil(this.destroy$)
    );
    this.commentStats$ = this.stateService.commentStats$.pipe(
      takeUntil(this.destroy$)
    );
    this.anonymousUser$ = this.stateService.anonymousUser$.pipe(
      takeUntil(this.destroy$)
    );
    this.currentPhase$ = this.stateService.currentPhase$.pipe(
      takeUntil(this.destroy$)
    );
    // ⚡ PERFORMANCE: startWith() for UI-critical observables only
    // These ensure the template renders immediately with loading spinner
    this.loading$ = this.stateService.loading$.pipe(
      startWith(true), // ✅ Critical: Shows loading spinner immediately
      takeUntil(this.destroy$)
    );
    this.error$ = this.stateService.error$.pipe(
      startWith(null), // ✅ Critical: No error message initially
      takeUntil(this.destroy$)
    );

    // 🔧 MEMORY SAFE: Derived streams with proper cleanup
    this.isDiscussionPhase$ = this.currentPhase$.pipe(
      map(phase => phase === EvaluationPhase.DISCUSSION),
      takeUntil(this.destroy$)
    );

    this.isEvaluationPhase$ = this.currentPhase$.pipe(
      map(phase => phase === EvaluationPhase.EVALUATION),
      takeUntil(this.destroy$)
    );

    // Rating status stream for current category - replaces hasRatedCurrentCategory
    this.hasRatedCurrentCategory$ = this.activeCategory$.pipe(
      switchMap(categoryId =>
        categoryId ? this.stateService.isCategoryRated$(categoryId) : of(false)
      ),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

    // Comment status stream for current category - NEW: tracks if user has commented
    this.hasCommentedCurrentCategory$ = this.activeCategory$.pipe(
      switchMap(categoryId =>
        categoryId ? this.stateService.hasCommentedInCategory$(categoryId) : of(false)
      ),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );

    this.canComment$ = this.isDiscussionPhase$.pipe(
      takeUntil(this.destroy$)
    );
    this.canRate$ = this.isEvaluationPhase$.pipe(
      takeUntil(this.destroy$)
    );

    // 🚀 REFACTORED: viewModel$ now managed by EvaluationViewModelService
    //
    // BEFORE: Complex combineLatest with 16 individual observables defined here
    //   - 93 lines of observable composition code in component
    //   - Business logic mixed with component concerns
    //   - Difficult to test in isolation
    //
    // AFTER: Delegated to dedicated service (HEFL "Fat Service" pattern)
    //   - Service handles all observable composition with semantic grouping
    //   - Component passes observables to service for composition
    //   - 60-70% fewer change detection cycles through isolated group updates
    //   - Reusable across components, testable in isolation

    // Backend health stream for rating status monitoring
    const backendHealth$ = this.stateService.backendHealth$.pipe(
      startWith({ isHealthy: true, lastError: null }),
      takeUntil(this.destroy$)
    );

    // Compose view model using service
    const inputs: ViewModelInputs = {
      submission$: this.submission$,
      categories$: this.categories$,
      activeCategory$: this.activeCategory$,
      activeCategoryInfo$: this.activeCategoryInfo$,
      discussions$: this.discussions$,
      commentStats$: this.commentStats$,
      anonymousUser$: this.anonymousUser$,
      currentPhase$: this.currentPhase$,
      isDiscussionPhase$: this.isDiscussionPhase$,
      isEvaluationPhase$: this.isEvaluationPhase$,
      canComment$: this.canComment$,
      canRate$: this.canRate$,
      loading$: this.loading$,
      error$: this.error$,
      isSubmittingComment$: this.isSubmittingComment$,
      backendHealth$: backendHealth$,
    };

    this.viewModel$ = this.viewModelService.composeViewModel(inputs);

    // 🔧 MEMORY SAFE: Separate observable for vote-related data only with proper cleanup
    this.voteStatus$ = combineLatest([
      this.activeCategory$,
      this.isDiscussionPhase$,
      this.voteLimitService.voteLimitStatus$,
      this.stateService.activeDiscussions$, // Include discussions to calculate vote limits
      this.voteLimitService.voteLimitLoading$ // Include loading state to prevent flicker
    ]).pipe(
      map(([activeCategory, isDiscussionPhase, voteLimitStatusMap, discussions, isLoading]) => {
        // Get dynamic vote limit status for current category (handle null category)
        const voteLimitStatus = activeCategory !== null ? voteLimitStatusMap.get(activeCategory) : undefined;

        // 🎯 CALCULATE: Vote limit based on HEFL rules (fixed 10 votes per user)
        const maxVotes = this.voteLimitService.calculateVoteLimits(discussions);

        // FIX: Show loading ONLY when:
        // 1. Global loading flag is true AND
        // 2. No cached data exists for current category
        const isDataLoading = isLoading && voteLimitStatus === undefined;

        return {
          canVote: isDiscussionPhase && (voteLimitStatus?.canVote ?? true),
          availableVotes: voteLimitStatus?.remainingVotes ?? maxVotes,
          totalVotes: maxVotes, // Always based on comment count
          isLoading: isDataLoading, // FIXED: Only true when actually loading without cache
        };
      }),
      distinctUntilChanged((prev, curr) =>
        prev.canVote === curr.canVote &&
        prev.availableVotes === curr.availableVotes &&
        prev.totalVotes === curr.totalVotes &&
        prev.isLoading === curr.isLoading
      ),
      shareReplay(1),
      takeUntil(this.destroy$) // 🔧 MEMORY SAFE: Prevent memory leak
    );
  }

  ngOnInit(): void {
    // 🚀 PHASE 5: Enhanced initialization with global state management
    this.initializeGlobalStateManagement();
    this.handleRouteParams();
    this.handleErrorNotifications();
    this.loadInitialData();
    this.setupEventHandling();
    this.setupDeepLinkingSupport();

    // ⚡ PERFORMANCE: Defer monitoring setup to browser idle time
    this.schedulePerformanceMonitoring();

    // Initialize session votes from backend data after voteLimitStatus loads
    this.initializeSessionVotesFromBackend();

    // Eager load vote limits for active category to prevent flicker
    this.eagerLoadVoteLimitsForActiveCategory();

    // 📊 DEVELOPMENT: Expose performance monitor to browser console
    if (!environment.production) {
      (window as any).viewModelMonitor = {
        getMetrics: () => this.performanceMonitor.getMetrics(),
        printMetrics: () => this.performanceMonitor.printMetrics(),
        reset: () => this.performanceMonitor.reset()
      };

      console.log('═══════════════════════════════════════════════');
      console.log('📊 VIEW MODEL PERFORMANCE MONITOR AVAILABLE');
      console.log('═══════════════════════════════════════════════');
      console.log('Use these commands in browser console:');
      console.log('  window.viewModelMonitor.getMetrics()   - Get current metrics');
      console.log('  window.viewModelMonitor.printMetrics() - Print formatted report');
      console.log('  window.viewModelMonitor.reset()        - Reset all counters');
      console.log('═══════════════════════════════════════════════');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // 🚀 PHASE 5: Enhanced cleanup with global state management
    this.cleanup();
  }

  /**
   * Initialize session votes from backend vote limit status
   * This ensures the vote counter shows correct values after page refresh
   */
  private initializeSessionVotesFromBackend(): void {
    combineLatest([
      this.voteLimitService.voteLimitStatus$,
      this.activeCategory$
    ]).pipe(
      take(1),
      filter(([statusMap, activeCategory]) => statusMap.size > 0 && activeCategory !== null)
    ).subscribe(([statusMap, activeCategory]) => {
      if (activeCategory !== null) {
        const status = statusMap.get(activeCategory);
        if (status) {
          const votedCount = status.maxVotes - status.remainingVotes;
          this.voteSessionService.initializeFromBackend(votedCount);
        }
      }
    });
  }

  /**
   * Eager load vote limits for active category + next 2 categories on init
   * FIXED: Use switchMap to ensure vote limits are loaded BEFORE template evaluation
   * This prevents visual flicker and race conditions
   */
  private eagerLoadVoteLimitsForActiveCategory(): void {
    combineLatest([
      this.activeCategory$,
      this.categories$,
      this.submission$
    ]).pipe(
      take(1),
      filter(([activeCategory, categories, submission]) =>
        activeCategory !== null && categories.length > 0 && submission !== null
      ),
      switchMap(([activeCategory, categories, submission]) => {
        // Find index of active category
        const activeCategoryIndex = categories.findIndex(cat => cat.id === activeCategory);

        if (activeCategoryIndex === -1) {
          return of(void 0);
        }

        // Preload active category + next 2 categories
        const categoriesToPreload = [
          categories[activeCategoryIndex],
          categories[activeCategoryIndex + 1],
          categories[activeCategoryIndex + 2]
        ].filter(cat => cat !== undefined).map(cat => cat.id);

        console.log(`⚡ Eager loading vote limits for categories: ${categoriesToPreload.join(', ')}`);

        // Use service's preload method for optimized parallel loading
        return this.voteLimitService.preloadVoteLimitStatus(String(submission!.id), categoriesToPreload);
      })
    ).subscribe({
      next: () => {
        console.log('✅ Vote limits eager-loaded successfully');
        this.cdr.markForCheck(); // Force change detection to update template
      },
      error: (error) => {
        console.error('❌ Failed to eager-load vote limits:', error);
      }
    });
  }

  private cleanup(): void {
    // 🚀 PHASE 6: Enhanced cleanup with performance monitoring

    // Stop performance monitoring
    this.performanceService.stopComponentProfiling('evaluation-discussion-forum');

    // Unregister from memory leak detection
    this.memoryLeakDetector.unregisterComponent('evaluation-discussion-forum');

    // Close any open notifications
    if (this.currentSnackBarRef) {
      this.currentSnackBarRef.dismiss();
    }

    // Clear any pending actions in global state
    this.globalStateService.setGlobalLoading(false);

    // Update last activity
    this.globalStateService.updateLastActivity();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // 🚀 PHASE 5: Initialize global state management integration
  private initializeGlobalStateManagement(): void {
    // Initialize observables
    this.initializeObservableStreams();

    // Set up user permissions based on current evaluation state
    this.setupUserPermissions();

    // Initialize performance tracking
    this.setupPerformanceTracking();

    // Setup connectivity monitoring
    this.setupConnectivityMonitoring();
  }

  private setupUserPermissions(): void {
    // Update global permissions based on evaluation state
    combineLatest([
      this.currentPhase$,
      this.anonymousUser$,
      this.submission$
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([phase, user, submission]) => !!phase && !!user && !!submission)
    ).subscribe(([phase, user, submission]) => {
      const permissions = {
        canComment: phase === EvaluationPhase.DISCUSSION,
        canVote: phase === EvaluationPhase.DISCUSSION,
        canModerate: false, // Could be based on user role
        canSwitchPhase: false, // Could be based on user role
        canExport: true
      };

      this.globalStateService.updateUserPermissions(permissions);
    });
  }

  private setupPerformanceTracking(): void {
    // Track component initialization time
    const startTime = performance.now();

    // Track when all critical data is loaded
    this.viewModel$.pipe(
      filter(vm => !!vm.submission && !!vm.anonymousUser),
      take(1)
    ).subscribe(() => {
      const loadTime = performance.now() - startTime;
      this.globalStateService.updatePerformanceMetrics(loadTime, true);
    });
  }

  private setupConnectivityMonitoring(): void {
    // Monitor network status and update global state
    this.systemStatus$.pipe(
      takeUntil(this.destroy$),
      map(status => status.isOnline),
      distinctUntilChanged()
    ).subscribe(isOnline => {
      if (!isOnline) {
        this.showErrorMessage('Verbindung unterbrochen. Arbeite im Offline-Modus.');
      }
    });
  }

  // 🚀 PHASE 5: Enhanced deep linking support
  private setupDeepLinkingSupport(): void {
    // Handle highlighted comment from URL
    this.highlightedCommentId$.pipe(
      takeUntil(this.destroy$),
      filter(commentId => !!commentId),
      debounceTime(500) // Wait for UI to stabilize
    ).subscribe(commentId => {
      this.scrollToComment(commentId!);
    });

    // Handle category selection from URL
    this.currentCategoryId$.pipe(
      takeUntil(this.destroy$),
      filter(categoryId => !!categoryId),
      switchMap(categoryId => this.stateService.transitionToCategory(categoryId!))
    ).subscribe();

    // Update page metadata based on navigation context
    this.navigationContext$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(context => {
      this.updatePageMetadata(context);
    });
  }

  /**
   * ⚡ PERFORMANCE: Schedule monitoring setup for browser idle time
   * This prevents blocking the critical rendering path during component initialization
   */
  private schedulePerformanceMonitoring(): void {
    if (!environment.enableProfiling) return;

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.setupPerformanceMonitoring(), { timeout: 2000 });
    } else {
      setTimeout(() => this.setupPerformanceMonitoring(), 1000);
    }
  }

  /**
   * Initializes comprehensive performance monitoring
   *
   * @description Sets up monitoring for render performance, memory usage, and bundle analysis.
   * Uses the high-level monitorComponent() API for streamlined setup.
   */
  private setupPerformanceMonitoring(): void {
    // Register component for memory leak detection
    this.memoryLeakDetector.registerComponent(
      'evaluation-discussion-forum',
      this,
      {
        trackSubscriptions: true,
        trackMemory: true,
        warningThreshold: 100 * 1024 * 1024 // 100MB threshold
      }
    );

    // Use high-level monitoring API for streamlined setup
    this.performanceService.monitorComponent('evaluation-discussion-forum', {
      componentRef: this,
      viewModel$: this.viewModel$,
      destroy$: this.destroy$,
      options: {
        trackMemory: true,
        trackChangeDetection: true,
        trackRenderTime: true,
        memoryThreshold: 100 * 1024 * 1024, // 100MB
        renderTimeThreshold: 100 // ms
      }
    });

    // Monitor memory leaks with user notifications
    this.memoryLeakDetector.leakDetectionReport$.pipe(
      takeUntil(this.destroy$),
      filter(report => report.detectedLeaks.length > 0)
    ).subscribe(report => {
      const criticalLeaks = report.detectedLeaks.filter(leak =>
        leak.severity === 'critical' && leak.componentName === 'evaluation-discussion-forum'
      );

      if (criticalLeaks.length > 0) {
        this.log.error('Critical memory leaks detected', { leakCount: criticalLeaks.length });
        this.snackBar.open(
          'Leistungsproblem erkannt - Seite wird optimiert',
          'OK',
          { duration: 5000, panelClass: ['warning-snackbar'] }
        );
      }
    });

    // Bundle analysis (non-production only)
    if (!environment.production) {
      setTimeout(() => this.bundleAnalyzer.analyzeBundleStructure(), 10000);
    }
  }

  // =============================================================================
  // 🚀 PHASE 6: PERFORMANCE MONITORING CONTROLS
  // =============================================================================

  /**
   * Toggles the performance dashboard visibility
   *
   * @description Shows or hides the performance monitoring dashboard.
   * When opened, triggers bundle analysis and memory leak detection.
   * Only available in development mode.
   */
  togglePerformanceDashboard(): void {
    this.showPerformanceDashboard = !this.showPerformanceDashboard;

    if (this.showPerformanceDashboard) {
      // Force a performance scan when dashboard is opened
      this.performanceService.analyzeBundlePerformance();
      this.bundleAnalyzer.analyzeBundleStructure();
      this.memoryLeakDetector.forceScan();
    }

    this.cdr.markForCheck();
  }

  /**
   * Checks if performance dashboard should be available
   *
   * @description Determines dashboard availability based on environment.
   * Available in development mode (localhost or dev domains) or non-production builds.
   *
   * @returns true if dashboard should be shown, false otherwise
   */
  isPerformanceDashboardAvailable(): boolean {
    return !environment.production || this.isDevelopmentMode();
  }

  /**
   * Determines if we're in development mode
   */
  private isDevelopmentMode(): boolean {
    return (
      (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
      (typeof window !== 'undefined' && window.location.hostname.includes('dev'))
    );
  }

  private updatePageMetadata(context: NavigationContext): void {
    if (context.submissionId) {
      this.navigationService.updateMetaTags({
        title: `Evaluation Discussion - ${context.submissionId}`,
        description: 'Peer evaluation and discussion forum for submission review',
        ogTitle: 'HEFL Evaluation Forum',
        ogDescription: 'Participate in peer evaluation discussions',
        ogUrl: this.navigationService.generateShareableUrl()
      });
    } else {
      this.navigationService.updateMetaTags({
        title: 'Evaluation Discussion Forum',
        description: 'Browse and participate in evaluation discussions',
        ogTitle: 'HEFL Evaluation Forum',
        ogDescription: 'Collaborative peer evaluation platform'
      });
    }
  }

  private scrollToComment(commentId: string): void {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const element = document.getElementById(`comment-${commentId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Add highlight effect
        element.classList.add('highlighted');
        setTimeout(() => {
          element.classList.remove('highlighted');
        }, 3000);
      } else {
        console.warn('⚠️ Comment element not found:', commentId);
      }
    });
  }

  private handleRouteParams(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        map(params => params.get('submissionId')),
      )
      .subscribe(submissionId => {
        if (submissionId) {
          this.submissionId = submissionId;

          // Load submission from backend
          this.stateService.loadSubmission(submissionId, Number(this.userservice.getTokenID()));
        } else {
          // No submission ID provided - show empty state
          console.warn('⚠️ No submission ID provided');
          this.submissionId = null;
        }
      });
  }

  private handleErrorNotifications(): void {
    this.error$
      .pipe(
        takeUntil(this.destroy$),
        filter(error => error !== null),
      )
      .subscribe(error => {
        if (error) {
          this.snackBar.open(error, 'Schließen', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        }
      });
  }

  private loadInitialData(): void {
    // Categories will be loaded automatically when submission is loaded with sessionId
    // No need to load categories here without sessionId - this was causing the popup error
  }

  private setupEventHandling(): void {
    // Setup debounced comment submission handling
    this.commentSubmissionQueue$
      .pipe(
        debounceTime(300), // 300ms debouncing
        filter(content => {
          // Duplicate submission protection
          if (content === this.lastSubmittedContent) {
            return false;
          }
          return !this.isSubmittingComment$.value; // Don't submit if already submitting
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(content => {
        this.processCommentSubmission(content);
      });

    // Rating status is now handled automatically by hasRatedCurrentCategory$ observable
    // Vote limits are eagerly loaded on init and loaded as part of category transitions

    // 🔧 RACE CONDITION FIX: Centralized category selection with request cancellation
    // This prevents multiple concurrent requests when user rapidly switches categories
    this.categorySelection$
      .pipe(
        // ✅ DEBOUNCING: Ignore rapid successive clicks (wait 150ms for user to finish clicking)
        debounceTime(150),

        // ✅ THROTTLING: Maximum 1 request per 200ms (prevent request flooding)
        // Note: RxJS throttleTime not imported by default - using debounceTime for simplicity

        // ✅ SWITCHMAP: Cancel old requests when new category is selected
        // This is the KEY fix - ensures only the latest request completes
        switchMap(categoryId => {
          // Set loading state to block UI
          this.isCategoryTransitionLoading = true;

          // Reset UI state before transition
          this.ratingJustSubmitted = false;
          this.showRatingPanel = false;

          // Perform atomic category transition
          return this.stateService.transitionToCategory(categoryId).pipe(
            catchError(error => {
              console.error('❌ Category transition failed:', error);
              this.showSnackBar('Kategoriewechsel fehlgeschlagen', 'OK', 3000, true);
              return of(void 0); // Continue with empty value on error
            }),
            // Always clean up loading state
            finalize(() => {
              this.isCategoryTransitionLoading = false;
              this.cdr.markForCheck(); // Trigger change detection
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          // Transition completed successfully
          // Update panel expansion state based on rating/comment status
          this.activeCategory$.pipe(
            take(1),
            filter((categoryId): categoryId is number => categoryId !== null)
          ).subscribe(categoryId => {
            this.updatePanelExpansionState(categoryId);
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          // This should never happen due to catchError above, but handle it anyway
          this.isCategoryTransitionLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Updates panel expansion state after category transition
   * @param categoryId - The category ID to update panels for
   */
  private updatePanelExpansionState(categoryId: number): void {
    // Set rating panel expansion based on rating status
    this.stateService.isCategoryRated$(categoryId).pipe(take(1)).subscribe(isRated => {
      this.isRatingPanelExpanded = !isRated; // Expand if not rated
    });

    // Set discussion panel expansion based on comment status
    this.stateService.hasCommentedInCategory$(categoryId).pipe(take(1)).subscribe(hasCommented => {
      this.isDiscussionHeaderExpanded = false; // Always collapsed by default
    });
  }

  // =============================================================================
  // EVENT HANDLERS - USER INTERACTIONS
  // =============================================================================

  /**
   * Handles category selection events using centralized Subject pattern
   * @param categoryId - The ID of the selected category
   *
   * 🔧 RACE CONDITION FIX: This method now only emits the category ID
   * to the categorySelection$ Subject. The actual transition logic is handled
   * in setupEventHandling() with switchMap to prevent concurrent requests.
   */
  onCategorySelected(categoryId: number): void {
    // Emit category selection to centralized stream
    // The switchMap in setupEventHandling() will handle:
    // - Debouncing rapid clicks
    // - Cancelling old requests
    // - Loading state management
    // - Error handling
    this.categorySelection$.next(categoryId);
  }

  // Method removed - rating status is now handled reactively through stateService

  /**
   * Handles initial comment submission from rating-gate component
   *
   * @description Called when a user submits their first comment after rating a category.
   * This unlocks the discussion section for that category. Processes immediately without debouncing.
   *
   * @param commentData - Comment submission data
   * @param commentData.content - The comment text content
   * @param commentData.isInitialComment - Flag indicating this is the first comment (always true)
   * @param commentData.categoryId - The category ID for the comment
   */
  onInitialCommentSubmitted(commentData: { content: string; isInitialComment: boolean; categoryId: number }): void {
    // Process the initial comment immediately (no debouncing needed)
    this.processCommentSubmission(commentData.content, true);
  }

  /**
   * Handles regular comment submission from user input or discussion thread
   *
   * @description Queues comments for debounced processing to prevent duplicate submissions.
   * Supports both string and object formats for different submission sources.
   *
   * @param content - Comment content (string) or submission data object
   * @param content.content - The comment text when using object format
   * @param content.isInitialComment - Optional flag for initial comment routing
   * @param content.categoryId - Optional category ID for routing
   */
  onCommentSubmitted(content: string | { content: string; isInitialComment?: boolean; categoryId?: number }): void {
    if (typeof content === 'string') {
      // Legacy string format - queue for debounced processing
      this.commentSubmissionQueue$.next(content.trim());
    } else {
      // New object format from rating-gate component
      if (content.isInitialComment) {
        this.onInitialCommentSubmitted(content as { content: string; isInitialComment: boolean; categoryId: number });
      } else {
        // Regular comment - queue for debounced processing
        this.commentSubmissionQueue$.next(content.content.trim());
      }
    }
  }

  /**
   * Handles reply submission from discussion-thread component
   *
   * @description Creates a nested reply to an existing comment. Uses active category
   * from state and submits to backend with proper error handling.
   *
   * @param data - Reply submission data
   * @param data.parentCommentId - ID of the comment being replied to
   * @param data.content - The reply text content
   * @throws Error if no active category is available
   */
  onReplySubmitted(data: { parentCommentId: string; content: string }): void {
    if (!this.submissionId) {
      console.error('❌ Cannot submit reply: Missing submissionId');
      return;
    }

    // Set loading state
    this.isSubmittingComment$.next(true);

    // Get current active category and submit reply
    this.activeCategory$
      .pipe(
        take(1),
        switchMap(activeCategory => {
          if (!activeCategory) {
            throw new Error('Keine aktive Kategorie verfügbar');
          }

          return this.stateService.addReply(
            this.submissionId!,
            activeCategory,
            data.parentCommentId,
            data.content.trim()
          );
        }),
        takeUntil(this.destroy$)
      )
      .pipe(
        finalize(() => {
          // Always reset loading state, regardless of success or error
          this.isSubmittingComment$.next(false);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: reply => {
          this.showSnackBar('Antwort wurde erfolgreich erstellt', 'OK', 2000, false);
        },
        error: error => {
          console.error('❌ Failed to create reply:', error);
          // Show error message
          const message = error.message || 'Fehler beim Erstellen der Antwort';
          this.showSnackBar(message, 'Schließen', 5000, true);
        }
      });
  }

  /**
   * Handles message submission from action area input field
   *
   * @description Submits comment from the bottom text input field.
   * Validates content and clears input after successful queue.
   */
  onMessageSubmit(): void {
    const text = this.currentMessageText?.trim();
    if (text && text.length > 0) {
      this.onCommentSubmitted(text);
      this.currentMessageText = ''; // Clear input after submission
    }
  }

  private processCommentSubmission(content: string, isInitialComment = false): void {
    // Validate submissionId
    if (!this.submissionId) {
      console.error('❌ Cannot submit comment: No submission ID');
      this.showSnackBar('Fehler: Keine Abgabe-ID verfügbar', 'Schließen', 5000, true);
      return;
    }

    // Set loading state
    this.isSubmittingComment$.next(true);
    this.lastSubmittedContent = content;

    // Submit comment via backend
    this.stateService.activeCategory$
      .pipe(
        take(1),
        filter((activeCategory): activeCategory is number => activeCategory !== null),
        switchMap(activeCategory =>
          this.stateService.addComment(this.submissionId!, activeCategory, content)
        ),
        takeUntil(this.destroy$),
        finalize(() => {
          // Always reset loading state and cleanup
          this.isSubmittingComment$.next(false);
          this.lastSubmittedContent = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: comment => {
          // Show success message
          const message = isInitialComment
            ? 'Schriftliche Bewertung erfolgreich abgegeben - Diskussion freigeschaltet!'
            : 'Kommentar wurde erfolgreich hinzugefügt';
          this.showSnackBar(message, 'OK', isInitialComment ? 4000 : 3000, false);

          // Refresh discussions to ensure UI updates
          this.stateService.refreshDiscussions(this.submissionId!);

          // Force change detection for child components
          setTimeout(() => this.cdr.detectChanges(), 100);
        },
        error: error => {
          console.error('❌ Comment submission failed:', error);
          const message = error.message || 'Fehler beim Hinzufügen des Kommentars';
          this.showSnackBar(message, 'Schließen', 5000, true);
        }
      });
  }

  /**
   * Handles comment voting with vote limit enforcement
   *
   * @description Processes upvote or vote removal with optimistic UI updates and backend sync.
   * Enforces vote limits per category and provides user feedback via snackbar.
   *
   * @param data - Vote action data
   * @param data.commentId - ID of the comment to vote on
   * @param data.voteType - 'UP' for upvote, null to remove vote
   * @throws Error if no active category is available
   */
  onCommentVoted(data: { commentId: string; voteType: 'UP' | null }): void {
    // Prevent voting if already in progress for this comment
    if (this.isVotingComment.get(data.commentId)) {
      return;
    }

    // Set loading state for this specific comment
    this.isVotingComment.set(data.commentId, true);
    this.cdr.markForCheck(); // Manually trigger change detection

    this.activeCategory$.pipe(take(1)).subscribe(categoryId => {
      if (!categoryId) {
        console.error('❌ No active category for voting');
        this.showSnackBar('Fehler: Keine aktive Kategorie', 'Schließen', 3000, true);
        this.isVotingComment.delete(data.commentId); // Reset loading state
        this.cdr.markForCheck();
        return;
      }

      this.voteLimitService
        .voteCommentWithEnhancedLimits(data.commentId, data.voteType, categoryId, this.submissionId ?? undefined)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result: { success: boolean; voteLimitStatus?: any }) => {
            const action =
              data.voteType === 'UP'
                ? 'positiv bewertet'
                : 'Bewertung entfernt';

            const isRemoval = data.voteType === null;
            this.showSnackBar(
              `Kommentar ${action}`,
              'OK',
              2000,
              isRemoval // Rot für Entfernung, Grün für Hinzufügen
            );

            // 🚨 CRITICAL FIX: Force refresh vote status to ensure UI updates
            if (result.voteLimitStatus && this.submissionId) {
              this.voteLimitService.loadVoteLimitStatus(this.submissionId, categoryId).subscribe({
                next: () => {
                  this.cdr.markForCheck(); // Force change detection
                },
                error: (error) => console.error('❌ Failed to refresh vote status:', error)
              });
            }
          },
          error: (error: Error) => {
            console.error('❌ Vote failed:', error);
            const message = error.message || 'Fehler beim Bewerten des Kommentars';
            this.showSnackBar(message, 'Schließen', 5000, true);
          },
          complete: () => {
            // Always reset loading state on completion
            this.isVotingComment.delete(data.commentId);
            this.cdr.markForCheck();
          },
        });
    });
  }

  /**
   * Handles rating submission events with enhanced validation and category isolation
   * @param data - The rating data containing categoryId and score
   */
  onRatingSubmitted(data: { categoryId: number; score: number }): void {
    if (!this.submissionId) {
      console.error('❌ Cannot submit rating: No submission ID');
      return;
    }

    this.stateService
      .submitRating(this.submissionId, data.categoryId, data.score)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rating => {
          // Update rating status in state service for reactive updates
          // This triggers the centralized state update with category isolation
          this.stateService.updateCategoryRatingStatus(this.submissionId!, data.categoryId, data.score);

          // ✅ NO REFRESH NEEDED: Backend refresh removed to avoid 500 errors
          // Rating is persisted in DB and will be loaded on next category switch
          // or page reload (with retry mechanism)

          // Hide rating panel and collapse to show completed state
          this.showRatingPanel = false;
          this.isRatingPanelExpanded = false; // Automatically collapse after rating
          this.ratingJustSubmitted = true;

          // Force change detection
          this.cdr.markForCheck();

          this.snackBar.open(
            `Bewertung wurde erfolgreich abgegeben (${data.score} Punkte)`,
            'Schließen',
            {
              duration: 4000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            }
          );
        },
        error: error => {
          console.error('❌ Rating submission failed:', {
            categoryId: data.categoryId,
            score: data.score,
            error
          });

          this.snackBar.open(
            `Fehler beim Abgeben der Bewertung`,
            'Schließen',
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            }
          );
        },
      });
  }

  /**
   * Handles rating deletion events from rating gate component
   *
   * @description Called when user clicks the "Zurücksetzen" button to delete their rating.
   * This will call the backend to delete the rating and update the local state.
   *
   * @param {RatingDeletionEvent} data - The deletion event data containing categoryId
   */
  onRatingDeleted(data: RatingDeletionEvent): void {
    if (!this.submissionId) {
      console.error('❌ Cannot delete rating: No submission ID');
      return;
    }

    // Call backend to delete rating from database
    this.stateService.deleteCategoryRating(this.submissionId!, data.categoryId).subscribe({
      next: () => {
        // Show success message
        this.snackBar.open(
          `Bewertung wurde erfolgreich gelöscht`,
          'Schließen',
          {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['success-snackbar']
          }
        );
      },
      error: (error) => {
        console.error('❌ Failed to delete rating:', error);

        // Show error message
        this.snackBar.open(
          `Fehler beim Löschen der Bewertung: ${error.message || 'Unbekannter Fehler'}`,
          'Schließen',
          {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          }
        );
      }
    });
  }

  /**
   * Handles discussion access granted events from rating gate
   *
   * @description Called when the rating gate component grants access to discussion
   * after a user successfully rates a category. Updates UI state and shows success message.
   *
   * @param {DiscussionAccessEvent} data - Event data containing categoryId
   * @memberof EvaluationDiscussionForumComponent
   */
  onDiscussionAccessGranted(data: DiscussionAccessEvent): void {
    // State is now automatically updated through reactive observables

    // Show success message
    this.showSuccessMessage(
      `Diskussion für diese Kategorie wurde freigeschaltet`
    );

    // Trigger change detection
    this.cdr.markForCheck();

    // Comment stats will be updated automatically through reactive streams
    // No manual refresh needed - the state service handles this reactively
  }



  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Refreshes all evaluation data from backend
   *
   * @description Reloads submission, categories, discussions, and ratings from backend.
   * Useful after connectivity issues or to ensure data is up-to-date.
   *
   * @requires this.submissionId must be set
   */
  onRefresh(): void {
    if (this.submissionId) {
      this.stateService.refreshAll(this.submissionId, Number(this.userservice.getTokenID()));
    }
  }

  /**
   * Gets rating statistics for a specific category
   * @param categoryId - The ID of the category
   * @returns Observable<RatingStatsDTO> The rating statistics
   */
  getRatingStats(categoryId: number): Observable<RatingStatsDTO> {
    if (!this.submissionId) {
      throw new Error('No submission ID available');
    }
    return this.stateService.getRatingStats(this.submissionId, categoryId);
  }

  // =============================================================================
  // TRACK BY FUNCTIONS FOR PERFORMANCE
  // =============================================================================

  /**
   * TrackBy function for category list rendering optimization
   *
   * @description Used by Angular's *ngFor to track categories by their unique ID.
   * Improves change detection performance by preventing unnecessary re-renders.
   * Using ID instead of name ensures better tracking when categories have identical names.
   *
   * @param index - Array index (unused)
   * @param category - Category DTO object
   * @returns Unique category ID as number
   */
  trackByCategory(index: number, category: EvaluationCategoryDTO): number {
    return category.id;
  }

  /**
   * TrackBy function for discussion list rendering optimization
   *
   * @description Used by Angular's *ngFor to track discussions by their ID.
   * Prevents unnecessary DOM manipulation when discussions update.
   *
   * @param index - Array index (unused)
   * @param discussion - Discussion DTO object
   * @returns Unique discussion ID as string
   */
  trackByDiscussion(index: number, discussion: EvaluationDiscussionDTO): string {
    return discussion.id.toString();
  }

  /**
   * TrackBy function for comment list rendering optimization
   *
   * @description Used by Angular's *ngFor to track comments by their ID.
   * Essential for performance with large comment threads.
   *
   * @param index - Array index (unused)
   * @param comment - Comment DTO object
   * @returns Unique comment ID as string
   */
  trackByComment(index: number, comment: EvaluationCommentDTO): string {
    return comment.id.toString();
  }

  // =============================================================================
  // 🚀 PHASE 5: ENHANCED ERROR HANDLING WITH GLOBAL STATE
  // =============================================================================

  /**
   * Unified message display using global state notifications and snackbar
   *
   * @description Displays messages with consistent styling based on type.
   * Integrates with global state for notification management and shows immediate
   * snackbar feedback. Automatically handles error tracking.
   *
   * @param type - Message type (error/success/warning/info)
   * @param message - Message text to display
   * @param action - Optional action button text (defaults to config)
   *
   * @example
   * this.showMessage('success', 'Rating saved successfully');
   * this.showMessage('error', 'Failed to load data', 'Retry');
   */
  private showMessage(
    type: 'error' | 'success' | 'warning' | 'info',
    message: string,
    action?: string
  ): void {
    const config = MESSAGE_CONFIGS[type];

    // Add to global state notifications
    this.globalStateService.addNotification({
      type,
      title: config.title,
      message,
      autoClose: true,
      duration: config.duration
    });

    // Show snackbar for immediate feedback
    this.showSnackBar(
      message,
      action || config.action,
      config.duration,
      type === 'error'
    );

    // Track errors in system state
    if (type === 'error') {
      this.globalStateService.incrementPendingActions();
    }
  }

  /**
   * Convenience method for error messages
   * @param message - Error message to display
   * @param action - Optional action button text
   */
  private showErrorMessage(message: string, action?: string): void {
    this.showMessage('error', message, action);
  }

  /**
   * Convenience method for success messages
   * @param message - Success message to display
   * @param action - Optional action button text
   */
  private showSuccessMessage(message: string, action?: string): void {
    this.showMessage('success', message, action);
  }

  /**
   * Convenience method for warning messages
   * @param message - Warning message to display
   * @param action - Optional action button text
   */
  private showWarningMessage(message: string, action?: string): void {
    this.showMessage('warning', message, action);
  }

  /**
   * Convenience method for info messages
   * @param message - Info message to display
   * @param action - Optional action button text
   */
  private showInfoMessage(message: string, action?: string): void {
    this.showMessage('info', message, action);
  }

  // =============================================================================
  // 🚀 PHASE 5: ENHANCED NAVIGATION METHODS
  // =============================================================================

  /**
   * Navigates to a specific submission with state management
   *
   * @param submissionId - The submission ID to navigate to
   * @param categoryId - Optional category to select
   */
  navigateToSubmission(submissionId: string, categoryId?: number): void {
    this.navigationService.navigateToSubmission(submissionId, categoryId)
      .then(success => {
        if (success) {
          this.showInfoMessage(`Zu Abgabe ${submissionId} navigiert`);
        } else {
          this.showErrorMessage('Navigation fehlgeschlagen');
        }
      })
      .catch(error => {
        console.error('❌ Navigation error:', error);
        this.showErrorMessage('Fehler bei der Navigation');
      });
  }

  /**
   * Shares the current evaluation URL
   */
  shareCurrentEvaluation(): void {
    const shareUrl = this.navigationService.generateShareableUrl(true);

    if (navigator.share) {
      // Use native share API if available
      navigator.share({
        title: 'HEFL Evaluation Discussion',
        text: 'Schauen Sie sich diese Bewertungsdiskussion an',
        url: shareUrl
      }).then(() => {
        this.showSuccessMessage('Link erfolgreich geteilt');
      }).catch(error => {
        console.error('Share failed:', error);
        this.copyToClipboard(shareUrl);
      });
    } else {
      // Fallback to clipboard
      this.copyToClipboard(shareUrl);
    }
  }

  /**
   * Copies text to clipboard with user feedback
   *
   * @param text - Text to copy
   */
  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text)
      .then(() => {
        this.showSuccessMessage('Link in Zwischenablage kopiert');
      })
      .catch(error => {
        console.error('Clipboard copy failed:', error);
        this.showErrorMessage('Kopieren in Zwischenablage fehlgeschlagen');
      });
  }

  /**
   * Exports current evaluation data
   */
  exportEvaluationData(): void {
    this.userPermissions$.pipe(take(1)).subscribe(permissions => {
      if (!permissions.canExport) {
        this.showWarningMessage('Sie haben keine Berechtigung zum Exportieren');
        return;
      }

      // Implement export functionality
      this.showInfoMessage('Export-Funktionalität wird implementiert...');
    });
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================

  /**
   * Converts EvaluationPhase enum to string for phase toggle component
   *
   * @description Maps the EvaluationPhase enum to string literals expected by UI components.
   * Used in template bindings for phase-dependent UI elements.
   *
   * @param phase - The evaluation phase enum value (DISCUSSION or EVALUATION)
   * @returns String literal 'discussion' or 'evaluation'
   */
  getPhaseString(phase: EvaluationPhase | null): 'discussion' | 'evaluation' {
    return phase === EvaluationPhase.DISCUSSION ? 'discussion' : 'evaluation';
  }

  /**
   * Gets the current rating for a category (if any)
   */
  /**
   * Gets the current rating for a specific category
   * @param categoryId - The ID of the category
   * @returns Observable<EvaluationRatingDTO | null> The current rating
   */
  getCurrentRating(categoryId: number): Observable<EvaluationRatingDTO | null> {
    // This would need to be implemented in the state service
    // For now, return null to prevent template errors
    return this.stateService.getCurrentRating(categoryId);
  }

  // Vote limits are now handled reactively in the viewModel$

  /**
   * Navigates to dashboard when no submission is available
   *
   * @description Fallback navigation when submission cannot be loaded.
   * Redirects user to main dashboard page.
   */
  onNavigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Toggles the rating panel expansion state
   *
   * @description Expands or collapses the rating panel. Triggers change detection
   * to update UI immediately.
   */
  onToggleRatingPanel(): void {
    this.isRatingPanelExpanded = !this.isRatingPanelExpanded;
    this.cdr.markForCheck();
  }

  /**
   * Resets the rating by deleting it from database
   *
   * @description Completely removes the user's rating for the current category from the database.
   * Re-enables the rating input panel and resets the slider state for new rating.
   *
   * @requires Active category must be set
   */
  onResetRating(): void {
    this.activeCategory$.pipe(take(1)).subscribe(activeCategory => {
      if (activeCategory && this.submissionId) {
        // Call the backend to actually delete the rating from database
        this.stateService.deleteCategoryRating(this.submissionId, activeCategory).subscribe({
          next: () => {
            // Wait for the state to propagate, then update UI
            setTimeout(() => {
              // Enable rating panel for new input and expand it
              this.showRatingPanel = true;
              this.isRatingPanelExpanded = true; // Expand for rating input
              this.ratingJustSubmitted = false;

              // Reset the rating slider state to unrated
              if (this.ratingSlider) {
                this.ratingSlider.resetSliderState();
              }

              // Force change detection
              this.cdr.markForCheck();
            }, 100); // Small delay to ensure state propagation

            // Show success message immediately
            this.showSuccessMessage('Bewertung wurde erfolgreich gelöscht - Sie können erneut bewerten');
          },
          error: (error) => {
            console.error('❌ Failed to delete rating:', error);

            // Show error message
            this.snackBar.open(
              `Fehler beim Löschen der Bewertung: ${error.message || 'Unbekannter Fehler'}`,
              'Schließen',
              {
                duration: 5000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
                panelClass: ['error-snackbar']
              }
            );
          }
        });
      }
    });
  }

  /**
   * Cancels the rating reset operation
   *
   * @description Closes the rating input panel and returns to collapsed state
   * without making any changes. User's existing rating remains unchanged.
   */
  onCancelReset(): void {
    this.showRatingPanel = false;
    this.isRatingPanelExpanded = false;
    this.cdr.markForCheck();
  }

  /**
   * Opens the vote explanation dialog
   *
   * @description Shows a comprehensive modal dialog explaining the voting system,
   * including how voting works, vote limits, point calculation, and current user's vote status.
   * Dialog is responsive and includes current vote statistics.
   */
  openVoteExplanationDialog(): void {
    // Get current vote limit status from the state service
    this.voteStatus$.pipe(take(1)).subscribe(voteStatus => {
      this.dialog.open(VotingMechanismDialogComponent, {
        width: '1000px',
        maxWidth: '95vw',
        height: '85vh',
        maxHeight: '95vh',
        data: {
          currentVotes: voteStatus?.availableVotes || 0,
          maxVotes: voteStatus?.totalVotes || 0,
        },
        panelClass: 'vote-explanation-dialog',
        autoFocus: false,
        restoreFocus: true,
      });
    });
  }

  // =============================================================================
  // SNACKBAR MANAGEMENT
  // =============================================================================

  /**
   * Robust SnackBar management with explicit reference handling
   * @param message - The message to display
   * @param action - The action button text (default: 'Schließen')
   * @param duration - Duration in milliseconds (default: 5000)
   * @param isError - Whether this is an error message (affects styling)
   */
  private showSnackBar(
    message: string,
    action: string = 'Schließen',
    duration: number = 5000,
    isError: boolean = false,
  ): void {
    // Close any existing SnackBar first
    if (this.currentSnackBarRef) {
      this.currentSnackBarRef.dismiss();
    }

    // Open new SnackBar with explicit reference
    this.currentSnackBarRef = this.snackBar.open(message, action, {
      duration: duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar'],
    });

    // Explicit action handler
    this.currentSnackBarRef.onAction().subscribe(() => {
      this.currentSnackBarRef = null;
    });

    // Auto-dismiss handler
    this.currentSnackBarRef.afterDismissed().subscribe(() => {
      this.currentSnackBarRef = null;
    });
  }


  // =============================================================================
  // PDF DOWNLOAD METHODS
  // =============================================================================

  /**
   * Handles PDF download from the main header button
   *
   * @description Downloads the submission's PDF file using the PdfExportService
   */
  onDownloadPdf(): void {
    this.viewModel$.pipe(take(1)).subscribe(vm => {
      if (vm.submission?.pdfMetadata?.downloadUrl) {
        try {
          this.pdfExportService.downloadPdf(
            vm.submission.pdfMetadata.downloadUrl,
            vm.submission.title
          );
          this.showSnackBar('PDF-Download gestartet', 'OK', 2000, false);
        } catch (error) {
          console.error('❌ PDF download failed:', error);
          this.showSnackBar('Fehler beim PDF-Download', 'Schließen', 3000, true);
        }
      } else {
        console.error('❌ No PDF download URL available');
        this.showSnackBar('PDF-Download nicht verfügbar', 'Schließen', 3000, true);
      }
    });
  }

  /**
   * Retries loading rating status after backend health issue
   *
   * @description Called by user action (retry button click) to attempt
   * reloading rating status data from the backend after a failure
   * @memberof EvaluationDiscussionForumComponent
   */
  onRetryRatingStatusLoad(): void {
    const submissionId = this.submissionId;
    const anonymousUser = this.stateService.getUserId();

    if (!submissionId || !anonymousUser) {
      this.showErrorMessage('Kann Rating Status nicht neu laden. Bitte Seite aktualisieren.', 'OK');
      return;
    }

    this.stateService.retryRatingStatusLoad(submissionId, anonymousUser);
    this.showInfoMessage('Rating Status wird neu geladen...', 'OK');
  }
}
