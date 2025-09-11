import { OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  Component,
  Input,
  Inject,
  EventEmitter,
  Output,
  Optional,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MCOptionViewDTO, McQuestionDTO, QuestionDTO } from '@DTOs/index';
import { McQuestionOptionDTO } from '@DTOs/index';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TaskViewData } from '@DTOs/index';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Extended interface for our options to include correctness information
interface MCOptionViewModel extends MCOptionViewDTO {
  isCorrect?: boolean;
}

// Component state enum
enum McTaskState {
  LOADING,
  QUESTION,
  SUBMITTING,
  FEEDBACK,
}

@Component({
  selector: 'app-mcTask',
  templateUrl: './mcTask.component.html',
  styleUrls: ['./mcTask.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McTaskComponent implements OnInit, OnDestroy {
  @Output() submitClicked = new EventEmitter<any>();

  @Input() conceptId!: number;
  @Input() questionId!: number;
  @Input() isSelfAssessment: boolean = false;
  @Input() taskViewData!: TaskViewData;

  // Track component state
  componentState: McTaskState = McTaskState.LOADING;
  justAnsweredCorrectly: boolean = false;

  // For handling RxJS subscriptions cleanup
  private readonly destroy$ = new Subject<void>();

  editorConfig = {
    //tinyMCE
    readonly: true,
    plugins: 'lists table link image code codesample',
    toolbar: false,
    min_height: 100,
    max_height: 500,
    resize: false,
  };

  //init question data
  questionData: QuestionDTO = {
    // dummy data
    id: -1,
    name: '',
    description: '',
    score: -1,
    type: '',
    text: '',
    conceptNodeId: -1,
    isApproved: false,
    originId: -1,
    level: -1,
  };

  dataLoaded: boolean = false;
  conceptIdParam!: number;
  questionIdParam!: number;

  //the mc question data
  mcQuestion: McQuestionDTO = {
    id: -1,
    questionId: -1,
    isSC: false,
    shuffleOptions: false,
    questionVersion: {
      id: -1,
      version: -1,
      isApproved: false,
      questionId: -1,
      successor: null,
    },
    mcQuestionOption: [],
  };

  //the userAnswer data
  userAnswer: UserAnswerDataDTO = {
    id: -1,
    userId: -1,
    questionId: -1,
  };

  feedback: userAnswerFeedbackDTO = {
    id: -1,
    userAnswerId: -1,
    score: -1,
    feedbackText: '',
    elementDone: false,
    progress: -1,
  };

  //the mc options
  options: MCOptionViewModel[] = [];

  //the selected option(s)
  selectedOptions: number[] = [];

  submitDisabled: boolean = false;
  fullscore: number = 0;

  constructor(
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: { taskViewData: TaskViewData; conceptId: number; questionId: number },
    private readonly questionDataService: QuestionDataService,
    private readonly router: Router,
    private readonly dialogRef: MatDialogRef<McTaskComponent>,
    private readonly location: Location,
    private readonly cdr: ChangeDetectorRef,
  ) {
    if (data && data.taskViewData) {
      this.taskViewData = data.taskViewData;
    }
  }

  ngOnInit() {
    this.loadQuestionData();
  }

  ngOnDestroy() {
    // Complete the subject to unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads the question data from the server
   */
  private loadQuestionData(): void {
    if (this.taskViewData && this.taskViewData.id) {
      // Show the newest Version of the questions
      this.questionDataService
        .getQuestionData(this.taskViewData.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(data => {
          this.questionData = data;
          this.loadMcQuestionData();
        });
    }
  }

  /**
   * Loads the MC question data after the basic question data is loaded
   */
  private loadMcQuestionData(): void {
    this.questionDataService
      .getMCQuestion(this.questionData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.mcQuestion = data;
        this.loadMcOptions();
      });
  }

  /**
   * Loads the MC options for the question
   */
  private loadMcOptions(): void {
    this.questionDataService
      .getMCOptions(this.mcQuestion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Convert to our extended view model type
        this.options = data.map(option => ({
          ...option,
          isCorrect: undefined, // Will be set after answer submission
        }));

        // Shuffle options if enabled in question config
        if (this.mcQuestion.shuffleOptions) {
          this.options.sort(() => Math.random() - 0.5);
        }

        this.dataLoaded = true;
        this.componentState = McTaskState.QUESTION;
        this.cdr.detectChanges();
      });
  }

  /**
   * Handle selection for single choice questions
   */
  selectSingleOption(optionId: number): void {
    this.selectedOptions = [optionId];
    this.onSelectionChange();
  }

  /**
   * Handle selection/deselection for multiple choice questions
   */
  toggleOption(optionId: number): void {
    const index = this.selectedOptions.indexOf(optionId);
    if (index > -1) {
      this.selectedOptions.splice(index, 1);
    } else {
      this.selectedOptions.push(optionId);
    }
    this.onSelectionChange();
  }

  /**
   * Updates the selected state of options after selection changes
   */
  onSelectionChange(): void {
    for (const option of this.options) {
      if (this.selectedOptions.includes(option.id)) {
        option.selected = true;
      } else {
        option.selected = false;
      }
    }
    this.cdr.detectChanges();
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.selectedOptions.length === 0) return;

    this.componentState = McTaskState.SUBMITTING;

    // Create new submit
    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      contentElementId: this.taskViewData.contentElementId,
      userId: -1,
      questionId: this.questionData.id,
      userMCAnswer: this.selectedOptions,
    };

    this.questionDataService
      .createUserAnswer(userAnswerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.feedback = data;

        // Check correct answers and update option models
        this.updateOptionCorrectness();

        // Emit progress
        this.submitClicked.emit(data.progress);

        // Set state
        this.submitDisabled = true;
        this.componentState = McTaskState.FEEDBACK;

        // Determine if answered correctly for animation
        this.justAnsweredCorrectly = this.checkCorrect();
        if (this.justAnsweredCorrectly) {
          setTimeout(() => {
            this.justAnsweredCorrectly = false;
            this.cdr.detectChanges();
          }, 1500);
        }

        this.cdr.detectChanges();
      });
  }

  /**
   * After submission, update the correctness flag on each option
   */
  private updateOptionCorrectness(): void {
    if (!this.mcQuestion.mcQuestionOption || this.mcQuestion.mcQuestionOption.length === 0) {
      return;
    }

    // Get correct option ids from the question data
    const correctOptionIds = this.mcQuestion.mcQuestionOption
      .filter(opt => opt.option && opt.option.correct)
      .map(opt => opt.id);

    // Update our view models
    this.options.forEach(option => {
      option.isCorrect = correctOptionIds.includes(option.id);
    });
  }

  /**
   * Check if the answer was completely correct
   */
  checkCorrect(): boolean {
    const questionScore = this.questionData.score || 0;
    return questionScore > 0 && this.feedback.score === questionScore;
  }

  /**
   * Reset the question to try again
   */
  retry(): void {
    this.submitDisabled = false;
    this.feedback = {
      id: -1,
      userAnswerId: -1,
      score: -1,
      feedbackText: '',
      elementDone: false,
      progress: -1,
    };

    // Clear selected options
    this.selectedOptions = [];

    // Reset selected state for all options
    this.options.forEach(option => {
      option.selected = false;
      // Keep isCorrect value for learning purposes
    });

    // Reset component state
    this.componentState = McTaskState.QUESTION;
    this.cdr.detectChanges();
  }

  /**
   * Get the appropriate feedback color based on score
   */
  getFeedbackColor(): string {
    const questionScore = this.questionData.score || 0;

    if (questionScore === 0) return '#a3be8c'; // Edge case protection

    if (this.feedback.score === questionScore) {
      return '#a3be8c'; // Nord green
    } else if (this.feedback.score >= questionScore * 0.5) {
      return '#ebcb8b'; // Nord yellow
    } else {
      return '#bf616a'; // Nord red
    }
  }

  /**
   * Close the dialog or navigate back
   */
  onClose(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }

    if (this.conceptId && this.questionId) {
      // Navigate to /dashboard/conceptOverview/:conceptId
      this.location.replaceState(`/dashboard/conceptOverview/${this.conceptId}`);
    } else if (this.conceptId) {
      // Navigate to /dashboard/conceptOverview
      this.location.replaceState(`/dashboard/conceptOverview`);
    } else {
      // Navigate to /dashboard
      this.location.replaceState(`/dashboard`);
    }
  }
}
