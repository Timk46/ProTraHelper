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
import { MCOptionViewDTO, McQuestionDTO } from '@DTOs/question.dto';
import { QuestionDTO, McQuestionOptionDTO } from '@DTOs/question.dto';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TaskViewData } from '@DTOs/index';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { McSliderRhinoIntegrationService, RhinoIntegrationEvent } from 'src/app/Services/mcslider-rhino-integration.service';

// Extended interface for our options to include correctness information
interface MCOptionViewModel extends MCOptionViewDTO {
  isCorrect?: boolean;
}

// Question state interface for tracking individual questions
interface QuestionState {
  questionData: any; // Can be QuestionDTO or taskViewDTO
  mcQuestion: McQuestionDTO;
  options: MCOptionViewModel[];
  selectedOptions: number[];
  feedback?: userAnswerFeedbackDTO;
  isSubmitted: boolean;
  isCorrect?: boolean;
}

// Component state enum
enum McSliderTaskState {
  LOADING,
  QUESTIONS,
  SUBMITTING,
  FEEDBACK,
}

@Component({
  selector: 'app-mc-slider-task',
  templateUrl: './mc-slider-task.component.html',
  styleUrls: ['./mc-slider-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McSliderTaskComponent implements OnInit, OnDestroy {
  @Output() submitClicked = new EventEmitter<any>();

  @Input() conceptId!: number;
  @Input() questions: any[] = []; // Using any[] to handle both QuestionDTO and taskViewDTO
  @Input() isSelfAssessment: boolean = false;
  @Input() taskViewData!: TaskViewData;

  // Make enum accessible in template
  McSliderTaskState = McSliderTaskState;

  // Component state
  componentState: McSliderTaskState = McSliderTaskState.LOADING;
  currentQuestionIndex: number = 0;

  // Questions data
  questionStates: QuestionState[] = [];

  // Overall submission state
  allSubmitted: boolean = false;
  totalScore: number = 0;
  maxScore: number = 0;

  // Rhino integration state
  isRhinoSwitching: boolean = false;
  rhinoSwitchAttempts: number = 0;
  maxRhinoSwitchAttempts: number = 3;

  // For handling RxJS subscriptions cleanup
  private readonly destroy$ = new Subject<void>();

  constructor(
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: {
      taskViewData: TaskViewData;
      conceptId: number;
      questions: any[];
    },
    private readonly questionDataService: QuestionDataService,
    private readonly router: Router,
    private readonly dialogRef: MatDialogRef<McSliderTaskComponent>,
    private readonly location: Location,
    private readonly cdr: ChangeDetectorRef,
    private readonly rhinoIntegrationService: McSliderRhinoIntegrationService,
  ) {
    if (data) {
      this.taskViewData = data.taskViewData;
      this.conceptId = data.conceptId;
      this.questions = data.questions || [];
    }
  }

  ngOnInit() {
    this.loadQuestionsData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all questions data sequentially
   */
  private loadQuestionsData(): void {
    if (this.questions.length === 0) {
      this.componentState = McSliderTaskState.QUESTIONS;
      this.cdr.detectChanges();
      return;
    }

    this.loadQuestionAtIndex(0);
  }

  /**
   * Load question data at specific index
   */
  private loadQuestionAtIndex(index: number): void {
    if (index >= this.questions.length) {
      this.componentState = McSliderTaskState.QUESTIONS;
      this.cdr.detectChanges();
      return;
    }

    const questionData = this.questions[index];

    // Initialize question state
    const questionState: QuestionState = {
      questionData,
      mcQuestion: this.getEmptyMcQuestion(),
      options: [],
      selectedOptions: [],
      isSubmitted: false,
    };

    // Load MC question data
    this.questionDataService
      .getMCQuestion(questionData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mcQuestionData => {
        questionState.mcQuestion = mcQuestionData;

        // Load options
        this.questionDataService
          .getMCOptions(mcQuestionData.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(optionsData => {
            questionState.options = optionsData.map(option => ({
              ...option,
              isCorrect: undefined,
            }));

            // Shuffle options if enabled
            if (questionState.mcQuestion.shuffleOptions) {
              questionState.options.sort(() => Math.random() - 0.5);
            }

            this.questionStates[index] = questionState;
            this.maxScore += questionData.score || 0;

            // Load next question or finish loading
            this.loadQuestionAtIndex(index + 1);
          });
      });
  }

  /**
   * Get empty MC question structure
   */
  private getEmptyMcQuestion(): McQuestionDTO {
    return {
      id: -1,
      questionId: -1,
      isSC: false,
      shuffleOptions: false,
      mcQuestionOption: [],
    };
  }

  /**
   * Get current question state
   */
  getCurrentQuestionState(): QuestionState | null {
    return this.questionStates[this.currentQuestionIndex] || null;
  }

  /**
   * Navigate to previous question
   */
  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.cdr.detectChanges();
    }
  }

  /**
   * Navigate to next question
   */
  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questionStates.length - 1) {
      this.currentQuestionIndex++;
      this.cdr.detectChanges();
    }
  }

  /**
   * Navigate to specific question
   */
  goToQuestion(index: number): void {
    if (index >= 0 && index < this.questionStates.length) {
      this.currentQuestionIndex = index;
      this.cdr.detectChanges();
    }
  }

  /**
   * Handle single choice selection
   */
  selectSingleOption(optionId: number): void {
    const currentState = this.getCurrentQuestionState();
    if (!currentState || currentState.isSubmitted) return;

    currentState.selectedOptions = [optionId];
    this.updateOptionSelection(currentState);
  }

  /**
   * Handle multiple choice selection
   */
  toggleOption(optionId: number): void {
    const currentState = this.getCurrentQuestionState();
    if (!currentState || currentState.isSubmitted) return;

    const index = currentState.selectedOptions.indexOf(optionId);
    if (index > -1) {
      currentState.selectedOptions.splice(index, 1);
    } else {
      currentState.selectedOptions.push(optionId);
    }
    this.updateOptionSelection(currentState);
  }

  /**
   * Update option selection state
   */
  private updateOptionSelection(questionState: QuestionState): void {
    questionState.options.forEach(option => {
      option.selected = questionState.selectedOptions.includes(option.id);
    });
    this.cdr.detectChanges();
  }

  /**
   * Submit current question
   */
  submitCurrentQuestion(): void {
    const currentState = this.getCurrentQuestionState();
    if (!currentState || currentState.selectedOptions.length === 0 || currentState.isSubmitted) {
      return;
    }

    this.componentState = McSliderTaskState.SUBMITTING;

    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      contentElementId: this.taskViewData.contentElementId,
      userId: -1,
      questionId: currentState.questionData.id,
      userMCAnswer: currentState.selectedOptions,
    };

    this.questionDataService
      .createUserAnswer(userAnswerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe(feedback => {
        currentState.feedback = feedback;
        currentState.isSubmitted = true;

        // Update option correctness
        this.updateOptionCorrectness(currentState);

        // Check if answer is correct
        currentState.isCorrect = this.checkQuestionCorrect(currentState);

        // Update total score
        this.updateTotalScore();

        this.componentState = McSliderTaskState.QUESTIONS;
        this.cdr.detectChanges();

        // Rhino-Integration: Fokussiere Rhino nach Fragen-Einreichung
        this.rhinoIntegrationService.handleQuestionSubmission({
          questionIndex: this.currentQuestionIndex,
          totalQuestions: this.questionStates.length,
          score: feedback.score,
          maxScore: currentState.questionData.score,
          isCorrect: currentState.isCorrect,
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: (result) => {
            console.log('🎯 Rhino focus after question submission:', result);
          },
          error: (error) => {
            console.warn('⚠️ Rhino focus failed after question submission:', error);
          }
        });
      });
  }

  /**
   * Update option correctness after submission
   */
  private updateOptionCorrectness(questionState: QuestionState): void {
    if (
      !questionState.mcQuestion.mcQuestionOption ||
      questionState.mcQuestion.mcQuestionOption.length === 0
    ) {
      return;
    }

    const correctOptionIds = questionState.mcQuestion.mcQuestionOption
      .filter(opt => opt.option && opt.option.correct)
      .map(opt => opt.id);

    questionState.options.forEach(option => {
      option.isCorrect = correctOptionIds.includes(option.id);
    });
  }

  /**
   * Check if question was answered correctly
   */
  private checkQuestionCorrect(questionState: QuestionState): boolean {
    const questionScore = questionState.questionData.score || 0;
    const feedbackScore = questionState.feedback?.score || 0;
    return questionScore > 0 && feedbackScore === questionScore;
  }

  /**
   * Update total score calculation
   */
  private updateTotalScore(): void {
    this.totalScore = this.questionStates.reduce((sum, state) => {
      return sum + (state.feedback?.score || 0);
    }, 0);
  }

  /**
   * Submit all questions at once
   */
  submitAllQuestions(): void {
    this.componentState = McSliderTaskState.SUBMITTING;

    const unsubmittedStates = this.questionStates.filter(
      state => !state.isSubmitted && state.selectedOptions.length > 0,
    );

    if (unsubmittedStates.length === 0) {
      this.finishSubmission();
      return;
    }

    let submittedCount = 0;

    unsubmittedStates.forEach(state => {
      const userAnswerData: UserAnswerDataDTO = {
        id: -1,
        contentElementId: this.taskViewData.contentElementId,
        userId: -1,
        questionId: state.questionData.id,
        userMCAnswer: state.selectedOptions,
      };

      this.questionDataService
        .createUserAnswer(userAnswerData)
        .pipe(takeUntil(this.destroy$))
        .subscribe(feedback => {
          state.feedback = feedback;
          state.isSubmitted = true;

          this.updateOptionCorrectness(state);
          state.isCorrect = this.checkQuestionCorrect(state);

          submittedCount++;

          if (submittedCount === unsubmittedStates.length) {
            this.finishSubmission();
          }
        });
    });
  }

  /**
   * Finish submission process
   */
  private finishSubmission(): void {
    this.updateTotalScore();
    this.allSubmitted = true;
    this.componentState = McSliderTaskState.FEEDBACK;

    // Emit final progress
    this.submitClicked.emit(this.totalScore);

    this.cdr.detectChanges();

    // Rhino-Integration: Fokussiere Rhino nach Abschluss aller Fragen
    this.rhinoIntegrationService.handleAllQuestionsCompleted({
      totalQuestions: this.questionStates.length,
      score: this.totalScore,
      maxScore: this.maxScore,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        console.log('🎯 Rhino focus after all questions completed:', result);
      },
      error: (error) => {
        console.warn('⚠️ Rhino focus failed after all questions completed:', error);
      }
    });
  }

  /**
   * Check if all questions are answered
   */
  allQuestionsAnswered(): boolean {
    return this.questionStates.every(
      state => state.selectedOptions.length > 0 || state.isSubmitted,
    );
  }

  /**
   * Get answered questions count
   */
  getAnsweredCount(): number {
    return this.questionStates.filter(
      state => state.selectedOptions.length > 0 || state.isSubmitted,
    ).length;
  }

  /**
   * Get feedback color based on overall score
   */
  getFeedbackColor(): string {
    if (this.maxScore === 0) return '#a3be8c';

    const percentage = this.totalScore / this.maxScore;

    if (percentage === 1) {
      return '#a3be8c'; // Nord green
    } else if (percentage >= 0.5) {
      return '#ebcb8b'; // Nord yellow
    } else {
      return '#bf616a'; // Nord red
    }
  }

  /**
   * Reset current question to try again
   */
  retryCurrentQuestion(): void {
    const currentState = this.getCurrentQuestionState();
    if (!currentState) return;

    currentState.selectedOptions = [];
    currentState.feedback = undefined;
    currentState.isSubmitted = false;
    currentState.isCorrect = undefined;

    // Reset option states
    currentState.options.forEach(option => {
      option.selected = false;
    });

    this.cdr.detectChanges();
  }

  /**
   * Switch to Rhino manually via button
   */
  switchToRhino(): void {
    if (this.isRhinoSwitching || !this.isRhinoAvailable()) {
      return;
    }

    this.isRhinoSwitching = true;
    this.rhinoSwitchAttempts++;

    this.rhinoIntegrationService.handleManualRhinoSwitch({
      source: 'manual_button',
      questionIndex: this.currentQuestionIndex,
      totalQuestions: this.questionStates.length,
      score: this.totalScore,
      maxScore: this.maxScore,
      attempt: this.rhinoSwitchAttempts
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isRhinoSwitching = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (result) => {
        if (result.success) {
          console.log('✅ Manual Rhino switch successful:', result);
          this.rhinoSwitchAttempts = 0; // Reset on success
        } else {
          console.warn('⚠️ Manual Rhino switch failed:', result.message);
          this.handleRhinoSwitchError(result.message);
        }
      },
      error: (error) => {
        console.error('❌ Manual Rhino switch error:', error);
        this.handleRhinoSwitchError(error.message);
      }
    });
  }

  /**
   * Check if Rhino is available
   */
  isRhinoAvailable(): boolean {
    return this.rhinoIntegrationService.isIntegrationAvailable();
  }

  /**
   * Handle Rhino switch error
   */
  private handleRhinoSwitchError(message: string): void {
    if (this.rhinoSwitchAttempts < this.maxRhinoSwitchAttempts) {
      // Retry after a short delay
      setTimeout(() => {
        console.log(`🔄 Retrying Rhino switch (attempt ${this.rhinoSwitchAttempts + 1}/${this.maxRhinoSwitchAttempts})`);
        this.switchToRhino();
      }, 1000);
    } else {
      // Max attempts reached
      console.error('❌ Max Rhino switch attempts reached');
      this.rhinoSwitchAttempts = 0;
      // Could show user notification here if needed
    }
  }

  /**
   * Close dialog or navigate back
   */
  onClose(): void {
    // Rhino-Integration: Fokussiere Rhino beim Schließen der Komponente
    this.rhinoIntegrationService.handleComponentClose({
      totalQuestions: this.questionStates.length,
      score: this.totalScore,
      maxScore: this.maxScore,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        console.log('🎯 Rhino focus on component close:', result);
      },
      error: (error) => {
        console.warn('⚠️ Rhino focus failed on component close:', error);
      }
    });

    if (this.dialogRef) {
      this.dialogRef.close();
    }

    if (this.conceptId) {
      this.location.replaceState(`/dashboard/conceptOverview/${this.conceptId}`);
    } else {
      this.location.replaceState(`/dashboard`);
    }
  }
}
