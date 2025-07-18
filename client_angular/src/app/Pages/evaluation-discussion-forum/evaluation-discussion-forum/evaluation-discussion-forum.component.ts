import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, filter, switchMap } from 'rxjs/operators';

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

// DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  EvaluationPhase,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  RatingStatsDTO
} from '@dtos';

// Services
import { EvaluationDiscussionService } from '../services/evaluation-discussion.service';
import { EvaluationStateService } from '../services/evaluation-state.service';

// Child Components
import { CategoryTabsComponent } from '../components/category-tabs/category-tabs.component';
import { PdfViewerPanelComponent } from '../components/pdf-viewer-panel/pdf-viewer-panel.component';
import { DiscussionThreadComponent } from '../components/discussion-thread/discussion-thread.component';
import { PhaseToggleComponent } from '../components/phase-toggle/phase-toggle.component';

@Component({
  selector: 'app-evaluation-discussion-forum',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    CategoryTabsComponent,
    PdfViewerPanelComponent,
    DiscussionThreadComponent,
    PhaseToggleComponent
  ],
  templateUrl: './evaluation-discussion-forum.component.html',
  styleUrl: './evaluation-discussion-forum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationDiscussionForumComponent implements OnInit, OnDestroy {
  
  // =============================================================================
  // COMPONENT STATE - REACTIVE STREAMS
  // =============================================================================
  
  // Core data streams
  submission$: Observable<EvaluationSubmissionDTO | null>;
  categories$: Observable<EvaluationCategoryDTO[]>;
  activeCategory$: Observable<string>;
  activeCategoryInfo$: Observable<EvaluationCategoryDTO | null>;
  discussions$: Observable<EvaluationDiscussionDTO[]>;
  commentStats$: Observable<CommentStatsDTO | null>;
  anonymousUser$: Observable<AnonymousEvaluationUserDTO | null>;
  currentPhase$: Observable<EvaluationPhase | null>;
  
  // UI state streams
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Derived state streams
  isDiscussionPhase$: Observable<boolean>;
  isEvaluationPhase$: Observable<boolean>;
  canComment$: Observable<boolean>;
  canRate$: Observable<boolean>;
  
  // View model combination
  viewModel$: Observable<{
    submission: EvaluationSubmissionDTO | null;
    categories: EvaluationCategoryDTO[];
    activeCategory: string;
    activeCategoryInfo: EvaluationCategoryDTO | null;
    discussions: EvaluationDiscussionDTO[];
    commentStats: CommentStatsDTO | null;
    anonymousUser: AnonymousEvaluationUserDTO | null;
    currentPhase: EvaluationPhase | null;
    isDiscussionPhase: boolean;
    isEvaluationPhase: boolean;
    canComment: boolean;
    canRate: boolean;
    loading: boolean;
    error: string | null;
  }>;

  // =============================================================================
  // COMPONENT LIFECYCLE
  // =============================================================================
  
  private destroy$ = new Subject<void>();
  private submissionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private evaluationService: EvaluationDiscussionService,
    private stateService: EvaluationStateService,
    private snackBar: MatSnackBar
  ) {
    this.initializeObservableStreams();
  }

  ngOnInit(): void {
    this.handleRouteParams();
    this.handleErrorNotifications();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  private initializeObservableStreams(): void {
    // Core state streams from service
    this.submission$ = this.stateService.submission$;
    this.categories$ = this.stateService.categories$;
    this.activeCategory$ = this.stateService.activeCategory$;
    this.activeCategoryInfo$ = this.stateService.activeCategoryInfo$;
    this.discussions$ = this.stateService.activeDiscussions$;
    this.commentStats$ = this.stateService.commentStats$;
    this.anonymousUser$ = this.stateService.anonymousUser$;
    this.currentPhase$ = this.stateService.currentPhase$;
    this.loading$ = this.stateService.loading$;
    this.error$ = this.stateService.error$;

    // Derived streams
    this.isDiscussionPhase$ = this.currentPhase$.pipe(
      map(phase => phase === EvaluationPhase.DISCUSSION)
    );
    
    this.isEvaluationPhase$ = this.currentPhase$.pipe(
      map(phase => phase === EvaluationPhase.EVALUATION)
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
      this.error$
    ]).pipe(
      map(([
        submission, categories, activeCategory, activeCategoryInfo,
        discussions, commentStats, anonymousUser, currentPhase,
        isDiscussionPhase, isEvaluationPhase, canComment, canRate,
        loading, error
      ]) => ({
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
        error
      }))
    );
  }

  private handleRouteParams(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      map(params => params.get('submissionId')),
      filter(submissionId => submissionId !== null)
    ).subscribe(submissionId => {
      this.submissionId = submissionId;
      if (submissionId) {
        this.stateService.loadSubmission(submissionId);
      }
    });
  }

  private handleErrorNotifications(): void {
    this.error$.pipe(
      takeUntil(this.destroy$),
      filter(error => error !== null)
    ).subscribe(error => {
      if (error) {
        this.snackBar.open(error, 'Schließen', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  private loadInitialData(): void {
    this.stateService.loadCategories();
  }

  // =============================================================================
  // EVENT HANDLERS - USER INTERACTIONS
  // =============================================================================
  
  onCategorySelected(categoryId: string): void {
    this.stateService.setActiveCategory(categoryId);
  }

  onCommentSubmitted(content: string): void {
    if (!this.submissionId) return;
    
    const activeCategory = this.stateService.activeCategory$.value;
    
    this.stateService.addComment(this.submissionId, activeCategory, content).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (comment) => {
        this.snackBar.open('Kommentar wurde erfolgreich hinzugefügt', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: (error) => {
        this.snackBar.open('Fehler beim Hinzufügen des Kommentars', 'Schließen', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  onCommentVoted(data: { commentId: string; voteType: 'UP' | 'DOWN' | null }): void {
    this.stateService.voteComment(data.commentId, data.voteType).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Vote success is handled automatically by state service
      },
      error: (error) => {
        this.snackBar.open('Fehler beim Abstimmen', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  onRatingSubmitted(data: { categoryId: string; score: number }): void {
    if (!this.submissionId) return;
    
    this.stateService.submitRating(this.submissionId, data.categoryId, data.score).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (rating) => {
        this.snackBar.open('Bewertung wurde erfolgreich abgegeben', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: (error) => {
        this.snackBar.open('Fehler beim Abgeben der Bewertung', 'Schließen', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  onPhaseToggled(targetPhase: EvaluationPhase): void {
    if (!this.submissionId) return;
    
    this.stateService.switchPhase(this.submissionId, targetPhase).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        const phaseName = targetPhase === EvaluationPhase.DISCUSSION ? 'Diskussion' : 'Bewertung';
        this.snackBar.open(`Phase wurde zu ${phaseName} gewechselt`, 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: (error) => {
        this.snackBar.open('Fehler beim Wechseln der Phase', 'Schließen', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
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

  getRatingStats(categoryId: string): Observable<RatingStatsDTO> {
    if (!this.submissionId) {
      throw new Error('No submission ID available');
    }
    return this.stateService.getRatingStats(this.submissionId, categoryId);
  }

  // =============================================================================
  // TRACK BY FUNCTIONS FOR PERFORMANCE
  // =============================================================================
  
  trackByCategory(index: number, category: EvaluationCategoryDTO): string {
    return category.id;
  }

  trackByDiscussion(index: number, discussion: EvaluationDiscussionDTO): string {
    return discussion.id;
  }

  trackByComment(index: number, comment: EvaluationCommentDTO): string {
    return comment.id;
  }
}
