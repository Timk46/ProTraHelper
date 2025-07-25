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
import { Observable, Subject, combineLatest, BehaviorSubject, of } from 'rxjs';
import { takeUntil, map, filter, switchMap, take, startWith, debounceTime } from 'rxjs/operators';

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

// Child Components
import { CategoryTabsComponent } from '../components/category-tabs/category-tabs.component';
import { PdfViewerPanelComponent } from '../components/pdf-viewer-panel/pdf-viewer-panel.component';
import { DiscussionThreadComponent } from '../components/discussion-thread/discussion-thread.component';
import { PhaseToggleComponent } from '../components/phase-toggle/phase-toggle.component';
import { ErrorFallbackComponent } from '../components/error-fallback/error-fallback.component';
import { RatingSliderComponent } from '../components/rating-slider/rating-slider.component';

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
    ErrorFallbackComponent,
  ],
  templateUrl: './evaluation-discussion-forum.component.html',
  styleUrl: './evaluation-discussion-forum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationDiscussionForumComponent implements OnInit, OnDestroy {
  // =============================================================================
  // TEMPLATE UTILITIES
  // =============================================================================

  protected readonly EvaluationPhase = EvaluationPhase;

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

  private destroy$ = new Subject<void>();
  private submissionId: string | null = null;

  // Mock data for testing
  currentCategoryIndex = 0;

  // Mock data observables - REMOVED: Using real services now

  // Loading state management
  private isSubmittingComment$ = new BehaviorSubject<boolean>(false);

  // Event handling with debouncing
  private commentSubmissionQueue$ = new Subject<string>();
  private lastSubmittedContent: string | null = null;

  // Message input state (for action area)
  currentMessageText: string = '';

  // SnackBar reference management
  private currentSnackBarRef: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluationService: EvaluationDiscussionService,
    private stateService: EvaluationStateService,
    private mockDataService: EvaluationMockDataService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {
    // FIXED: Using real services instead of mock data
    this.initializeObservableStreams();
  }

  ngOnInit(): void {
    this.handleRouteParams();
    this.handleErrorNotifications();
    this.loadInitialData();
    this.setupEventHandling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // REMOVED: initializeMockStreams() - using real services now

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
      map(phase => phase === EvaluationPhase.DISCUSSION),
    );

    this.isEvaluationPhase$ = this.currentPhase$.pipe(
      map(phase => phase === EvaluationPhase.EVALUATION),
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
        },
      ),
    );
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

    // Trigger change detection to update UI
    this.cdr.markForCheck();
  }

  onCommentSubmitted(content: string): void {
    // Queue the comment for debounced processing
    this.commentSubmissionQueue$.next(content.trim());
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

    this.activeCategory$.pipe(take(1)).subscribe(categoryId => {
      if (!categoryId) {
        console.error('❌ No active category for voting');
        this.showSnackBar('Fehler: Keine aktive Kategorie', 'Schließen', 3000, true);
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

            // Use robust SnackBar method
            this.showSnackBar(`Kommentar ${action}`, 'OK', 2000, false);

            // Trigger change detection
            this.cdr.markForCheck();
          },
          error: error => {
            console.error('❌ Vote failed:', error);
            const message = error.message || 'Fehler beim Bewerten des Kommentars';
            // Use robust SnackBar method for error
            this.showSnackBar(message, 'Schließen', 5000, true);
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
      id: 1,
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
