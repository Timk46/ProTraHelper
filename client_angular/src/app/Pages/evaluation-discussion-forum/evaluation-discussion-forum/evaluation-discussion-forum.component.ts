import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Observable, Subject, combineLatest, BehaviorSubject, of, interval } from 'rxjs';
import { takeUntil, map, filter, switchMap, take, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  EvaluationPhase,
  EvaluationStatus,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  RatingStatsDTO,
  globalRole,
} from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from '../../../Services/evaluation/evaluation-discussion.service';
import { EvaluationStateService } from '../../../Services/evaluation/evaluation-state.service';
import { EvaluationMockDataService } from '../../../Services/evaluation/evaluation-mock-data.service';
import { EvaluationGlobalStateService } from '../services/evaluation-global-state.service';
import { EvaluationNavigationService } from '../services/evaluation-navigation.service';
import { EvaluationPerformanceService } from '../services/evaluation-performance.service';
import { BundleAnalyzerService } from '../services/bundle-analyzer.service';
import { MemoryLeakDetectorService } from '../services/memory-leak-detector.service';

// Child Components
import { CategoryTabsComponent } from '../components/category-tabs/category-tabs.component';
import { PdfViewerPanelComponent } from '../components/pdf-viewer-panel/pdf-viewer-panel.component';
import { PerformanceDashboardComponent } from '../components/performance-dashboard/performance-dashboard.component';
import { DiscussionThreadComponent } from '../components/discussion-thread/discussion-thread.component';
import { PhaseToggleComponent } from '../components/phase-toggle/phase-toggle.component';
import { ErrorFallbackComponent } from '../components/error-fallback/error-fallback.component';
import { RatingSliderComponent } from '../components/rating-slider/rating-slider.component';
import { RatingGateComponent } from '../components/rating-gate/rating-gate.component';

// =============================================================================
// MOCK DATA FOR DEVELOPMENT - ALL REMOVED
// =============================================================================

// All mock data has been removed and replaced with real backend services:
// - MOCK_CATEGORIES: Using stateService.categories$
// - MOCK_SUBMISSION: Using stateService.submission$
// - MOCK_DISCUSSIONS_DATA: Using stateService.activeDiscussions$
// - MOCK_VOTE_TRACKING: Using stateService.voteLimits$
// - MOCK_COMMENT_STATS: Using stateService.commentStats$
// - MOCK_ANONYMOUS_USER: Using stateService.anonymousUser$

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
    CategoryTabsComponent,
    PdfViewerPanelComponent,
    DiscussionThreadComponent,
    PhaseToggleComponent,
    RatingSliderComponent,
    RatingGateComponent,
    ErrorFallbackComponent,
    PerformanceDashboardComponent,
  ],
  templateUrl: './evaluation-discussion-forum.component.html',
  styleUrl: './evaluation-discussion-forum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationDiscussionForumComponent implements OnInit, OnDestroy {
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private stateService: EvaluationStateService,
    private discussionService: EvaluationDiscussionService,
    private mockDataService: EvaluationMockDataService,
    private globalStateService: EvaluationGlobalStateService,
    private navigationService: EvaluationNavigationService,
    private performanceService: EvaluationPerformanceService,
    private bundleAnalyzer: BundleAnalyzerService,
    private memoryLeakDetector: MemoryLeakDetectorService
  ) {
    console.log('🏗️ EvaluationDiscussionForumComponent constructor called');
  }
  // =============================================================================
  // TEMPLATE UTILITIES
  // =============================================================================

  protected readonly EvaluationPhase = EvaluationPhase;

  // =============================================================================
  // COMPONENT STATE - ENHANCED WITH GLOBAL STATE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();
  
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
  activeCategory$!: Observable<number>;
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
  canComment$!: Observable<boolean>;
  canRate$!: Observable<boolean>;

  // View model combination
  viewModel$!: Observable<{
    submission: EvaluationSubmissionDTO | null;
    categories: EvaluationCategoryDTO[];
    activeCategory: number;
    activeCategoryInfo: EvaluationCategoryDTO | null;
    discussions: EvaluationDiscussionDTO[];
    commentStats: CommentStatsDTO | null;
    anonymousUser: AnonymousEvaluationUserDTO | null;
    currentPhase: EvaluationPhase | null;
    isDiscussionPhase: boolean;
    isEvaluationPhase: boolean;
    canComment: boolean;
    canRate: boolean;
    canVote: boolean;
    loading: boolean;
    error: string | null;
    isSubmittingComment: boolean;
    availableUpvotes: number;
    availableDownvotes: number;
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
  private currentSnackBarRef: any = null;
  
  // Rating gate access control - replaced with reactive state from stateService

  // 🚀 PHASE 5: Enhanced initialization with comprehensive setup
  private initializeObservableStreams(): void {
    // Core state streams from service with initial values to ensure viewModel$ always emits
    this.submission$ = this.stateService.submission$;
    this.categories$ = this.stateService.categories$;
    this.activeCategory$ = this.stateService.activeCategory$;
    this.activeCategoryInfo$ = this.stateService.activeCategoryInfo$.pipe(startWith());
    this.discussions$ = this.stateService.activeDiscussions$.pipe(startWith([]));
    this.commentStats$ = this.stateService.commentStats$.pipe(startWith());
    this.anonymousUser$ = this.stateService.anonymousUser$.pipe(startWith());
    this.currentPhase$ = this.stateService.currentPhase$.pipe(startWith());
    this.loading$ = this.stateService.loading$;
    this.error$ = this.stateService.error$;

    // Derived streams
    this.isDiscussionPhase$ = this.currentPhase$.pipe(
      map(phase => phase === EvaluationPhase.DISCUSSION)
    );

    this.isEvaluationPhase$ = this.currentPhase$.pipe(
      map(phase => phase === EvaluationPhase.EVALUATION)
    );

    // Rating status stream for current category - replaces hasRatedCurrentCategory
    this.hasRatedCurrentCategory$ = this.activeCategory$.pipe(
      switchMap(categoryId => 
        categoryId ? this.stateService.isCategoryRated$(categoryId) : of(false)
      ),
      distinctUntilChanged(),
      startWith(false)
    );

    this.canComment$ = this.isDiscussionPhase$;
    this.canRate$ = this.isEvaluationPhase$;

    // Combined view model
    this.viewModel$ = combineLatest([
      this.submission$,
      this.categories$,
      this.activeCategory$,
      this.activeCategoryInfo$,
      this.discussions$,
      this.commentStats$,
      this.anonymousUser$,
      this.currentPhase$,
      this.isDiscussionPhase$,
      this.isEvaluationPhase$,
      this.canComment$,
      this.canRate$,
      this.loading$,
      this.error$,
      this.stateService.voteLimits$,
      this.isSubmittingComment$,
    ]).pipe(
      map(
        ([
          submission,
          categories,
          activeCategory,
          activeCategoryInfo,
          discussions,
          commentStats,
          anonymousUser,
          currentPhase,
          isDiscussionPhase,
          isEvaluationPhase,
          canComment,
          canRate,
          loading,
          error,
          voteLimits,
          isSubmittingComment,
        ]) => {
          // Get current category vote limits
          const categoryLimits = voteLimits.get(activeCategory);

          return {
            submission,
            categories,
            activeCategory,
            activeCategoryInfo,
            discussions,
            commentStats,
            anonymousUser,
            currentPhase,
            isDiscussionPhase,
            isEvaluationPhase,
            canComment,
            canRate,
            canVote: isDiscussionPhase, // Can vote in discussion phase
            loading,
            error,
            isSubmittingComment,
            availableUpvotes: categoryLimits?.plusVotes || 3,
            availableDownvotes: categoryLimits?.minusVotes || 3,
          };
        }
      )
    );
  }

  ngOnInit(): void {
    console.log('🎆 EvaluationDiscussionForumComponent initialized');
    
    // 🚀 PHASE 5: Enhanced initialization with global state management
    this.initializeGlobalStateManagement();
    this.handleRouteParams();
    this.handleErrorNotifications();
    this.loadInitialData();
    this.setupEventHandling();
    this.setupDeepLinkingSupport();
    this.setupPerformanceMonitoring();
  }

  ngOnDestroy(): void {
    console.log('🧹 EvaluationDiscussionForumComponent cleanup');
    
    this.destroy$.next();
    this.destroy$.complete();
    
    // 🚀 PHASE 5: Enhanced cleanup with global state management
    this.cleanup();
  }
  
  private cleanup(): void {
    // 🚀 PHASE 6: Enhanced cleanup with performance monitoring
    console.log('🧹 Starting enhanced cleanup with performance monitoring...');
    
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
    
    console.log('✅ Enhanced cleanup completed');
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // REMOVED: initializeMockStreams() - using real services now

  // 🚀 PHASE 5: Initialize global state management integration
  private initializeGlobalStateManagement(): void {
    console.log('🌐 Initializing global state management');
    
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
      console.log(`⏱️ Component initialization completed in ${loadTime.toFixed(2)}ms`);
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
    console.log('🔗 Setting up deep linking support');
    
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
      filter(categoryId => !!categoryId)
    ).subscribe(categoryId => {
      this.stateService.setActiveCategory(categoryId!);
    });
    
    // Update page metadata based on navigation context
    this.navigationContext$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(context => {
      this.updatePageMetadata(context);
    });
  }
  
  private setupPerformanceMonitoring(): void {
    // 🚀 PHASE 6: Enhanced Performance Monitoring & Optimization
    console.log('🎯 Setting up comprehensive performance monitoring...');
    
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

    // Start component profiling
    this.performanceService.startComponentProfiling('evaluation-discussion-forum', {
      trackMemory: true,
      trackChangeDetection: true,
      sampleRate: 1.0 // Profile all render cycles for main component
    });

    // Analyze bundle structure
    this.bundleAnalyzer.analyzeBundleStructure();
    
    // Monitor component performance and report to global state
    const startTime = performance.now();
    
    // Track render performance with enhanced metrics
    this.viewModel$.pipe(
      takeUntil(this.destroy$),
      debounceTime(100)
    ).subscribe(() => {
      const renderTime = performance.now() - startTime;
      
      // Mark performance events
      this.performanceService.markRenderEnd('evaluation-discussion-forum');
      
      // Log slow renders with more context
      if (renderTime > 100) {
        console.warn(`⚠️ Slow render detected: ${renderTime.toFixed(2)}ms in evaluation forum`);
        
        // Report to performance service
        this.performanceService.updatePerformanceMetrics(renderTime, true);
      }
    });

    // Monitor critical performance metrics
    this.performanceService.performanceMetrics$.pipe(
      takeUntil(this.destroy$),
      filter(metrics => metrics.componentMetrics.has('evaluation-discussion-forum'))
    ).subscribe(metrics => {
      const componentMetrics = metrics.componentMetrics.get('evaluation-discussion-forum');
      if (componentMetrics && componentMetrics.averageRenderTime > 50) {
        console.warn(`📊 Component performance alert: Average render time ${componentMetrics.averageRenderTime.toFixed(2)}ms`);
      }
    });

    // Monitor memory leaks
    this.memoryLeakDetector.leakDetectionReport$.pipe(
      takeUntil(this.destroy$),
      filter(report => report.detectedLeaks.length > 0)
    ).subscribe(report => {
      const criticalLeaks = report.detectedLeaks.filter(leak => 
        leak.severity === 'critical' && leak.componentName === 'evaluation-discussion-forum'
      );
      
      if (criticalLeaks.length > 0) {
        console.error('🚨 Critical memory leaks detected in evaluation forum:', criticalLeaks);
        
        // Show user notification for critical issues
        this.snackBar.open(
          'Leistungsproblem erkannt - Seite wird optimiert',
          'OK',
          { duration: 5000, panelClass: ['warning-snackbar'] }
        );
      }
    });

    // Log performance report periodically
    interval(30000).pipe( // Every 30 seconds
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.performanceService.logPerformanceReport();
      this.bundleAnalyzer.logBundleReport();
    });
    
    console.log('✅ Performance monitoring setup completed');
  }
  
  // =============================================================================
  // 🚀 PHASE 6: PERFORMANCE MONITORING CONTROLS
  // =============================================================================
  
  /**
   * Toggles the performance dashboard visibility
   */
  togglePerformanceDashboard(): void {
    this.showPerformanceDashboard = !this.showPerformanceDashboard;
    console.log(`📊 Performance dashboard ${this.showPerformanceDashboard ? 'shown' : 'hidden'}`);
    
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
   * (e.g., in development mode or for admin users)
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
  
  private updatePageMetadata(context: any): void {
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
    console.log('🎯 Scrolling to comment:', commentId);
    
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
        console.log('🎯 Route submissionId extracted:', submissionId);

        if (submissionId) {
          // Real mode with backend API calls
          console.log('📡 Real mode - calling stateService.loadSubmission...', submissionId);
          this.submissionId = submissionId;
          this.stateService.loadSubmission(submissionId);
        } else {
          // Mock mode only for /forum route (no submissionId)
          console.log('🎭 Entering demo mode (no submissionId)');
          this.submissionId = null;
          this.stateService.loadMockData();
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

    // Setup rating status checking when active category changes
    this.activeCategory$
      .pipe(
        filter(categoryId => categoryId > 0), // Only check valid category IDs
        takeUntil(this.destroy$)
      )
      .subscribe(categoryId => {
        console.log('🔄 Active category changed to:', categoryId, '- rating status tracked reactively');
        // Rating status is now handled automatically by hasRatedCurrentCategory$ observable
      });
  }

  // =============================================================================
  // EVENT HANDLERS - USER INTERACTIONS
  // =============================================================================

  /**
   * Handles category selection events
   * @param categoryId - The ID of the selected category
   */
  onCategorySelected(categoryId: number): void {
    // FIXED: Using real state service instead of mock
    this.stateService.setActiveCategory(categoryId);

    // Rating status is now tracked automatically through hasRatedCurrentCategory$ observable
    // Trigger change detection to update UI
    this.cdr.markForCheck();
  }

  // Method removed - rating status is now handled reactively through stateService

  onCommentSubmitted(content: string): void {
    // Queue the comment for debounced processing
    this.commentSubmissionQueue$.next(content.trim());
  }

  /**
   * Handles reply submission from discussion-thread component
   * @param data - Contains parentCommentId and content
   */
  onReplySubmitted(data: { parentCommentId: string; content: string }): void {
    if (!this.submissionId) {
      console.error('❌ Cannot submit reply: Missing submissionId');
      return;
    }

    console.log('📝 Reply submitted:', {
      parentCommentId: data.parentCommentId,
      content: data.content.substring(0, 50) + '...',
      submissionId: this.submissionId,
    });

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

          console.log('📝 Submitting reply to category:', activeCategory);
          
          return this.stateService.addReply(
            this.submissionId!,
            activeCategory,
            data.parentCommentId,
            data.content.trim()
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: reply => {
          console.log('✅ Reply created successfully:', reply);
          this.showSnackBar('Antwort wurde erfolgreich erstellt', 'OK', 2000, false);
          
          // Reset loading state
          this.isSubmittingComment$.next(false);
          this.cdr.markForCheck();
        },
        error: error => {
          console.error('❌ Failed to create reply:', error);
          
          // Reset loading state
          this.isSubmittingComment$.next(false);
          this.cdr.markForCheck();
          
          // Show error message
          const message = error.message || 'Fehler beim Erstellen der Antwort';
          this.showSnackBar(message, 'Schließen', 5000, true);
        }
      });
  }

  /**
   * Handles message submission from action area input field
   */
  onMessageSubmit(): void {
    const text = this.currentMessageText?.trim();
    if (text && text.length > 0) {
      this.onCommentSubmitted(text);
      this.currentMessageText = ''; // Clear input after submission
    }
  }

  private processCommentSubmission(content: string): void {
    // Set loading state to true
    this.isSubmittingComment$.next(true);
    this.lastSubmittedContent = content;

    console.log('🎬 Processing comment submission. Mock mode:', this.isMockMode());

    if (this.isMockMode()) {
      // Mock mode - handle locally
      this.stateService.activeCategory$
        .pipe(
          take(1),
          switchMap(activeCategory => this.mockDataService.addMockComment(activeCategory, content)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: comment => {
            console.log('✅ Mock comment added successfully:', comment);

            // Update discussions cache manually for immediate UI update
            this.updateMockDiscussionCache(comment);

            // Update comment stats
            this.mockDataService.getMockCommentStats().subscribe(stats => {
              this.stateService['commentStatsSubject'].next(stats);
            });

            // CRITICAL: Force change detection for OnPush components
            setTimeout(() => {
              this.cdr.detectChanges();
            }, 100);

            this.showSnackBar('Kommentar wurde erfolgreich hinzugefügt', 'OK', 3000, false);
            this.cdr.markForCheck();

            // Reset states
            this.isSubmittingComment$.next(false);
            this.lastSubmittedContent = null;
          },
          error: error => {
            console.error('❌ Mock comment submission failed:', error);
            this.showSnackBar('Fehler beim Hinzufügen des Kommentars 1', 'Schließen', 5000, true);
            this.isSubmittingComment$.next(false);
            this.lastSubmittedContent = null;
            this.cdr.markForCheck();
          },
        });
    } else {
      // Real mode - use backend
      if (!this.submissionId) return;

      this.stateService.activeCategory$
        .pipe(
          take(1),
          switchMap(activeCategory =>
            this.stateService.addComment(this.submissionId!, activeCategory, content),
          ),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: comment => {
            console.log('✅ Comment added successfully:', comment);
            this.showSnackBar('Kommentar wurde erfolgreich hinzugefügt', 'OK', 3000, false);
            this.cdr.markForCheck();

            // Reset states
            this.isSubmittingComment$.next(false);
            this.lastSubmittedContent = null;
          },
          error: error => {
            console.error('❌ Comment submission failed:', error);
            this.showSnackBar('Fehler beim Hinzufügen des Kommentars', 'Schließen', 5000, true);
            this.isSubmittingComment$.next(false);
            this.lastSubmittedContent = null;
            this.cdr.markForCheck();
          },
        });
    }
  }

  onCommentVoted(data: { commentId: string; voteType: 'UP' | 'DOWN' | null }): void {
    console.log('🗳️ Vote action triggered:', data);

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

      console.log('📊 Voting in category:', categoryId);

      this.stateService
        .voteCommentWithLimits(data.commentId, data.voteType, categoryId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: result => {
            console.log('✅ Vote successful:', result);

            const action =
              data.voteType === 'UP'
                ? 'positiv bewertet'
                : data.voteType === 'DOWN'
                  ? 'negativ bewertet'
                  : 'Bewertung entfernt';

            this.showSnackBar(`Kommentar ${action}`, 'OK', 2000, false);
          },
          error: error => {
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
   * Handles rating submission events
   * @param data - The rating data containing categoryId and score
   */
  onRatingSubmitted(data: { categoryId: number; score: number }): void {
    if (!this.submissionId) return;

    this.stateService
      .submitRating(this.submissionId, data.categoryId, data.score)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rating => {
          // Update rating status in state service for reactive updates
          this.stateService.updateCategoryRatingStatus(this.submissionId!, data.categoryId, data.score);
          this.cdr.markForCheck();
          
          this.snackBar.open('Bewertung wurde erfolgreich abgegeben', 'Schließen', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
        error: error => {
          this.snackBar.open('Fehler beim Abgeben der Bewertung', 'Schließen', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
      });
  }

  /**
   * Handles discussion access granted events from rating gate
   * 
   * @description Called when the rating gate component grants access to discussion
   * after a user successfully rates a category. Updates UI state and shows success message.
   * 
   * @param {any} data - Event data containing categoryId
   * @memberof EvaluationDiscussionForumComponent
   */
  onDiscussionAccessGranted(data: { categoryId: number }): void {
    console.log('🔓 Discussion access granted for category:', data.categoryId);
    
    // State is now automatically updated through reactive observables
    
    // Show success message
    this.showSuccessMessage(
      `Diskussion für diese Kategorie wurde freigeschaltet`
    );
    
    // Trigger change detection
    this.cdr.markForCheck();
    
    // Refresh comment stats to reflect new rating
    if (this.submissionId) {
      // Trigger a reload of comment stats (load initial data again)
      this.stateService.refreshAll(this.submissionId);
    }
  }

  onPhaseToggled(targetPhase: 'discussion' | 'evaluation'): void {
    if (!this.submissionId) return;

    // Convert string to enum
    const evaluationPhase =
      targetPhase === 'discussion' ? EvaluationPhase.DISCUSSION : EvaluationPhase.EVALUATION;

    this.stateService
      .switchPhase(this.submissionId, evaluationPhase)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const phaseName = targetPhase === 'discussion' ? 'Diskussion' : 'Bewertung';
          this.snackBar.open(`Phase wurde zu ${phaseName} gewechselt`, 'Schließen', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
        error: error => {
          this.snackBar.open('Fehler beim Wechseln der Phase', 'Schließen', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        },
      });
  }

  /**
   * Toggle between discussion and evaluation phase (for development)
   */
  togglePhase(): void {
    this.currentPhase$.pipe(take(1)).subscribe(currentPhase => {
      const targetPhase = currentPhase === EvaluationPhase.DISCUSSION ? 'evaluation' : 'discussion';
      this.onPhaseToggled(targetPhase);
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  onRefresh(): void {
    if (this.submissionId) {
      this.stateService.refreshAll(this.submissionId);
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

  trackByCategory(index: number, category: EvaluationCategoryDTO): string {
    return category.name;
  }

  trackByDiscussion(index: number, discussion: EvaluationDiscussionDTO): string {
    return discussion.id;
  }

  trackByComment(index: number, comment: EvaluationCommentDTO): string {
    return comment.id;
  }

  // =============================================================================
  // 🚀 PHASE 5: ENHANCED ERROR HANDLING WITH GLOBAL STATE
  // =============================================================================

  /**
   * Enhanced error message display using global state notifications
   * 
   * @param message - Error message to display
   * @param action - Optional action button text
   */
  private showErrorMessage(message: string, action?: string): void {
    // Add to global state notifications
    this.globalStateService.addNotification({
      type: 'error',
      title: 'Fehler',
      message,
      autoClose: true,
      duration: 5000
    });
    
    // Also show snackbar for immediate feedback
    this.showSnackBar(message, action || 'Schließen', 5000, true);
    
    // Update system error count
    this.globalStateService.incrementPendingActions();
  }
  
  /**
   * Enhanced success message display using global state notifications
   * 
   * @param message - Success message to display
   * @param action - Optional action button text
   */
  private showSuccessMessage(message: string, action?: string): void {
    // Add to global state notifications
    this.globalStateService.addNotification({
      type: 'success',
      title: 'Erfolg',
      message,
      autoClose: true,
      duration: 3000
    });
    
    // Also show snackbar for immediate feedback
    this.showSnackBar(message, action || 'OK', 3000, false);
  }
  
  /**
   * Enhanced warning message display using global state notifications
   * 
   * @param message - Warning message to display
   * @param action - Optional action button text
   */
  private showWarningMessage(message: string, action?: string): void {
    // Add to global state notifications
    this.globalStateService.addNotification({
      type: 'warning',
      title: 'Warnung',
      message,
      autoClose: true,
      duration: 4000
    });
    
    // Also show snackbar for immediate feedback
    this.showSnackBar(message, action || 'OK', 4000, false);
  }
  
  /**
   * Enhanced info message display using global state notifications
   * 
   * @param message - Info message to display
   * @param action - Optional action button text
   */
  private showInfoMessage(message: string, action?: string): void {
    // Add to global state notifications
    this.globalStateService.addNotification({
      type: 'info',
      title: 'Information',
      message,
      autoClose: true,
      duration: 3000
    });
    
    // Also show snackbar for immediate feedback
    this.showSnackBar(message, action || 'OK', 3000, false);
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
    console.log('🧩 Navigating to submission:', { submissionId, categoryId });
    
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
   * @returns Observable<any> The current rating
   */
  getCurrentRating(categoryId: number): Observable<any> {
    // This would need to be implemented in the state service
    // For now, return null to prevent template errors
    return this.stateService.getCurrentRating(categoryId);
  }

  // Vote limits are now handled reactively in the viewModel$

  /**
   * Navigiert zum Dashboard, wenn keine Abgabe verfügbar ist.
   */
  onNavigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
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
      console.log('🔄 Closing existing SnackBar');
      this.currentSnackBarRef.dismiss();
    }

    // Open new SnackBar with explicit reference
    console.log('📢 Opening SnackBar:', { message, action, duration, isError });
    this.currentSnackBarRef = this.snackBar.open(message, action, {
      duration: duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar'],
    });

    // Explicit action handler
    this.currentSnackBarRef.onAction().subscribe(() => {
      console.log('🔘 SnackBar action clicked');
      this.currentSnackBarRef = null;
    });

    // Auto-dismiss handler
    this.currentSnackBarRef.afterDismissed().subscribe(() => {
      console.log('📴 SnackBar dismissed');
      this.currentSnackBarRef = null;
    });
  }

  // =============================================================================
  // MOCK MODE FUNCTIONALITY
  // =============================================================================

  /**
   * Loads mock data for demonstration mode when no submissionId is provided
   */
  private loadMockData(): void {
    console.log('🎭 Loading mock data for demo mode...');

    // Manually populate state subjects with mock data
    this.stateService['submissionSubject'].next(this.createMockSubmission());
    this.stateService['categoriesSubject'].next(this.createMockCategories());
    this.stateService['commentStatsSubject'].next(this.createMockCommentStats());
    this.stateService['anonymousUserSubject'].next(this.createMockAnonymousUser());
    this.stateService['voteLimitsSubject'].next(this.createMockVoteLimits());

    // Initialize mock discussions for each category
    this.createMockCategories().forEach(category => {
      const discussions = this.createMockDiscussions(category.id);
      const subject = new BehaviorSubject<EvaluationDiscussionDTO[]>(discussions);
      this.stateService['discussionCache'].set(category.id, subject);
    });

    // Set mock mode flag
    this.stateService['isMockModeActive'] = true;

    console.log('✅ Mock data loaded successfully');
  }

  private createMockSubmission(): EvaluationSubmissionDTO {
    return {
      id: 'demo-submission-001',
      title: 'Entwurf "Stabile Rahmenkonstruktion"',
      description: 'CAD-Entwurf einer tragfähigen Rahmenkonstruktion für industrielle Anwendungen',
      authorId: 1,
      pdfFileId: 1,
      sessionId: 1,
      status: EvaluationStatus.IN_REVIEW,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-01-15T10:00:00Z'),
      createdAt: new Date('2024-01-15T09:30:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),

      author: {
        id: 1,
        firstname: 'Student A',
        lastname: '(anonymisiert)',
        email: 'anonymized@example.com',
        globalRole: 'STUDENT' as any,
      },

      pdfFile: {
        id: 1,
        name: 'rahmenkonstruktion.pdf',
        uniqueIdentifier: 'rahmenkonstruktion.pdf',
        type: 'pdf',
        path: 'assets/demo-rahmenkonstruktion.pdf',
      },

      session: {
        id: 1,
        title: 'CAD Konstruktionsaufgabe - Tragwerke',
        description: 'Bewertung von CAD-Entwürfen für Rahmenkonstruktionen',
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-25T23:59:59Z'),
        moduleId: 1,
        phase: EvaluationPhase.DISCUSSION,
        isActive: true,
        isAnonymous: true,
      },

      pdfMetadata: {
        pageCount: 8,
        fileSize: 2450000,
        downloadUrl: '/assets/demo-rahmenkonstruktion.pdf',
      },

      _count: {
        discussions: 4,
        ratings: 0,
      },
    };
  }

  private createMockCategories(): EvaluationCategoryDTO[] {
    return [
      {
        id: 1,
        name: 'vollstaendigkeit',
        displayName: 'Vollständigkeit',
        description: 'Bewertung der Vollständigkeit der Lösung',
        icon: 'check_circle',
        order: 1,
        color: '#4CAF50',
      },
      {
        id: 2,
        name: 'grafische_darstellung',
        displayName: 'Grafische Darstellungsqualität',
        description: 'Bewertung der grafischen Darstellungsqualität',
        icon: 'palette',
        order: 2,
        color: '#2196F3',
      },
      {
        id: 3,
        name: 'vergleichbarkeit',
        displayName: 'Vergleichbarkeit',
        description: 'Bewertung der Vergleichbarkeit der Lösung',
        icon: 'compare',
        order: 3,
        color: '#FF9800',
      },
      {
        id: 4,
        name: 'komplexitaet',
        displayName: 'Komplexität',
        description: 'Bewertung der Komplexität der Lösung',
        icon: 'settings',
        order: 4,
        color: '#9C27B0',
      },
    ];
  }

  private createMockDiscussions(categoryId: number): EvaluationDiscussionDTO[] {
    const comments = this.createMockComments(categoryId);
    return [
      {
        id: `discussion-${categoryId}-001`,
        submissionId: 'demo-submission-001',
        categoryId: categoryId,
        comments: comments,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        totalComments: comments.length,
        availableComments: 3,
        usedComments: Math.min(comments.length, 3),
      },
    ];
  }

  private createMockComments(categoryId: number): EvaluationCommentDTO[] {
    const commentSets: { [key: number]: EvaluationCommentDTO[] } = {
      1: [
        {
          id: 'comment-001',
          submissionId: 'demo-submission-001',
          categoryId: 1,
          authorId: 2,
          content:
            'Die Konstruktion wirkt sehr durchdacht. Alle wesentlichen Bauteile sind klar erkennbar und sinnvoll dimensioniert.',
          createdAt: new Date('2024-01-15T11:30:00Z'),
          updatedAt: new Date('2024-01-15T11:30:00Z'),
          author: {
            id: 'anon-2',
            type: 'anonymous',
            displayName: 'Teilnehmer B',
            colorCode: '#2196F3',
          },
          votes: [],
          voteStats: { upVotes: 2, downVotes: 0, totalVotes: 2, score: 2 },
          replies: [],
          replyCount: 0,
        },
        {
          id: 'comment-002',
          submissionId: 'demo-submission-001',
          categoryId: 1,
          authorId: 3,
          content:
            'Mir fehlen einige Details bei den Verbindungselementen. Wie sollen die Träger miteinander verbunden werden?',
          createdAt: new Date('2024-01-15T12:15:00Z'),
          updatedAt: new Date('2024-01-15T12:15:00Z'),
          author: {
            id: 'anon-3',
            type: 'anonymous',
            displayName: 'Teilnehmer C',
            colorCode: '#FF9800',
          },
          votes: [],
          voteStats: { upVotes: 1, downVotes: 0, totalVotes: 1, score: 1 },
          replies: [],
          replyCount: 0,
        },
      ],
      2: [
        {
          id: 'comment-003',
          submissionId: 'demo-submission-001',
          categoryId: 2,
          authorId: 2,
          content:
            'Sehr saubere technische Zeichnung! Die Bemaßung ist vollständig und korrekt dargestellt.',
          createdAt: new Date('2024-01-15T11:45:00Z'),
          updatedAt: new Date('2024-01-15T11:45:00Z'),
          author: {
            id: 'anon-2',
            type: 'anonymous',
            displayName: 'Teilnehmer B',
            colorCode: '#2196F3',
          },
          votes: [],
          voteStats: { upVotes: 1, downVotes: 0, totalVotes: 1, score: 1 },
          replies: [],
          replyCount: 0,
        },
      ],
      3: [
        {
          id: 'comment-004',
          submissionId: 'demo-submission-001',
          categoryId: 3,
          authorId: 3,
          content:
            'Standardisierte CAD-Symbole verwendet - das ist gut für Vergleiche mit anderen Entwürfen.',
          createdAt: new Date('2024-01-15T13:15:00Z'),
          updatedAt: new Date('2024-01-15T13:15:00Z'),
          author: {
            id: 'anon-3',
            type: 'anonymous',
            displayName: 'Teilnehmer C',
            colorCode: '#FF9800',
          },
          votes: [],
          voteStats: { upVotes: 2, downVotes: 0, totalVotes: 2, score: 2 },
          replies: [],
          replyCount: 0,
        },
      ],
      4: [
        {
          id: 'comment-005',
          submissionId: 'demo-submission-001',
          categoryId: 4,
          authorId: 4,
          content:
            'Angemessene Komplexität für die Aufgabenstellung. Die Lösung ist nicht übertrieben komplex.',
          createdAt: new Date('2024-01-15T14:00:00Z'),
          updatedAt: new Date('2024-01-15T14:00:00Z'),
          author: {
            id: 'anon-4',
            type: 'anonymous',
            displayName: 'Teilnehmer D',
            colorCode: '#9C27B0',
          },
          votes: [],
          voteStats: { upVotes: 0, downVotes: 0, totalVotes: 0, score: 0 },
          replies: [],
          replyCount: 0,
        },
      ],
    };

    return commentSets[categoryId] || [];
  }

  private createMockCommentStats(): CommentStatsDTO {
    const categories = this.createMockCategories();
    const categoryStats = categories.map(cat => ({
      categoryId: cat.id,
      categoryName: cat.displayName,
      availableComments: 2,
      usedComments: 1,
      isLimitReached: false,
      indicatorColor: 'success' as const,
      availabilityText: '2/3 verfügbar',
      availabilityIcon: 'add' as const,
    }));

    return {
      submissionId: 'demo-submission-001',
      totalAvailable: 8,
      totalUsed: 4,
      categories: categoryStats,
      overallProgress: 50,
      averageUsage: 1,
      userLimits: {
        userId: 999,
        totalLimit: 12,
        totalUsed: 4,
        canComment: true,
      },
    };
  }

  private createMockAnonymousUser(): AnonymousEvaluationUserDTO {
    return {
      id: 999,
      userId: 999,
      submissionId: 'demo-submission-001',
      displayName: 'Sie (Demo-Modus)',
      colorCode: '#4CAF50',
      createdAt: new Date('2024-01-15T10:00:00Z'),
    };
  }

  private createMockVoteLimits(): Map<number, { plusVotes: number; minusVotes: number }> {
    return new Map([
      [1, { plusVotes: 2, minusVotes: 3 }],
      [2, { plusVotes: 3, minusVotes: 2 }],
      [3, { plusVotes: 1, minusVotes: 3 }],
      [4, { plusVotes: 3, minusVotes: 1 }],
    ]);
  }

  /**
   * Check if component is in mock mode
   * Mock mode is active only when submissionId is null (for /forum route)
   */
  isMockMode(): boolean {
    return this.submissionId === null;
  }

  /**
   * Updates the mock discussion cache with a new comment for immediate UI update
   */
  private updateMockDiscussionCache(comment: EvaluationCommentDTO): void {
    const categoryId = comment.categoryId;
    if (!categoryId) return;

    const discussionCache = this.stateService['discussionCache'];
    const subject = discussionCache.get(categoryId);

    if (subject) {
      const currentDiscussions = subject.value;
      const updatedDiscussions = [...currentDiscussions];

      // Find the discussion for this category
      let discussion = updatedDiscussions.find(d => d.categoryId === categoryId);
      if (!discussion) {
        // Create new discussion if not exists
        discussion = {
          id: `discussion-${categoryId}-001`,
          submissionId: 'demo-submission-001',
          categoryId: categoryId,
          comments: [],
          createdAt: new Date(),
          totalComments: 0,
          availableComments: 3,
          usedComments: 0,
        };
        updatedDiscussions.push(discussion);
      }

      // Add the new comment to the beginning
      discussion.comments = [comment, ...discussion.comments];
      discussion.totalComments = discussion.comments.length;
      discussion.usedComments = Math.min(discussion.comments.length, 3);

      // Update the subject to trigger UI update
      subject.next(updatedDiscussions);

      console.log(
        '📝 Updated discussion cache for category',
        categoryId,
        'with new comment. Total comments:',
        discussion.totalComments,
      );
    }
  }
}
