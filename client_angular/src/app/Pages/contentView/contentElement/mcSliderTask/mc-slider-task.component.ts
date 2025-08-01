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
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RhinoFocusService } from 'src/app/Services/rhino-focus.service';
import { MatSnackBar } from '@angular/material/snack-bar';

// Extended interface for our options to include correctness information
interface MCOptionViewModel extends MCOptionViewDTO {
  id: number;
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
    private readonly rhinoFocusService: RhinoFocusService,
    private readonly snackBar: MatSnackBar,
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
        questionState.mcQuestion = mcQuestionData as McQuestionDTO;

        // Load options
        this.questionDataService
          .getMCOptions((mcQuestionData as McQuestionDTO).id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(optionsData => {
            questionState.options = (optionsData as MCOptionViewDTO[]).map((option: MCOptionViewDTO) => ({
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
        currentState.feedback = feedback as userAnswerFeedbackDTO;
        currentState.isSubmitted = true;

        // Update option correctness
        this.updateOptionCorrectness(currentState);

        // Check if answer is correct
        currentState.isCorrect = this.checkQuestionCorrect(currentState);

        // Update total score
        this.updateTotalScore();

        this.componentState = McSliderTaskState.QUESTIONS;
        this.cdr.detectChanges();

        // Automatic Rhino integration removed - users can manually focus Rhino using the button
        console.log('Question submitted successfully. Use the Rhino button to manually focus if needed.');
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
          state.feedback = feedback as userAnswerFeedbackDTO;
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

    // Automatic Rhino integration removed - users can manually focus Rhino using the button
    console.log('All questions completed successfully. Use the Rhino button to manually focus if needed.');
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
   * Wechselt manuell zu Rhino über Button-Klick mit vereinfachtem direkten Ansatz
   *
   * Diese Methode ermöglicht es dem Benutzer, das Rhino-Fenster manuell zu fokussieren.
   * Sie verwendet einen vereinfachten Ansatz ohne automatische Auslösung und bietet
   * umfassendes Feedback über den Erfolg oder Misserfolg der Operation.
   *
   * @description
   * Die Methode implementiert einen Schutz gegen mehrfache gleichzeitige Ausführungen
   * durch das `isRhinoSwitching` Flag. Sie nutzt `firstValueFrom()` um das Observable
   * des RhinoFocusService in ein Promise zu konvertieren, was eine saubere async/await
   * Syntax ermöglicht und gleichzeitig die erste Emission des Observables abwartet.
   *
   * @async
   * @returns {Promise<void>} Ein Promise, das aufgelöst wird, wenn die Rhino-Fokussierung
   *                          abgeschlossen ist (erfolgreich oder fehlgeschlagen)
   *
   * @throws {Error} Wirft einen Fehler, wenn die Rhino-Fokussierung fehlschlägt
   *
   * @example
   * ```typescript
   * // Wird typischerweise über Button-Klick aufgerufen
   * await this.switchToRhino();
   * ```
   *
   * @see {@link RhinoFocusService.focusRhinoWindow} - Der zugrundeliegende Service
   *
   * @note
   * `firstValueFrom()` wird hier verwendet, um ein Observable in ein Promise zu konvertieren.
   * Dies ist notwendig, da der RhinoFocusService ein Observable zurückgibt, wir aber
   * eine async/await Syntax für bessere Lesbarkeit und Fehlerbehandlung verwenden möchten.
   * `firstValueFrom()` wartet auf die erste Emission des Observables und löst das Promise
   * mit diesem Wert auf. Falls das Observable einen Fehler emittiert, wird das Promise
   * entsprechend abgelehnt.
   */
  async switchToRhino(): Promise<void> {
    if (this.isRhinoSwitching) {
      return;
    }

    this.isRhinoSwitching = true;

    try {
      console.log('🎯 Focusing Rhino window directly...');

      const result = await firstValueFrom(this.rhinoFocusService.focusRhinoWindow());

      if (result && result.success) {
        console.log('✅ Rhino window focused successfully');
        this.snackBar.open('Rhino erfolgreich fokussiert', 'OK', {
          duration: 2000,
          panelClass: 'success-snackbar'
        });
      } else {
        console.warn('⚠️ Rhino focus failed:', result?.message || 'Unknown error');
        this.snackBar.open(
          `Rhino konnte nicht fokussiert werden: ${result?.message || 'Rhino möglicherweise nicht gestartet'}`,
          'OK',
          {
            duration: 4000,
            panelClass: 'warning-snackbar'
          }
        );
      }
    } catch (error) {
      console.error('❌ Rhino focus error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.snackBar.open(
        `Fehler beim Fokussieren von Rhino: ${errorMessage}`,
        'OK',
        {
          duration: 4000,
          panelClass: 'error-snackbar'
        }
      );
    } finally {
      this.isRhinoSwitching = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Check if Rhino is available - Simplified check
   */
  isRhinoAvailable(): boolean {
    // For manual button clicks, we always allow the attempt
    // The actual availability will be checked during the focus operation
    return true;
  }

  /**
   * Get Rhino button tooltip text
   */
  getRhinoButtonTooltip(): string {
    if (this.isRhinoSwitching) {
      return 'Rhino wird fokussiert...';
    }
    return 'Rhino-Fenster fokussieren';
  }

  /**
   * Close dialog or navigate back
   */
  onClose(): void {
    // Automatic Rhino integration removed - users can manually focus Rhino using the button
    console.log('Component closing. Use the Rhino button to manually focus if needed.');

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
