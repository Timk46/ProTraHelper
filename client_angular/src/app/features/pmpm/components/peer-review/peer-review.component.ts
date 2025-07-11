import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { ThreeViewerComponent } from '../three-viewer/three-viewer.component';
import type { ModelConverterService } from '../../services/model-converter.service';
import type { PeerReview, CriterionScore, ReviewCriterion } from '../../models/peer-review.model';
import { DEFAULT_REVIEW_CRITERIA } from '../../models/peer-review.model';

/**
 * Component for peer review of 3D models
 * This component allows students to review each other's models based on predefined criteria
 */
@Component({
  selector: 'app-peer-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatDividerModule,
    ThreeViewerComponent,
  ],
  templateUrl: './peer-review.component.html',
  styleUrls: ['./peer-review.component.scss'],
})
export class PeerReviewComponent implements OnInit {
  @Input() modelId!: string;
  @Input() courseId!: string;
  @Input() lessonId!: string;
  @Input() userId!: string;

  // Peer review data
  criteria = DEFAULT_REVIEW_CRITERIA;
  review: PeerReview = this.createEmptyReview();
  averageScores: { criterionId: string; score: number }[] = [];

  // Model data
  modelPath = '';
  isLoading = false;
  error: string | null = null;
  isSaving = false;
  isSubmitted = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly modelConverterService: ModelConverterService,
  ) {}

  ngOnInit(): void {
    // Get model ID from route if not provided as input
    if (!this.modelId) {
      this.route.params.subscribe(params => {
        this.modelId = params['modelId'];
        this.loadModel();
      });
    } else {
      this.loadModel();
    }

    // Get course and lesson IDs from route if not provided as input
    if (!this.courseId || !this.lessonId) {
      this.route.params.subscribe(params => {
        this.courseId = params['courseId'] || this.courseId;
        this.lessonId = params['lessonId'] || this.lessonId;
      });
    }

    // Mock user ID for now - in real app, this would come from auth service
    if (!this.userId) {
      this.userId = 'current-user-123';
    }
  }

  /**
   * Creates an empty review object
   */
  private createEmptyReview(): PeerReview {
    return {
      reviewerId: this.userId || '',
      modelId: this.modelId || '',
      modelOwnerId: 'model-owner-456', // This would come from the backend in a real app
      createdAt: new Date(),
      scores: this.criteria.map(criterion => ({
        criterionId: criterion.id,
        score: 0,
        feedback: '',
      })),
      comments: '',
      isComplete: false,
    };
  }

  /**
   * Load the model to review
   */
  private loadModel(): void {
    if (!this.modelId) return;

    this.isLoading = true;
    this.error = null;

    this.modelPath = this.modelConverterService.getModelUrl(this.modelId);

    // In a real app, we would load any existing review for this model by this user
    // For now, simulate a backend request with a timeout
    setTimeout(() => {
      this.isLoading = false;
      // We could populate the review with existing data here if there's a draft
    }, 1000);
  }

  /**
   * Get a specific criterion by ID
   */
  getCriterion(id: string): ReviewCriterion | undefined {
    return this.criteria.find(c => c.id === id);
  }

  /**
   * Get a score for a specific criterion
   */
  getScore(criterionId: string): CriterionScore | undefined {
    return this.review.scores.find(s => s.criterionId === criterionId);
  }

  /**
   * Update a score for a specific criterion
   */
  updateScore(criterionId: string, score: number): void {
    const scoreItem = this.review.scores.find(s => s.criterionId === criterionId);
    if (scoreItem) {
      scoreItem.score = score;
    }
  }

  /**
   * Update feedback for a specific criterion
   */
  updateFeedback(criterionId: string, feedback: string): void {
    const scoreItem = this.review.scores.find(s => s.criterionId === criterionId);
    if (scoreItem) {
      scoreItem.feedback = feedback;
    }
  }

  /**
   * Calculate the total score as a percentage
   */
  calculateTotalScore(): number {
    let totalPoints = 0;
    let maxPossiblePoints = 0;

    this.review.scores.forEach(score => {
      const criterion = this.getCriterion(score.criterionId);
      if (criterion) {
        totalPoints += (score.score / criterion.maxScore) * criterion.weight;
        maxPossiblePoints += criterion.weight;
      }
    });

    return maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;
  }

  /**
   * Checks if all criteria have been scored
   */
  isReviewComplete(): boolean {
    return this.review.scores.every(score => score.score > 0);
  }

  /**
   * Save the review as a draft
   */
  saveDraft(): void {
    this.isSaving = true;

    // In a real app, this would send data to the backend
    // Simulate a backend request with a timeout
    setTimeout(() => {
      this.isSaving = false;
      console.log('Draft saved:', this.review);
      // Show success message to user
    }, 1000);
  }

  /**
   * Submit the review
   */
  submitReview(): void {
    if (!this.isReviewComplete()) {
      this.error = 'Bitte bewerten Sie alle Kriterien, bevor Sie die Bewertung abschließen.';
      return;
    }

    this.isSaving = true;
    this.review.isComplete = true;

    // In a real app, this would send data to the backend
    // Simulate a backend request with a timeout
    setTimeout(() => {
      this.isSaving = false;
      this.isSubmitted = true;
      console.log('Review submitted:', this.review);
      // Show success message to user
    }, 1000);
  }
}
