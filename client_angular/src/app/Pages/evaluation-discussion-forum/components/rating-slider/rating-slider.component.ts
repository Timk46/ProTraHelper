import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';

// Angular Material Imports
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

// DTOs
import { EvaluationRatingDTO } from '@DTOs/index';

// Base Component
import { BaseComponent } from '../../../../shared/base.component';

@Component({
  selector: 'app-rating-slider',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './rating-slider.component.html',
  styleUrl: './rating-slider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RatingSliderComponent extends BaseComponent implements OnInit, OnChanges, AfterViewInit {

  // =============================================================================
  // INPUTS - CONFIGURATION FROM PARENT
  // =============================================================================

  @Input() categoryId: number = 1;
  @Input() categoryName: string = '';
  @Input() currentRating: EvaluationRatingDTO | null = null;
  @Input() minValue: number = 1;
  @Input() maxValue: number = 10;
  @Input() step: number = 1;
  @Input() disabled: boolean = false;
  @Input() showLabels: boolean = true;
  @Input() showCurrentValue: boolean = true;
  @Input() showDescription: boolean = true;
  @Input() compactMode: boolean = false;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT
  // =============================================================================

  @Output() ratingChanged = new EventEmitter<{ categoryId: number; score: number }>();
  @Output() ratingSubmitted = new EventEmitter<{ categoryId: number; score: number }>();

  // =============================================================================
  // COMPONENT STATE & VIEW CHILDREN
  // =============================================================================

  @ViewChild('ratingSlider', { static: false }) ratingSlider!: ElementRef;

  ratingForm: FormGroup;
  currentValue: number = 5;
  isModified: boolean = false;
  hasUserInteracted: boolean = false; // Tracks if user has manually changed the value

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    super(); // Call BaseComponent constructor first
    this.ratingForm = this.createForm();
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    this.initializeRating();
    this.setupValueChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentRating'] && !changes['currentRating'].firstChange) {
      this.initializeRating();
    }
  }

  ngAfterViewInit(): void {
    // Ensure the slider is properly initialized after view is ready
    this.cdr.detectChanges();
  }

  // =============================================================================
  // FORM SETUP
  // =============================================================================

  private createForm(): FormGroup {
    return this.formBuilder.group({
      rating: [this.currentValue]
    });
  }

  private initializeRating(): void {
    if (this.currentRating) {
      this.currentValue = this.currentRating.score;
    } else {
      this.currentValue = Math.floor((this.minValue + this.maxValue) / 2);
    }

    this.ratingForm.get('rating')?.setValue(this.currentValue);
    this.isModified = false;
    this.hasUserInteracted = false; // Reset user interaction flag
  }

  /**
   * Sets up reactive form value change subscriptions with proper memory leak prevention
   * 
   * @description Uses takeUntil pattern to automatically unsubscribe when component
   * is destroyed, preventing memory leaks in production environment
   * 
   * @private
   * @memberof RatingSliderComponent
   */
  private setupValueChanges(): void {
    this.ratingForm.get('rating')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value !== null && value !== undefined) {
          this.currentValue = value;
          
          // For new ratings (no existing rating), always allow submission
          if (!this.currentRating) {
            this.isModified = true; // Always allow submission for new ratings
          } else {
            // For existing ratings, check if value differs from original
            this.isModified = value !== this.currentRating.score;
          }

          // Emit rating change event
          this.ratingChanged.emit({
            categoryId: this.categoryId,
            score: value
          });

          // Trigger change detection to ensure UI updates
          this.cdr.markForCheck();
        }
      });
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  /**
   * Handles slider change events
   * @param event - The input event from the slider
   */
  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    this.hasUserInteracted = true; // Mark that user has manually interacted
    this.ratingForm.get('rating')?.setValue(value);
  }

  onSubmitRating(): void {
    if (!this.disabled && this.isModified) {
      this.ratingSubmitted.emit({
        categoryId: this.categoryId,
        score: this.currentValue
      });
      this.isModified = false;
    }
  }

  onResetRating(): void {
    this.initializeRating();
  }

  /**
   * Handles quick rating button clicks
   * 
   * @description Updates the rating slider and form value when user clicks
   * on a quick rating button. Uses a simplified approach that relies on
   * Angular's reactive forms to sync the UI properly.
   * 
   * @param {number} value - The rating value to set (1-10)
   * @memberof RatingSliderComponent
   */
  onQuickRating(value: number): void {
    console.log('🎯 Quick rating selected:', value);
    
    // Mark that user has interacted manually
    this.hasUserInteracted = true;
    
    // Set form control value - this should trigger UI updates automatically
    this.ratingForm.get('rating')?.setValue(value);
    
    // Update current value directly to ensure immediate UI reflection
    this.currentValue = value;
    
    // Force change detection for OnPush components
    this.cdr.detectChanges();
    
    console.log('📊 Quick rating completed:', { 
      selectedValue: value, 
      formValue: this.ratingForm.get('rating')?.value, 
      currentValue: this.currentValue 
    });
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================

  /**
   * Gets the rating description based on current value
   */
  getRatingDescription(): string {
    const descriptions: { [key: number]: string } = {
      1: 'Sehr schlecht',
      2: 'Schlecht',
      3: 'Mangelhaft',
      4: 'Ausreichend',
      5: 'Befriedigend',
      6: 'Befriedigend+',
      7: 'Gut',
      8: 'Gut+',
      9: 'Sehr gut',
      10: 'Ausgezeichnet'
    };

    return descriptions[this.currentValue] || 'Unbewertet';
  }

  /**
   * Gets the color class for the current rating
   */
  getRatingColorClass(): string {
    if (this.currentValue <= 3) {
      return 'rating-poor';
    } else if (this.currentValue <= 5) {
      return 'rating-fair';
    } else if (this.currentValue <= 7) {
      return 'rating-good';
    } else {
      return 'rating-excellent';
    }
  }

  /**
   * Gets the icon for the current rating
   */
  getRatingIcon(): string {
    if (this.currentValue <= 3) {
      return 'sentiment_very_dissatisfied';
    } else if (this.currentValue <= 5) {
      return 'sentiment_neutral';
    } else if (this.currentValue <= 7) {
      return 'sentiment_satisfied';
    } else {
      return 'sentiment_very_satisfied';
    }
  }

  /**
   * Gets the percentage for visual representation
   */
  getRatingPercentage(): number {
    return ((this.currentValue - this.minValue) / (this.maxValue - this.minValue)) * 100;
  }

  /**
   * Gets the submit button text
   */
  getSubmitButtonText(): string {
    if (this.currentRating) {
      return 'Bewertung aktualisieren';
    }
    return 'Bewertung speichern';
  }

  /**
   * Gets the submit button tooltip
   */
  getSubmitTooltip(): string {
    if (this.disabled) {
      return 'Bewertungen sind momentan nicht möglich';
    }

    if (!this.isModified) {
      return 'Keine Änderungen vorgenommen';
    }

    return `${this.categoryName} mit ${this.currentValue}/10 bewerten`;
  }

  /**
   * Checks if the rating can be submitted
   */
  canSubmit(): boolean {
    return !this.disabled && this.isModified;
  }

  /**
   * Gets the slider color based on rating
   */
  getSliderColor(): 'primary' | 'accent' | 'warn' | undefined {
    if (this.currentValue <= 3) {
      return 'warn';
    } else if (this.currentValue <= 7) {
      return 'accent';
    } else {
      return 'primary';
    }
  }

  /**
   * Gets quick rating options
   */
  getQuickRatingOptions(): Array<{ value: number; label: string; icon: string }> {
    return [
      { value: 2, label: 'Schlecht', icon: 'thumb_down' },
      { value: 5, label: 'Mittel', icon: 'horizontal_rule' },
      { value: 8, label: 'Gut', icon: 'thumb_up' },
      { value: 10, label: 'Perfekt', icon: 'star' }
    ];
  }

  /**
   * Gets the category rating status
   */
  getCategoryStatus(): string {
    if (!this.currentRating) {
      return 'unrated';
    }

    if (this.isModified) {
      return 'modified';
    }

    return 'rated';
  }

  /**
   * Gets the status display text
   */
  getStatusText(): string {
    switch (this.getCategoryStatus()) {
      case 'unrated':
        return 'Noch nicht bewertet';
      case 'modified':
        return 'Bewertung geändert';
      case 'rated':
        return `Bewertet am ${this.currentRating?.createdAt ? new Date(this.currentRating.createdAt).toLocaleDateString('de-DE') : ''}`;
      default:
        return '';
    }
  }

  /**
   * Gets tick marks for the slider
   */
  getTickMarks(): number[] {
    const marks: number[] = [];
    for (let i = this.minValue; i <= this.maxValue; i++) {
      marks.push(i);
    }
    return marks;
  }

  /**
   * Formats the slider value for display
   */
  formatSliderValue(value: number): string {
    return value.toString();
  }

  /**
   * Gets the aria label for the slider
   */
  getSliderAriaLabel(): string {
    return `Bewertung für ${this.categoryName}. Aktuelle Bewertung: ${this.currentValue} von ${this.maxValue}`;
  }

  /**
   * Gets help text for the rating
   */
  getHelpText(): string {
    return `Bewerten Sie die ${this.categoryName} auf einer Skala von ${this.minValue} bis ${this.maxValue}.`;
  }

  /**
   * Checks if the component is in compact mode
   */
  isCompact(): boolean {
    return this.compactMode;
  }

  /**
   * Gets the container class
   */
  getContainerClass(): string {
    const classes = [`rating-slider-${this.getCategoryStatus()}`];

    if (this.isCompact()) {
      classes.push('compact');
    }

    if (this.disabled) {
      classes.push('disabled');
    }

    classes.push(this.getRatingColorClass());

    return classes.join(' ');
  }

  /**
   * Gets the average rating if available
   */
  hasHistoricalData(): boolean {
    // This could be extended to show historical rating data
    return false;
  }

  /**
   * Gets confidence level for the rating
   */
  getConfidenceLevel(): 'low' | 'medium' | 'high' {
    // This could be based on how much time the user spent or other factors
    return 'medium';
  }
}
