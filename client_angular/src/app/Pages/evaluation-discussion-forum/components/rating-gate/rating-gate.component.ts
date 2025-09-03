import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, tap, filter, take } from 'rxjs/operators';

import { RatingSliderComponent } from '../rating-slider/rating-slider.component';
import { DiscussionThreadComponent } from '../discussion-thread/discussion-thread.component';
import { CommentInputComponent } from '../comment-input/comment-input.component';
import { EvaluationDiscussionService } from '../../../../Services/evaluation/evaluation-discussion.service';
import { EvaluationStateService } from '../../../../Services/evaluation/evaluation-state.service';
import {
  CategoryRatingStatus,
  EvaluationCategoryDTO,
  EvaluationSubmissionDTO,
  AnonymousEvaluationUserDTO,
  EvaluationDiscussionDTO,
  VoteLimitStatusDTO,
  EvaluationRatingDTO,
} from '@DTOs/index';
import { BaseComponent } from '../../../../shared/base.component';
import { VotingMechanismDialogComponent } from '../voting-mechanism-dialog/voting-mechanism-dialog.component';

/**
 * Interface for rating gate view model
 *
 * @description Represents the complete state needed for the rating gate component
 * to determine whether to show comment input, discussion content, or rating slider
 */
interface RatingGateViewModel {
  hasCommented: boolean;
  hasRated: boolean;
  isLoading: boolean;
  error: string | null;
  ratingStatus: CategoryRatingStatus | null;
  canAccessDiscussion: boolean;
  requiresInitialComment: boolean;
  showRatingSlider: boolean;
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
    MatDialogModule,
    MatTooltipModule,
    MatExpansionModule,
    RatingSliderComponent,
    DiscussionThreadComponent,
    CommentInputComponent,
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

      <!-- Initial Comment Required State -->
      <div class="initial-comment-required" *ngIf="!vm.isLoading && !vm.error && vm.requiresInitialComment">
        
        <!-- Main Panel: "Schriftliche Bewertung erforderlich" -->
        <mat-expansion-panel 
          [(expanded)]="mainPanelExpanded"
          (expandedChange)="onMainPanelExpansionChange($event)"
          class="required-evaluation-panel">
          
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon class="panel-icon">edit</mat-icon>
              Schriftliche Bewertung erforderlich
            </mat-panel-title>
            <mat-panel-description>
              Sie müssen zuerst einen Kommentar verfassen, um die anderen Diskussionsbeiträge zu sehen
            </mat-panel-description>
          </mat-expansion-panel-header>

          <div class="main-panel-content">
            
            <!-- Category Information -->
            <div class="category-info">
              <h4>{{ currentCategory.displayName }}</h4>
              <p class="category-description">{{ currentCategory.description || 'Angemessene Komplexität der Konstruktionslösung' }}</p>
            </div>
            
            <!-- Instructions Panel -->
            <mat-expansion-panel
              [(expanded)]="instructionsExpanded"
              (expandedChange)="onExpansionChange($event)"
              class="instructions-panel">

              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="instruction-icon">assignment</mat-icon>
                  Anweisungen
                </mat-panel-title>
                <mat-panel-description>
                  Klicken Sie hier für detaillierte Schritte
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="instructions">
                <div class="instruction-list">
                  <div class="instruction-item">
                    <mat-icon class="instruction-bullet">analytics</mat-icon>
                    <span>Analysieren Sie die vorgeschlagene Konstruktionslösung objektiv</span>
                  </div>
                  <div class="instruction-item">
                    <mat-icon class="instruction-bullet">architecture</mat-icon>
                    <span>Bewerten Sie die Angemessenheit der Komplexität im Kontext</span>
                  </div>
                  <div class="instruction-item">
                    <mat-icon class="instruction-bullet">speed</mat-icon>
                    <span>Berücksichtigen Sie Effizienz und Ressourcennutzung</span>
                  </div>
                  <div class="instruction-item">
                    <mat-icon class="instruction-bullet">feedback</mat-icon>
                    <span>Geben Sie konstruktives Feedback zur Optimierung</span>
                  </div>
                  <div class="instruction-item">
                    <mat-icon class="instruction-bullet">text_fields</mat-icon>
                    <span>Nutzen Sie mindestens 10 Zeichen für eine aussagekräftige Bewertung</span>
                  </div>
                </div>
              </div>
            </mat-expansion-panel>

            <!-- Comment Input Panel -->
            <mat-expansion-panel
              [(expanded)]="commentInputExpanded"
              (expandedChange)="onCommentInputExpansionChange($event)"
              class="comment-input-panel">

              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="comment-input-icon">edit</mat-icon>
                  Ihre schriftliche Bewertung
                </mat-panel-title>
                <mat-panel-description>
                  Klicken Sie hier zum Verfassen Ihres Kommentars
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="comment-input-content">
                <app-comment-input
                  [placeholder]="'Beschreiben Sie Ihre Bewertung für ' + currentCategory.displayName"
                  [isSubmitting]="isSubmittingComment"
                  [maxLength]="1000"
                  [minLength]="10"
                  [autofocus]="true"
                  [rows]="3"
                  [submitButtonText]="'Bewertung abschicken'"
                  (commentSubmitted)="onInitialCommentSubmitted($event)"
                >
                </app-comment-input>
              </div>
            </mat-expansion-panel>

          </div>
        </mat-expansion-panel>
      </div>

      <!-- Discussion Access Granted State -->
      <div
        class="discussion-access-granted"
        *ngIf="!vm.isLoading && !vm.error && vm.hasCommented && vm.canAccessDiscussion"
      >
        <!-- Access Status Header -->
        <div class="access-granted-header">
          <mat-icon class="success-icon">check_circle</mat-icon>
          <span class="access-text">
            Diskussion freigeschaltet durch Ihren Kommentar
            <span class="rating-value" *ngIf="vm.ratingStatus?.rating !== null">
              - Numerische Bewertung: {{ vm.ratingStatus?.rating }}/10 Punkte
            </span>
          </span>
        </div>

        <!-- Collapsible Vote Limit Panel -->
        <div class="available-ratings-panel" *ngIf="voteLimitDisplay$ | async as voteLimit"
             [class.expanded]="isRatingsExpanded">

          <!-- Compact Panel Header -->
          <div class="panel-header" (click)="toggleRatingsPanel()">
            <button
              mat-icon-button
              class="info-badge"
              (click)="openVoteExplanationDialog(); $event.stopPropagation()"
              matTooltip="💡 Wie funktioniert das Bewertungssystem? Klicken für Details!"
              matTooltipPosition="left"
              aria-label="Informationen zum Bewertungssystem anzeigen"
            >
              <mat-icon>help</mat-icon>
            </button>

            <span class="panel-title">Verfügbare Bewertungen</span>

            <span class="rating-count" [class.can-vote]="voteLimit.canVote" [class.no-votes]="!voteLimit.canVote">
              {{ voteLimit.display }}
            </span>

            <mat-icon class="expand-icon" [class.rotated]="isRatingsExpanded">
              expand_more
            </mat-icon>
          </div>

          <!-- Expandable Panel Content -->
          <div class="panel-content" *ngIf="isRatingsExpanded" [@slideToggle]="isRatingsExpanded">
            <div class="vote-stats">
              <div class="vote-count-display">
                <div class="vote-progress-container">
                  <div class="vote-progress-bar">
                    <div class="vote-progress-fill" [style.width.%]="voteLimit.percentage"></div>
                  </div>
                  <span class="vote-percentage">{{ voteLimit.percentage.toFixed(0) }}%</span>
                </div>
              </div>
              <div
                class="vote-status"
                [class.can-vote]="voteLimit.canVote"
                [class.no-votes]="!voteLimit.canVote"
              >
                <mat-icon>{{ voteLimit.canVote ? 'thumb_up' : 'block' }}</mat-icon>
                <span>{{
                  voteLimit.canVote ? 'Bewertungen verfügbar' : 'Keine Bewertungen verfügbar'
                }}</span>
              </div>
            </div>
          </div>
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

        <!-- Rating Slider Section (After Discussion) -->
        <div class="rating-slider-section" *ngIf="vm.showRatingSlider">
          <mat-card class="rating-slider-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>star_rate</mat-icon>
                Numerische Bewertung
              </mat-card-title>
              <mat-card-subtitle>
                Bewerten Sie "{{ currentCategory.displayName }}" mit 0-10 Punkten
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <app-rating-slider
                [categoryId]="currentCategory.id"
                [categoryName]="currentCategory.displayName"
                [currentRating]="convertRatingStatusToDTO(vm.ratingStatus)"
                [disabled]="false"
                (ratingSubmitted)="onRatingSubmitted($event)"
              >
              </app-rating-slider>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
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

      .edit-icon {
        color: #2196f3;
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

      .comment-input-card {
        border: 2px solid #2196f3;
        background: #f0f8ff;
      }

      .comment-input-card mat-card-header {
        background: #2196f3;
        color: white;
        margin: -16px -16px 16px -16px;
        padding: 16px;
        border-radius: 4px 4px 0 0;
      }

      .comment-input-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        margin: 0;
      }

      .comment-input-card mat-card-subtitle {
        color: rgba(255, 255, 255, 0.8);
        margin-top: 0.5rem;
      }

      .rating-slider-section {
        margin-top: 2rem;
      }

      .rating-slider-card {
        border: 2px solid #4caf50;
        background: #f8fff8;
      }

      .rating-slider-card mat-card-header {
        background: #4caf50;
        color: white;
        margin: -16px -16px 16px -16px;
        padding: 16px;
        border-radius: 4px 4px 0 0;
      }

      .rating-slider-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        margin: 0;
      }

      .rating-slider-card mat-card-subtitle {
        color: rgba(255, 255, 255, 0.8);
        margin-top: 0.5rem;
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

      // Available Ratings Panel Styles with Green Glow
      .available-ratings-panel {
        margin: 1rem 0;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        background: #fff;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;

        // Green pulsing glow effect when collapsed
        &:not(.expanded) {
          animation: greenPulseGlow 2s ease-in-out infinite;
          border-color: rgba(76, 175, 80, 0.3);
        }

        // When expanded, remove animation
        &.expanded {
          animation: none;
          border-color: #e0e0e0;

          .expand-icon {
            transform: rotate(180deg);
          }
        }

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      }

      // Green pulse glow keyframe animation
      @keyframes greenPulseGlow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(76, 175, 80, 0.4), 0 0 10px rgba(76, 175, 80, 0.2);
          border-color: rgba(76, 175, 80, 0.3);
        }
        50% {
          box-shadow: 0 0 15px rgba(76, 175, 80, 0.8), 0 0 25px rgba(76, 175, 80, 0.4);
          border-color: rgba(76, 175, 80, 0.6);
        }
      }

      .panel-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: #fafafa;
        border-bottom: 1px solid transparent;
        transition: all 0.3s ease;

        &:hover {
          background: #f5f5f5;
        }

        .available-ratings-panel.expanded & {
          border-bottom-color: #e0e0e0;
        }
      }

      .info-badge {
        margin-right: 12px;
        width: 36px;
        height: 36px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .panel-title {
        flex: 1;
        font-weight: 500;
        color: #333;
        font-size: 14px;
      }

      .rating-count {
        margin-right: 12px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 16px;
        font-size: 12px;
        transition: all 0.3s ease;

        &.can-vote {
          background: #e8f5e8;
          color: #2e7d32;
        }

        &.no-votes {
          background: #ffebee;
          color: #c62828;
        }
      }

      .expand-icon {
        transition: transform 0.3s ease;
        color: #666;

        &.rotated {
          transform: rotate(180deg);
        }
      }

      .panel-content {
        padding: 16px;
        background: #fff;

        .vote-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .vote-count-display {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .vote-progress-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .vote-progress-bar {
          flex: 1;
          height: 8px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .vote-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%);
          transition: width 0.3s ease;
        }

        .vote-percentage {
          font-weight: 600;
          font-size: 12px;
          color: #666;
          min-width: 40px;
          text-align: right;
        }

        .vote-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;

          &.can-vote {
            background: #e8f5e8;
            color: #2e7d32;
          }

          &.no-votes {
            background: #ffebee;
            color: #c62828;
          }

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }

      @media (max-width: 768px) {
        .rating-gate-container {
          padding: 0.5rem;
        }

        .available-ratings-panel {
          margin: 0.5rem 0;

          .panel-header {
            padding: 10px 12px;

            .panel-title {
              font-size: 13px;
            }

            .rating-count {
              font-size: 11px;
            }
          }

          .panel-content {
            padding: 12px;
          }
        }
      }

      // Required Evaluation Panel Styles (Main Panel)
      .required-evaluation-panel {
        margin-bottom: 1.5rem;
        border: 1px solid #bbdefb;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        background: #fff;
        transition: all 0.3s ease;

        // Blue glow effect when collapsed
        &:not(.mat-expanded) {
          animation: requiredEvaluationPulse 1.5s ease-in-out infinite;
          border-color: #2196f3;
        }

        // When expanded, remove the glow animation but keep blue border
        &.mat-expanded {
          animation: none;
          border-color: #2196f3;
        }

        .mat-expansion-panel-header {
          padding: 0 16px;
          height: 48px;
          background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
          transition: background 0.3s ease;
        }

        .panel-icon {
          color: #1976d2;
          margin-right: 12px;
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .mat-expansion-panel-header .mat-content {
          font-size: 0.9rem;
          overflow: hidden;
        }

        .mat-expansion-panel-header .mat-content .mat-expansion-panel-header-title {
          font-size: 0.95rem;
          font-weight: 500;
        }

        .mat-expansion-panel-header .mat-content .mat-expansion-panel-header-description {
          font-size: 0.85rem;
          margin-top: 2px;
        }

        .main-panel-content {
          padding: 16px;
        }
      }

      // Required Evaluation Panel Pulse Animation
      @keyframes requiredEvaluationPulse {
        0%, 100% {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 0 8px rgba(33, 150, 243, 0.4);
        }
        50% {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 0 25px rgba(33, 150, 243, 0.8);
        }
      }


      // Shared Panel Pulse Animation (used by main panel and comment input panel)
      @keyframes mainPanelPulse {
        0%, 100% {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 0 5px rgba(33, 150, 243, 0.3);
        }
        50% {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 0 20px rgba(33, 150, 243, 0.6);
        }
      }

      // Instructions Panel Pulse Animation (darker and 50% more intense)
      @keyframes instructionsPanelPulse {
        0%, 100% {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 0 3px rgba(25, 118, 210, 0.4);
        }
        50% {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 9px rgba(25, 118, 210, 0.7);
        }
      }

      // Nested Instructions Panel Styles
      .instructions-panel {
        margin: 1rem 0;
        border: 1px solid #f0f0f0;
        border-radius: 6px;
        box-shadow: none;
        background: #fafafa;
        transition: all 0.3s ease;

        // Blue glow animation when collapsed (darker and more intense)
        &:not(.mat-expanded) {
          animation: instructionsPanelPulse 1s ease-in-out infinite;
          border-color: #1976d2;
        }

        // When expanded, remove animation
        &.mat-expanded {
          animation: none;
          border-color: #f0f0f0;
        }

        .mat-expansion-panel-header {
          padding: 0 14px;
          height: 44px;
          background: #f5f5f5;
          transition: all 0.3s ease;
          border-radius: 6px 6px 0 0;
        }

        .instruction-icon {
          color: #666;
          margin-right: 6px;
          font-size: 1.2rem;
        }

        .instructions {
          padding: 12px 16px;
          
          .instruction-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .instruction-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.5rem;
            border-radius: 4px;
            transition: background 0.2s ease;
            
            &:hover {
              background: rgba(33, 150, 243, 0.05);
            }
            
            .instruction-bullet {
              color: #2196f3;
              font-size: 1.25rem;
              width: 1.25rem;
              height: 1.25rem;
              flex-shrink: 0;
            }
            
            span {
              color: #555;
              line-height: 1.4;
              font-size: 0.9rem;
            }
          }
        }
      }

      // Nested Comment Input Panel Styles
      .comment-input-panel {
        margin: 1rem 0 0.5rem 0;
        border: 1px solid #bbdefb;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        background: #fff;
        transition: all 0.3s ease;

        // Same glow effect as main panel when collapsed
        &:not(.mat-expanded) {
          animation: mainPanelPulse 1s ease-in-out infinite;
          border-color: #2196f3;
        }

        // When expanded, remove the glow animation but keep blue border
        &.mat-expanded {
          animation: none;
          border-color: #2196f3;
        }

        .mat-expansion-panel-header {
          padding: 0 16px;
          height: 48px;
          background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
          transition: background 0.3s ease;
        }

        .comment-input-icon {
          color: #1976d2;
          margin-right: 8px;
          font-size: 1.3rem;
        }

        .comment-input-content {
          padding: 20px 8px 8px 8px;
          // Styles will be handled by the comment-input component
        }
      }
    `,
  ],
  animations: [
    trigger('slideToggle', [
      state('true', style({
        height: '*',
        opacity: 1
      })),
      state('false', style({
        height: '0px',
        opacity: 0,
        overflow: 'hidden'
      })),
      transition('false <=> true', [
        animate('300ms ease-in-out')
      ])
    ])
  ],
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
   * Local state for tracking initial comment submission
   */
  private isSubmittingInitialComment = false;

  /**
   * LocalStorage keys for remembering expansion states
   */
  private readonly EXPANSION_STORAGE_KEY = 'rating_gate_instructions_expanded';
  private readonly MAIN_PANEL_STORAGE_KEY = 'rating_gate_required_evaluation_expanded';
  private readonly COMMENT_INPUT_STORAGE_KEY = 'rating_gate_comment_input_expanded';
  private readonly RATINGS_PANEL_STORAGE_KEY = 'rating_gate_ratings_panel_expanded';

  /**
   * State for expansion panels - loads from localStorage
   * Main panel (required evaluation) defaults to collapsed
   */
  instructionsExpanded = this.loadExpansionState();
  mainPanelExpanded = this.loadMainPanelStateCollapsed();
  commentInputExpanded = this.loadCommentInputState();
  isRatingsExpanded = this.loadRatingsPanelState();


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
  @Output() ratingSubmitted = new EventEmitter<{ categoryId: number; score: number }>();

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
  @Output() accessGranted = new EventEmitter<{ categoryId: number }>();

  // Component state - only keeping error subject for local error handling
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  /**
   * Observable view model for the component template
   */
  readonly viewModel$: Observable<RatingGateViewModel>;

  /**
   * Observable for vote limit display data
   */
  readonly voteLimitDisplay$: Observable<{
    display: string;
    canVote: boolean;
    percentage: number;
  } | null>;

  /**
   * Observable for raw vote limit data (for dialog)
   */
  private currentVoteLimitStatus: VoteLimitStatusDTO | null = null;

  constructor(
    private readonly evaluationService: EvaluationDiscussionService,
    private readonly stateService: EvaluationStateService,
    private readonly dialog: MatDialog,
  ) {
    super();

    // Use centralized rating status and comment status
    this.viewModel$ = combineLatest([
      this.stateService.activeCategory$,
      this.stateService.categoryRatingStatus$,
      this.stateService.categoryCommentStatus$,
      this.stateService.ratingStatusLoading$,
      this.errorSubject.asObservable(),
    ]).pipe(
      map(([activeCategory, categoryStatusMap, commentStatusMap, isLoading, error]) => {
        // Get status for current category
        const ratingStatus = this.currentCategory?.id
          ? (categoryStatusMap.get(this.currentCategory.id) ?? null)
          : null;

        const hasCommented = this.currentCategory?.id
          ? (commentStatusMap.get(this.currentCategory.id) ?? false)
          : false;

        // New logic: Access depends on having commented, not rated
        const canAccessDiscussion = hasCommented;
        const requiresInitialComment = !hasCommented;
        const showRatingSlider = hasCommented; // Show slider after commenting

        console.log('🔄 NEW Rating Gate ViewModel Update:', {
          currentCategoryId: this.currentCategory?.id,
          currentCategoryName: this.currentCategory?.displayName,
          hasCommented,
          hasRated: ratingStatus?.hasRated || false,
          canAccessDiscussion,
          requiresInitialComment,
          showRatingSlider,
          rating: ratingStatus?.rating,
          isLoading,
          error: error ? 'Error present' : 'No error',
          timestamp: new Date().toISOString(),
        });

        return {
          hasCommented,
          hasRated: ratingStatus?.hasRated || false,
          isLoading,
          error,
          ratingStatus,
          canAccessDiscussion,
          requiresInitialComment,
          showRatingSlider,
        };
      }),
      distinctUntilChanged((prev, curr) => {
        // Custom comparison to prevent unnecessary renders
        return (
          prev.hasCommented === curr.hasCommented &&
          prev.hasRated === curr.hasRated &&
          prev.isLoading === curr.isLoading &&
          prev.error === curr.error &&
          prev.canAccessDiscussion === curr.canAccessDiscussion &&
          prev.showRatingSlider === curr.showRatingSlider &&
          prev.ratingStatus?.rating === curr.ratingStatus?.rating
        );
      }),
      takeUntil(this.destroy$),
    );

    // Initialize vote limit display observable using raw vote status data
    this.voteLimitDisplay$ = combineLatest([
      this.stateService.activeCategory$,
      this.stateService.voteLimitStatus$,
    ]).pipe(
      map(([activeCategory, voteLimitStatusMap]) => {
        if (!activeCategory || !this.currentCategory) {
          return null;
        }

        // Get vote limit status for current category
        const voteLimitStatus = voteLimitStatusMap.get(this.currentCategory.id);
        if (!voteLimitStatus) {
          return null;
        }

        // Store raw data for dialog use
        this.currentVoteLimitStatus = voteLimitStatus;

        console.log('📊 Vote limit status updated:', voteLimitStatus);

        // Transform for display
        const usedVotes = voteLimitStatus.maxVotes - voteLimitStatus.remainingVotes;
        return {
          display: `${voteLimitStatus.remainingVotes}/${voteLimitStatus.maxVotes} verfügbar`,
          canVote: voteLimitStatus.canVote,
          percentage:
            voteLimitStatus.maxVotes > 0 ? (usedVotes / voteLimitStatus.maxVotes) * 100 : 0,
        };
      }),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    );
  }

  /**
   * Handles input property changes with enhanced category transition safety
   *
   * @description Called whenever any input property changes.
   * OPTIMIZED: Reduces unnecessary API calls by leveraging centralized state management.
   *
   * @param {SimpleChanges} changes - Object containing all input changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Check if currentCategory has changed
    if (changes['currentCategory'] && !changes['currentCategory'].firstChange) {
      const previousCategory = changes['currentCategory'].previousValue;
      const currentCategory = changes['currentCategory'].currentValue;

      console.log('📋 Rating Gate Category Transition:', {
        from: {
          id: previousCategory?.id,
          name: previousCategory?.displayName,
        },
        to: {
          id: currentCategory?.id,
          name: currentCategory?.displayName,
        },
        timestamp: new Date().toISOString(),
        submissionId: this.submissionId,
      });

      // Clear any local errors when category changes
      this.errorSubject.next(null);

      // OPTIMIZED: Only refresh if we don't have status for this category
      // The centralized state service already handles category transitions atomically
      if (currentCategory && this.submissionId) {
        const currentStatusMap = this.stateService.getCurrentCategoryRatingStatusMap();
        const hasStatus = currentStatusMap.has(currentCategory.id);

        if (!hasStatus) {
          console.log('🔄 Category has no cached status, refreshing:', {
            categoryId: currentCategory.id,
            submissionId: this.submissionId,
          });

          this.stateService.anonymousUser$.pipe(take(1)).subscribe(anonymousUser => {
            if (anonymousUser) {
              this.stateService.refreshRatingStatus(this.submissionId!, anonymousUser.id);
            } else {
              console.warn('⚠️ Cannot refresh rating status: Anonymous user not available');
            }
          });
        } else {
          console.log('✅ Category already has cached status, skipping refresh:', {
            categoryId: currentCategory.id,
            hasRated: currentStatusMap.get(currentCategory.id)?.hasRated,
            rating: currentStatusMap.get(currentCategory.id)?.rating,
          });
        }
      }
    }

    // Handle submissionId changes (though this should be rare)
    if (changes['submissionId'] && !changes['submissionId'].firstChange) {
      console.log('📄 Rating Gate Submission ID changed:', {
        from: changes['submissionId'].previousValue,
        to: changes['submissionId'].currentValue,
        currentCategory: this.currentCategory?.id,
      });

      // Clear errors on submission change
      this.errorSubject.next(null);

      // Ensure rating status is loaded for new submission
      if (this.submissionId && this.currentCategory) {
        this.stateService.anonymousUser$.pipe(take(1)).subscribe(anonymousUser => {
          if (anonymousUser) {
            this.stateService.loadCategoryRatingStatus(this.submissionId, anonymousUser.id);
          }
        });
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
      rating: ratingEvent.rating || ratingEvent.score,
    });

    // Emit the rating submitted event to parent component
    // The parent will handle the centralized state update
    this.ratingSubmitted.emit({
      categoryId: this.currentCategory.id,
      score: ratingEvent.rating || ratingEvent.score,
    });

    // Emit access granted event
    this.accessGranted.emit({
      categoryId: this.currentCategory.id,
    });

    // Note: Local state update is no longer needed since we use centralized state
    // The viewModel$ will automatically update when the state service is updated
  }

  /**
   * Handles initial comment submission (first comment in category)
   *
   * @description Called when user submits their first comment to unlock discussion
   *
   * @param {string} commentContent - The content of the initial comment
   */
  onInitialCommentSubmitted(commentContent: string): void {
    console.log('📝 Initial comment submitted for category:', {
      categoryId: this.currentCategory.id,
      categoryName: this.currentCategory.displayName,
      commentLength: commentContent.length,
    });

    // Mark this category as commented in the state service
    this.stateService.markCategoryAsCommented(
      this.currentCategory.id,
      this.submissionId
    );

    // Emit the comment to parent for actual submission
    this.commentSubmitted.emit({
      content: commentContent,
      isInitialComment: true,
      categoryId: this.currentCategory.id,
    });

    // Emit access granted event
    this.accessGranted.emit({
      categoryId: this.currentCategory.id,
    });
  }

  /**
   * Handles regular comment submission (after initial comment)
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
      this.stateService.refreshRatingStatus(this.submissionId, this.currentCategory.id);
      this.errorSubject.next(null); // Clear local error state
    }
  }

  /**
   * Opens the vote explanation dialog
   *
   * @description Shows a comprehensive dialog explaining the voting system,
   * including how voting works, point calculation, and current user status
   */
  openVoteExplanationDialog(): void {
    this.dialog.open(VotingMechanismDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      data: {
        currentVotes: this.currentVoteLimitStatus?.remainingVotes || 0,
        maxVotes: this.currentVoteLimitStatus?.maxVotes || 0,
      },
      panelClass: 'vote-explanation-dialog',
      autoFocus: false,
      restoreFocus: true,
    });
  }

  /**
   * Loads expansion state from localStorage
   *
   * @returns boolean indicating if instructions should be expanded
   */
  private loadExpansionState(): boolean {
    try {
      const stored = localStorage.getItem(this.EXPANSION_STORAGE_KEY);
      return stored ? stored === 'true' : false; // Default to collapsed for instructions
    } catch (error) {
      console.warn('Failed to load expansion state from localStorage:', error);
      return false; // Default to collapsed
    }
  }

  /**
   * Handles expansion panel state changes and saves to localStorage
   *
   * @param expanded - Whether the panel is expanded
   */
  onExpansionChange(expanded: boolean): void {
    this.instructionsExpanded = expanded;

    try {
      localStorage.setItem(this.EXPANSION_STORAGE_KEY, String(expanded));
      console.log('📝 Instructions expansion state saved:', expanded);
    } catch (error) {
      console.warn('Failed to save expansion state to localStorage:', error);
    }
  }

  /**
   * Loads main panel expansion state from localStorage
   * Main panel defaults to collapsed (false) for required evaluation panel
   *
   * @returns boolean indicating if main panel should be expanded
   */
  private loadMainPanelStateCollapsed(): boolean {
    try {
      const stored = localStorage.getItem(this.MAIN_PANEL_STORAGE_KEY);
      return stored ? stored === 'true' : false; // Default to collapsed for required evaluation panel
    } catch (error) {
      console.warn('Failed to load main panel expansion state from localStorage:', error);
      return false; // Default to collapsed
    }
  }

  /**
   * Loads comment input panel expansion state from localStorage
   *
   * @returns boolean indicating if comment input panel should be expanded
   */
  private loadCommentInputState(): boolean {
    try {
      const stored = localStorage.getItem(this.COMMENT_INPUT_STORAGE_KEY);
      return stored ? stored === 'true' : false; // Default to collapsed for comment input
    } catch (error) {
      console.warn('Failed to load comment input expansion state from localStorage:', error);
      return false; // Default to collapsed
    }
  }

  /**
   * Handles main panel expansion state changes and saves to localStorage
   *
   * @param expanded - Whether the main panel is expanded
   */
  onMainPanelExpansionChange(expanded: boolean): void {
    this.mainPanelExpanded = expanded;

    try {
      localStorage.setItem(this.MAIN_PANEL_STORAGE_KEY, String(expanded));
      console.log('📝 Main panel expansion state saved:', expanded);
    } catch (error) {
      console.warn('Failed to save main panel expansion state to localStorage:', error);
    }
  }

  /**
   * Handles comment input panel expansion state changes and saves to localStorage
   *
   * @param expanded - Whether the comment input panel is expanded
   */
  onCommentInputExpansionChange(expanded: boolean): void {
    this.commentInputExpanded = expanded;

    try {
      localStorage.setItem(this.COMMENT_INPUT_STORAGE_KEY, String(expanded));
      console.log('📝 Comment input expansion state saved:', expanded);
    } catch (error) {
      console.warn('Failed to save comment input expansion state to localStorage:', error);
    }
  }

  /**
   * Loads ratings panel expansion state from localStorage
   *
   * @returns boolean indicating if ratings panel should be expanded
   */
  private loadRatingsPanelState(): boolean {
    try {
      const stored = localStorage.getItem(this.RATINGS_PANEL_STORAGE_KEY);
      return stored ? stored === 'true' : false; // Default to collapsed
    } catch (error) {
      console.warn('Failed to load ratings panel expansion state from localStorage:', error);
      return false; // Default to collapsed
    }
  }

  /**
   * Toggles the ratings panel expanded state
   */
  toggleRatingsPanel(): void {
    this.isRatingsExpanded = !this.isRatingsExpanded;

    try {
      localStorage.setItem(this.RATINGS_PANEL_STORAGE_KEY, String(this.isRatingsExpanded));
      console.log('📝 Ratings panel expansion state saved:', this.isRatingsExpanded);
    } catch (error) {
      console.warn('Failed to save ratings panel expansion state to localStorage:', error);
    }
  }

  /**
   * Converts CategoryRatingStatus to EvaluationRatingDTO format for rating slider
   *
   * @description The rating-slider component expects EvaluationRatingDTO but we have
   * CategoryRatingStatus. This method creates a minimal compatible structure.
   *
   * @param {CategoryRatingStatus | null} ratingStatus - The rating status to convert
   * @returns {EvaluationRatingDTO | null} Converted rating DTO or null
   */
  convertRatingStatusToDTO(ratingStatus: CategoryRatingStatus | null): EvaluationRatingDTO | null {
    if (!ratingStatus || ratingStatus.rating === null) {
      return null;
    }

    // Create a minimal EvaluationRatingDTO-compatible object
    return {
      id: `temp-${ratingStatus.categoryId}`, // Synthetic ID
      submissionId: this.submissionId || '',
      userId: 0, // Not needed for rating slider
      categoryId: ratingStatus.categoryId,
      score: ratingStatus.rating,
      createdAt: new Date(), // Use current date as fallback
      updatedAt: new Date(),
    };
  }


}
