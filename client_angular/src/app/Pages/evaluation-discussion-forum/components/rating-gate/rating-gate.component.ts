import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { RatingSliderComponent } from '../rating-slider/rating-slider.component';
import { DiscussionThreadComponent } from '../discussion-thread/discussion-thread.component';
import { EvaluationDiscussionService } from '../../../../Services/evaluation/evaluation-discussion.service';
import { EvaluationStateService } from '../../../../Services/evaluation/evaluation-state.service';
import { CategoryRatingStatus, EvaluationCategoryDTO, EvaluationSubmissionDTO, AnonymousEvaluationUserDTO, EvaluationDiscussionDTO } from '@DTOs/index';
import { BaseComponent } from '../../../../shared/base.component';

/**
 * Interface for rating gate view model
 * 
 * @description Represents the complete state needed for the rating gate component
 * to determine whether to show rating slider or discussion content
 */
interface RatingGateViewModel {
  hasRated: boolean;
  isLoading: boolean;
  error: string | null;
  ratingStatus: CategoryRatingStatus | null;
  canAccessDiscussion: boolean;
  requiresRating: boolean;
}

/**
 * Rating Gate Component
 * 
 * @description This component acts as an access control gate for discussion areas.
 * Users must first rate a category before they can access its discussion content.
 * The component shows either a rating slider (for unrated categories) or 
 * discussion thread (for rated categories).
 * 
 * @Component rating-gate
 */
@Component({
  selector: 'app-rating-gate',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RatingSliderComponent,
    DiscussionThreadComponent,
  ],
  template: `
    <div class="rating-gate-container" *ngIf="viewModel$ | async as vm">
      
      <!-- Loading State -->
      <div class="loading-state" *ngIf="vm.isLoading">
        <mat-spinner diameter="32"></mat-spinner>
        <p>Überprüfe Bewertungsstatus...</p>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="vm.error && !vm.isLoading">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h3>Fehler beim Laden</h3>
        <p>{{ vm.error }}</p>
        <button mat-raised-button color="primary" (click)="onRetry()">
          <mat-icon>refresh</mat-icon>
          Erneut versuchen
        </button>
      </div>

      <!-- Rating Required State -->
      <div class="rating-required-state" *ngIf="!vm.isLoading && !vm.error && vm.requiresRating && !vm.hasRated">
        
        <!-- Access Blocked Header -->
        <mat-card class="access-blocked-card">
          <mat-card-header>
            <mat-icon class="lock-icon">lock</mat-icon>
            <mat-card-title>Bewertung erforderlich</mat-card-title>
            <mat-card-subtitle>
              Sie müssen diese Kategorie zuerst bewerten, um Zugang zur Diskussion zu erhalten
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="category-info">
              <h4>{{ currentCategory.displayName }}</h4>
              <p class="category-description" *ngIf="currentCategory?.description">
                {{ currentCategory.description }}
              </p>
            </div>

            <!-- Instructions -->
            <div class="instructions">
              <div class="instruction-item">
                <mat-icon class="step-icon">looks_one</mat-icon>
                <span>Bewerten Sie die Kategorie mit dem Slider unten (0-10 Punkte)</span>
              </div>
              <div class="instruction-item">
                <mat-icon class="step-icon">looks_two</mat-icon>
                <span>Nach der Bewertung wird der Diskussionsbereich freigeschaltet</span>
              </div>
              <div class="instruction-item">
                <mat-icon class="step-icon">looks_3</mat-icon>
                <span>Sie können dann Kommentare lesen und eigene Beiträge verfassen</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Rating Slider -->
        <div class="rating-slider-section">
          <app-rating-slider
            [categoryId]="currentCategory.id"
            [categoryName]="currentCategory.displayName"
            [disabled]="false"
            (ratingSubmitted)="onRatingSubmitted($event)"
          >
          </app-rating-slider>
        </div>

      </div>

      <!-- Discussion Access Granted State -->
      <div class="discussion-access-granted" *ngIf="!vm.isLoading && !vm.error && vm.hasRated && vm.canAccessDiscussion">
        
        <!-- Access Status Header -->
        <div class="access-granted-header">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <span class="access-text">
            Diskussion freigeschaltet durch Ihre Bewertung
            <span class="rating-value" *ngIf="vm.ratingStatus?.rating !== null">
              ({{ vm.ratingStatus?.rating }}/10 Punkte)
            </span>
          </span>
        </div>

        <!-- Discussion Content -->
        <div class="discussion-content">
          <app-discussion-thread
            [discussions]="discussions"
            [anonymousUser]="anonymousUser"
            [canComment]="canComment"
            [canVote]="canVote"
            [availableUpvotes]="availableUpvotes"
            [availableDownvotes]="availableDownvotes"
            [isReadOnly]="isReadOnly"
            [isSubmittingComment]="isSubmittingComment"
            [isVotingComment]="isVotingComment"
            [trackByFn]="trackByDiscussion"
            (commentSubmitted)="onCommentSubmitted($event)"
            (commentVoted)="onCommentVoted($event)"
            (replySubmitted)="onReplySubmitted($event)"
          >
          </app-discussion-thread>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .rating-gate-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1rem;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      text-align: center;
    }

    .error-icon {
      font-size: 3rem;
      color: #f44336;
    }

    .access-blocked-card {
      margin-bottom: 1.5rem;
    }

    .lock-icon {
      color: #ff9800;
      font-size: 1.5rem;
      margin-right: 0.5rem;
    }

    .category-info {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .category-info h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .category-description {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .instructions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .instruction-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .step-icon {
      color: #2196f3;
      background: #e3f2fd;
      border-radius: 50%;
      padding: 0.25rem;
    }

    .rating-slider-section {
      margin-top: 1rem;
    }

    .access-granted-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #e8f5e8;
      border-radius: 8px;
      border-left: 4px solid #4caf50;
      margin-bottom: 1.5rem;
    }

    .success-icon {
      color: #4caf50;
      font-size: 1.5rem;
    }

    .access-text {
      font-weight: 500;
      color: #2e7d32;
    }

    .rating-value {
      font-weight: 600;
      color: #1976d2;
    }

    .discussion-content {
      background: #fff;
      border-radius: 8px;
      min-height: 400px;
    }

    @media (max-width: 768px) {
      .rating-gate-container {
        padding: 0.5rem;
      }
      
      .instruction-item {
        flex-direction: column;
        text-align: center;
        gap: 0.5rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingGateComponent extends BaseComponent implements OnInit, OnDestroy, OnChanges {
  
  /**
   * The submission ID being evaluated
   */
  @Input() submissionId!: string;

  /**
   * The current category being viewed
   */
  @Input() currentCategory!: EvaluationCategoryDTO;

  /**
   * Discussion data for the current category
   */
  @Input() discussions: EvaluationDiscussionDTO[] = [];

  /**
   * Anonymous user data for discussion display
   */
  @Input() anonymousUser: AnonymousEvaluationUserDTO | null = null;

  /**
   * Whether the user can submit comments
   */
  @Input() canComment: boolean = false;

  /**
   * Whether the user can vote on comments
   */
  @Input() canVote: boolean = false;

  /**
   * Number of available upvotes
   */
  @Input() availableUpvotes: number = 0;

  /**
   * Number of available downvotes
   */
  @Input() availableDownvotes: number = 0;

  /**
   * Whether the discussion is read-only
   */
  @Input() isReadOnly: boolean = false;

  /**
   * Whether a comment is being submitted
   */
  @Input() isSubmittingComment: boolean = false;

  /**
   * Whether a comment is being voted on
   */
  @Input() isVotingComment: Map<string, boolean> = new Map();

  /**
   * Track by function for discussions
   */
  @Input() trackByDiscussion!: (index: number, item: EvaluationDiscussionDTO) => any;

  /**
   * Emitted when a rating is successfully submitted
   */
  @Output() ratingSubmitted = new EventEmitter<{categoryId: number; score: number}>();

  /**
   * Emitted when a comment is submitted
   */
  @Output() commentSubmitted = new EventEmitter<any>();

  /**
   * Emitted when a comment is voted on
   */
  @Output() commentVoted = new EventEmitter<any>();

  /**
   * Emitted when a reply is submitted
   */
  @Output() replySubmitted = new EventEmitter<any>();

  /**
   * Emitted when access is granted to discussions
   */
  @Output() accessGranted = new EventEmitter<{categoryId: number}>();

  // Component state - only keeping error subject for local error handling
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  /**
   * Observable view model for the component template
   */
  readonly viewModel$: Observable<RatingGateViewModel>;

  constructor(
    private readonly evaluationService: EvaluationDiscussionService,
    private readonly stateService: EvaluationStateService,
  ) {
    super();

    // Use centralized rating status instead of local API calls
    this.viewModel$ = combineLatest([
      this.stateService.activeCategory$,
      this.stateService.categoryRatingStatus$,
      this.stateService.ratingStatusLoading$,
      this.errorSubject.asObservable(),
    ]).pipe(
      map(([activeCategory, categoryStatusMap, isLoading, error]) => {
        // Get rating status for current category from centralized state
        const ratingStatus = this.currentCategory ? categoryStatusMap.get(this.currentCategory.id) : null;
        
        return {
          hasRated: ratingStatus?.hasRated || false,
          isLoading,
          error,
          ratingStatus,
          canAccessDiscussion: ratingStatus?.canAccessDiscussion || false,
          requiresRating: ratingStatus?.isRequired !== false, // Default to true if not specified
        };
      }),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Handles input property changes
   * 
   * @description Called whenever any input property changes.
   * Now uses centralized rating status, so no need to reload on category changes.
   * 
   * @param {SimpleChanges} changes - Object containing all input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Check if currentCategory has changed
    if (changes['currentCategory'] && !changes['currentCategory'].firstChange) {
      const previousCategory = changes['currentCategory'].previousValue;
      const currentCategory = changes['currentCategory'].currentValue;
      
      console.log('🔄 Rating gate category changed (using centralized state):', {
        previous: previousCategory?.id,
        current: currentCategory?.id,
        categoryName: currentCategory?.displayName
      });
      
      // No need to reload - viewModel$ will automatically update from centralized state
      // The rating status is now cached and persists across category switches
    }
    
    // Handle submissionId changes (though this should be rare)
    if (changes['submissionId'] && !changes['submissionId'].firstChange) {
      console.log('🔄 Rating gate submission changed:', {
        previous: changes['submissionId'].previousValue,
        current: changes['submissionId'].currentValue
      });
      
      // Ensure rating status is loaded for new submission (centralized)
      if (this.submissionId) {
        this.stateService.loadCategoryRatingStatus(this.submissionId);
      }
    }
  }

  /**
   * Component initialization
   * 
   * @description Now uses centralized rating status - no need for individual loading
   */
  ngOnInit(): void {
    // Rating status is now loaded centrally by the state service
    // The viewModel$ will automatically reflect the current status
    console.log('🎯 Rating gate initialized - using centralized rating status');
  }

  /**
   * REMOVED: loadRatingStatus() and loadDetailedRatingStatus()
   * 
   * @description These methods are no longer needed because the component now
   * uses the centralized rating status from EvaluationStateService. The rating
   * status is loaded once and cached, persisting across category switches.
   * 
   * The viewModel$ observable automatically updates when the centralized
   * rating status changes, eliminating the need for component-specific loading.
   */

  /**
   * Handles rating submission
   * 
   * @description Called when the user submits a rating through the rating slider.
   * Now forwards to parent component which handles centralized state updates.
   * 
   * @param {any} ratingEvent - The rating event from the rating slider
   */
  onRatingSubmitted(ratingEvent: any): void {
    console.log('📊 Rating submitted in rating gate:', {
      categoryId: this.currentCategory.id,
      rating: ratingEvent.rating || ratingEvent.score
    });

    // Emit the rating submitted event to parent component
    // The parent will handle the centralized state update
    this.ratingSubmitted.emit({
      categoryId: this.currentCategory.id,
      score: ratingEvent.rating || ratingEvent.score
    });

    // Emit access granted event
    this.accessGranted.emit({
      categoryId: this.currentCategory.id
    });

    // Note: Local state update is no longer needed since we use centralized state
    // The viewModel$ will automatically update when the state service is updated
  }

  /**
   * Handles comment submission
   * 
   * @description Forwards comment submission events to the parent component
   * 
   * @param {any} commentEvent - The comment event from the discussion thread
   */
  onCommentSubmitted(commentEvent: any): void {
    this.commentSubmitted.emit(commentEvent);
  }

  /**
   * Handles comment voting
   * 
   * @description Forwards comment voting events to the parent component
   * 
   * @param {any} voteEvent - The vote event from the discussion thread
   */
  onCommentVoted(voteEvent: any): void {
    this.commentVoted.emit(voteEvent);
  }

  /**
   * Handles reply submission
   * 
   * @description Forwards reply submission events to the parent component
   * 
   * @param {any} replyEvent - The reply event from the discussion thread
   */
  onReplySubmitted(replyEvent: any): void {
    this.replySubmitted.emit(replyEvent);
  }

  /**
   * Handles retry button click
   * 
   * @description Refreshes the rating status from centralized state service
   */
  onRetry(): void {
    if (this.submissionId) {
      console.log('🔄 Retrying rating status load from centralized service');
      this.stateService.refreshRatingStatus(this.submissionId);
      this.errorSubject.next(null); // Clear local error state
    }
  }
}