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
import { MCOptionViewDTO, McQuestionDTO, TaskViewData } from '@DTOs/index';
import { QuestionDTO, McQuestionOptionDTO } from '@DTOs/index';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RhinoFocusService } from 'src/app/Services/rhino-focus.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfettiService } from 'src/app/Services/animations/confetti.service';

// Threshold for partial credit - 60% is considered correct for MC-Slider questions
const PARTIAL_CREDIT_THRESHOLD = 0.6;

// Extended interface for our options to include correctness information
interface MCOptionViewModel extends MCOptionViewDTO {
  id: number;
  isCorrect?: boolean;
}

// Question state interface for tracking individual questions
interface QuestionState {
  questionData: QuestionDTO; // Can be QuestionDTO or taskViewDTO
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
    private readonly confettiService: ConfettiService,
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

    // Sort questions by ID to ensure correct order (first question first)
    this.questions.sort((a, b) => (a.id || 0) - (b.id || 0));

    console.log(
      '[MC-Slider] Questions loaded in order:',
      this.questions.map(q => `ID: ${q.id}, Name: ${q.name}`),
    );

    // Ensure we start with the first question
    this.currentQuestionIndex = 0;
    this.loadQuestionAtIndex(0);
  }

  /**
   * Load question data at specific index
   */
  private loadQuestionAtIndex(index: number): void {
    if (index >= this.questions.length) {
      // All questions loaded - ensure we start with the first question
      this.currentQuestionIndex = 0;
      this.componentState = McSliderTaskState.QUESTIONS;
      console.log(
        `[MC-Slider] All ${this.questions.length} questions loaded. Starting with question index: ${this.currentQuestionIndex}`,
      );
      this.cdr.detectChanges();
      return;
    }

    const questionData = this.questions[index];

    // Debug Score-Handling
    console.log(`[MC-Slider Debug] Question ${index + 1} (ID: ${questionData.id}):`);
    console.log(`  - Raw score from backend:`, questionData.score);
    console.log(`  - Type of score:`, typeof questionData.score);
    console.log(`  - Is null/undefined:`, questionData.score == null);

    // Initialize question state
    const questionState: QuestionState = {
      questionData: {
        ...questionData,
        score: questionData.score ?? 3, // Nullish coalescing: nur bei null/undefined fallback
      },
      mcQuestion: this.getEmptyMcQuestion(),
      options: [],
      selectedOptions: [],
      isSubmitted: false,
    };

    console.log(
      `[MC-Slider] Question ${questionData.id} initialized with final score: ${questionState.questionData.score}`,
    );
    console.log(`  - Original: ${questionData.score} → Final: ${questionState.questionData.score}`);

    // Load MC question data
    this.questionDataService
      .getMCQuestion(questionData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mcQuestionData => {
        questionState.mcQuestion = mcQuestionData as McQuestionDTO;

        // Fragetext aus mcQuestion übernehmen falls questionData.text fehlt
        if (mcQuestionData.textHTML && !questionState.questionData.text) {
          questionState.questionData.text = mcQuestionData.textHTML;
          console.log(
            `[MC-Slider] Question text loaded from mcQuestion: ${mcQuestionData.textHTML}`,
          );
        } else if (!questionState.questionData.text) {
          // Fallback-Text falls auch mcQuestion keinen Text hat
          questionState.questionData.text = `Frage ${index + 1}: Wählen Sie die richtigen Antworten aus.`;
          console.log(`[MC-Slider] Using fallback question text for question ${questionData.id}`);
        }

        // Load options
        this.questionDataService
          .getMCOptions((mcQuestionData as McQuestionDTO).id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(optionsData => {
            questionState.options = (optionsData as MCOptionViewDTO[]).map(
              (option: MCOptionViewDTO) => ({
                ...option,
                isCorrect: undefined,
              }),
            );

            // Shuffle options if enabled
            if (questionState.mcQuestion.shuffleOptions) {
              questionState.options.sort(() => Math.random() - 0.5);
            }

            this.questionStates[index] = questionState;
            this.maxScore += questionData.score ?? 0;

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

        // Celebrate if answer is correct (75% or higher)
        // Use backend feedback as authoritative source for max score
        const feedbackScore = currentState.feedback?.score ?? 0;
        const maxScoreFromBackend = this.extractMaxScoreFromFeedback(
          currentState.feedback?.feedbackText,
        );
        const questionScore = maxScoreFromBackend ?? currentState.questionData.score ?? 3;
        const scoreRatio = questionScore > 0 ? feedbackScore / questionScore : 0;

        console.log(
          `[MC-Slider Debug] After feedback received for question ${currentState.questionData.id}:`,
        );
        console.log(
          `  - questionScore: ${questionScore} (backend-extracted: ${maxScoreFromBackend}, input: ${currentState.questionData.score})`,
        );
        console.log(`  - feedbackScore: ${feedbackScore}`);
        console.log(`  - scoreRatio: ${scoreRatio}`);
        console.log(`  - isCorrect: ${currentState.isCorrect}`);
        console.log(`  - isSingleChoice: ${this.isSingleChoice(currentState)}`);
        console.log(`  - feedbackStatus: ${this.getFeedbackStatus()}`);
        console.log(`  - shouldCelebrate: ${scoreRatio >= 0.75}`);
        console.log(`  - feedbackText: "${currentState.feedback?.feedbackText}"`);

        if (scoreRatio >= 0.75) {
          this.celebrateCorrectAnswer(scoreRatio);
        }

        // Update total score
        this.updateTotalScore();

        // Comprehensive debug summary after question feedback
        console.log(`[MC-Slider] ========== QUESTION FEEDBACK SUMMARY ==========`);
        console.log(`Question ID: ${currentState.questionData.id}`);
        console.log(
          `Question Type: ${this.isSingleChoice(currentState) ? 'Single Choice' : 'Multiple Choice'}`,
        );
        console.log(`Frontend questionData.score: ${currentState.questionData.score}`);
        console.log(`Backend feedbackScore: ${feedbackScore}`);
        console.log(`Backend maxScore extracted: ${maxScoreFromBackend}`);
        console.log(`Final questionScore used: ${questionScore}`);
        console.log(`Score ratio: ${scoreRatio}`);
        console.log(`Is correct: ${currentState.isCorrect}`);
        console.log(`Feedback status: ${this.getFeedbackStatus()}`);
        console.log(`Should celebrate (ratio >= 0.75): ${scoreRatio >= 0.75}`);
        console.log(`Backend feedback text: "${currentState.feedback?.feedbackText}"`);
        console.log(`[MC-Slider] ===============================================`);

        this.componentState = McSliderTaskState.QUESTIONS;
        this.cdr.detectChanges();

        // Automatic Rhino integration removed - users can manually focus Rhino using the button
        console.log(
          'Question submitted successfully. Use the Rhino button to manually focus if needed.',
        );
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
   * Uses partial credit threshold (60%) to determine correctness
   * Uses backend feedback as authoritative source for max score
   */
  private checkQuestionCorrect(questionState: QuestionState): boolean {
    const feedbackScore = questionState.feedback?.score!;

    // Extract max score from backend feedback text (authoritative source)
    const maxScoreFromBackend = this.extractMaxScoreFromFeedback(
      questionState.feedback?.feedbackText,
    );
    const questionScore = maxScoreFromBackend ?? questionState.questionData.score ?? 3;

    console.log(
      `[MC-Slider] checkQuestionCorrect: questionScore=${questionScore} (backend: ${maxScoreFromBackend}), feedbackScore=${feedbackScore}`,
    );

    if (questionScore <= 0) {
      console.warn('[MC-Slider] Warning: questionScore is 0 or negative!');
      // Bei fehlendem Score auf Feedback-basierte Bewertung zurückfallen
      return feedbackScore > 0;
    }

    const scoreRatio = feedbackScore / questionScore;
    console.log(
      `[MC-Slider] scoreRatio=${scoreRatio}, threshold=${PARTIAL_CREDIT_THRESHOLD}, isCorrect=${scoreRatio >= PARTIAL_CREDIT_THRESHOLD}`,
    );
    return scoreRatio >= PARTIAL_CREDIT_THRESHOLD;
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
   * Celebrate correct answer with confetti and success message
   */
  private celebrateCorrectAnswer(scoreRatio: number): void {
    // Show confetti animation
    this.confettiService.celebrate(3, 500);

    // Show success message
    const percentage = Math.round(scoreRatio * 100);
    this.snackBar.open(
      `Großartig! Du hast ${percentage}% der Frage korrekt beantwortet! 🎉`,
      'Schließen',
      {
        duration: 3000,
        panelClass: ['success-snackbar'],
      },
    );
  }

  /**
   * Check if a question is Single Choice (only one correct option)
   * Uses the authoritative mcQuestion.isSC property instead of counting options
   */
  isSingleChoice(questionState: QuestionState): boolean {
    // Use mcQuestion.isSC directly - this is the authoritative source
    // and is available before option.isCorrect is set
    return questionState.mcQuestion?.isSC || false;
  }

  /**
   * Get score ratio for current question state (0-1)
   * Extracts max score from backend feedback for accurate ratio calculation
   */
  getCurrentScoreRatio(): number {
    const currentState = this.getCurrentQuestionState();
    if (!currentState || !currentState.feedback) return 0;

    const feedbackScore = currentState.feedback.score || 0;

    // Extract max score from backend feedback text (authoritative source)
    const maxScoreFromBackend = this.extractMaxScoreFromFeedback(
      currentState.feedback.feedbackText,
    );
    const questionScore = maxScoreFromBackend ?? currentState.questionData.score ?? 3;

    console.log(
      `[MC-Slider] getCurrentScoreRatio: questionScore=${questionScore} (backend: ${maxScoreFromBackend}, input: ${currentState.questionData.score}), feedbackScore=${feedbackScore}, ratio=${feedbackScore / questionScore}`,
    );
    console.log(`[MC-Slider] Is Single Choice: ${this.isSingleChoice(currentState)}`);

    if (questionScore <= 0) return 0;
    return Math.min(feedbackScore / questionScore, 1);
  }

  /**
   * Extract maximum score from backend feedback text
   * Parses "X von Y Punkten" pattern to get authoritative max score
   */
  private extractMaxScoreFromFeedback(feedbackText?: string): number | null {
    if (!feedbackText) {
      console.log(`[MC-Slider] No feedback text provided for score extraction`);
      return null;
    }

    console.log(`[MC-Slider] Attempting to extract max score from: "${feedbackText}"`);

    // Try multiple patterns to be more robust
    const patterns = [
      /Punktzahl:\s*\d+\s*von\s*(\d+)\s*Punkt/i, // "Punktzahl: X von Y Punkten"
      /(\d+)\s*von\s*(\d+)\s*Punkt/i, // "X von Y Punkten" (general)
      /von\s*(\d+)\s*Punkt/i, // "von Y Punkten" (fallback)
    ];

    for (let i = 0; i < patterns.length; i++) {
      const match = feedbackText.match(patterns[i]);
      if (match) {
        // For pattern 1 and 3, use match[1]; for pattern 2, use match[2]
        const maxScoreStr = i === 1 ? match[2] : match[1];
        if (maxScoreStr) {
          const maxScore = parseInt(maxScoreStr, 10);
          if (!isNaN(maxScore) && maxScore > 0) {
            console.log(`[MC-Slider] ✅ Extracted max score ${maxScore} using pattern ${i + 1}`);
            return maxScore;
          }
        }
      }
    }

    console.log(`[MC-Slider] ❌ Could not extract max score from: "${feedbackText}"`);
    console.log(
      `[MC-Slider] Tried patterns:`,
      patterns.map(p => p.toString()),
    );
    return null;
  }

  /**
   * Get feedback status for current question
   */
  getFeedbackStatus(): 'perfect' | 'correct' | 'partial' | 'wrong' {
    const currentState = this.getCurrentQuestionState();
    const scoreRatio = this.getCurrentScoreRatio();
    const isSingleChoice = currentState ? this.isSingleChoice(currentState) : false;

    // Comprehensive debug logging for feedback status
    console.log(`[MC-Slider] getFeedbackStatus() Debug:`);
    console.log(`  - currentState exists: ${!!currentState}`);
    console.log(`  - scoreRatio: ${scoreRatio}`);
    console.log(`  - isSingleChoice: ${isSingleChoice}`);

    if (currentState) {
      console.log(`  - questionId: ${currentState.questionData.id}`);
      console.log(`  - feedback exists: ${!!currentState.feedback}`);
      if (currentState.feedback) {
        console.log(`  - feedbackScore: ${currentState.feedback.score}`);
        console.log(`  - feedbackText: "${currentState.feedback.feedbackText}"`);
      }
      console.log(`  - questionData.score: ${currentState.questionData.score}`);
    }

    let status: 'perfect' | 'correct' | 'partial' | 'wrong';

    // For Single Choice questions, it's either 100% correct or 0% wrong
    if (currentState && isSingleChoice) {
      status = scoreRatio === 1 ? 'perfect' : 'wrong';
    } else {
      // For Multiple Choice questions, use gradual scoring
      if (scoreRatio === 1)
        status = 'perfect'; // 100% - Perfekt
      else if (scoreRatio >= 0.75)
        status = 'correct'; // 75-99% - Richtig
      else if (scoreRatio >= 0.6)
        status = 'partial'; // 60-74% - Teilweise richtig
      else status = 'wrong'; // <60% - Falsch
    }

    console.log(`  - final status: ${status}`);
    console.log(`[MC-Slider] getFeedbackStatus() End`);

    return status;
  }

  /**
   * Get score ratio for specific question by index
   * Uses backend feedback as authoritative source for max score
   */
  getQuestionScoreRatio(index: number): number {
    const state = this.questionStates[index];
    if (!state || !state.feedback) return 0;

    const feedbackScore = state.feedback.score || 0;

    // Extract max score from backend feedback text (authoritative source)
    const maxScoreFromBackend = this.extractMaxScoreFromFeedback(state.feedback.feedbackText);
    const questionScore = maxScoreFromBackend ?? state.questionData.score ?? 3;

    if (questionScore <= 0) return 0;
    return Math.min(feedbackScore / questionScore, 1);
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

          // Enhanced debug logging for scoring
          const feedbackScore = state.feedback?.score || 0;
          const maxScoreFromBackend = this.extractMaxScoreFromFeedback(
            state.feedback?.feedbackText,
          );
          const questionScore = maxScoreFromBackend ?? state.questionData.score ?? 0;
          const scoreRatio = questionScore > 0 ? feedbackScore / questionScore : 0;
          const isSingleChoice = this.isSingleChoice(state);

          console.log(`[MC-Slider] Question submission completed:`, {
            questionId: state.questionData.id,
            questionText: state.questionData.text?.substring(0, 50) + '...',
            isSingleChoice: isSingleChoice,
            maxScore: questionScore,
            achievedScore: feedbackScore,
            scoreRatio: scoreRatio,
            feedbackText: state.feedback?.feedbackText || 'No feedback text',
            selectedOptions: state.selectedOptions,
            correctOptions: state.options.filter(opt => opt.isCorrect).map(opt => opt.id),
            isCorrect: state.isCorrect,
          });

          if (scoreRatio >= 0.75 && submittedCount === 0) {
            console.log(`[MC-Slider Debug] Bulk submission celebration: scoreRatio=${scoreRatio}`);
            this.celebrateCorrectAnswer(scoreRatio);
          }

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
    console.log(
      'All questions completed successfully. Use the Rhino button to manually focus if needed.',
    );
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
   * Fokussiert ein bereits laufendes Rhino-Fenster ohne automatisches Starten
   *
   * Diese Methode fokussiert nur ein bereits geöffnetes Rhino-Fenster und bringt es
   * in den Vordergrund. Falls Rhino nicht läuft, wird eine entsprechende Meldung angezeigt.
   *
   * @description
   * Die Methode implementiert einen Schutz gegen mehrfache gleichzeitige Ausführungen
   * durch das `isRhinoSwitching` Flag. Sie nutzt die focus-only Funktionalität,
   * die NUR fokussiert und niemals automatisch Rhino startet.
   *
   * @async
   * @returns {Promise<void>} Ein Promise, das aufgelöst wird, wenn die Rhino-Fokussierung
   *                          abgeschlossen ist (erfolgreich oder fehlgeschlagen)
   *
   * @throws {Error} Wirft einen Fehler, wenn die Rhino-Fokussierung fehlschlägt
   *
   * @example
   * ```typescript
   * // Wird über Button-Klick aufgerufen
   * await this.switchToRhino();
   * ```
   *
   * @see {@link RhinoFocusService.focusOnlyRhino} - Der focus-only Service
   *
   * @note
   * `firstValueFrom()` wird hier verwendet, um ein Observable in ein Promise zu konvertieren.
   * Die focus-only Methode versucht nur zu fokussieren und startet niemals automatisch Rhino.
   */
  async switchToRhino(): Promise<void> {
    if (this.isRhinoSwitching) {
      return;
    }

    this.isRhinoSwitching = true;

    try {

      // Use direct focus approach - never launches Rhino
      const result = await firstValueFrom(this.rhinoFocusService.focusRhinoWindowUnified());

      if (result && result.success) {
        // Successful focus
        let message = '';
        let icon = '';

        // UnifiedRhinoFocusResponseDTO doesn't have 'action' field, use implementation info
        switch (result.implementation) {
          case 'native':
            message = 'Rhino-Fenster erfolgreich fokussiert (native)';
            icon = '🎯';
            break;
          case 'powershell':
            message = 'Rhino-Fenster erfolgreich fokussiert (PowerShell)';
            icon = '🎯';
            break;
          default:
            message = 'Rhino-Fenster erfolgreich fokussiert';
            icon = '🎯';
        }

        console.log(`${icon} ${message}`, result);
        this.snackBar.open(`${icon} ${message}`, 'OK', {
          duration: 3000,
          panelClass: 'success-snackbar',
        });
      } else {

        let userMessage = '';
        let actionText = 'OK';
        
        // Check if Rhino is not running (UnifiedRhinoFocusResponseDTO structure)
        if (result?.message?.includes('Keine Rhino-Fenster gefunden') || 
            result?.message?.includes('No Rhino windows found')) {
          userMessage = 'Rhino ist nicht geöffnet. Bitte starten Sie Rhino zuerst über den regulären Rhino-Button.';
          actionText = 'Verstanden';
        } else {
          userMessage = result?.message || 'Rhino-Fenster konnte nicht fokussiert werden';
        }

        this.snackBar.open(`ℹ️ ${userMessage}`, actionText, {
          duration: 6000,
          panelClass: 'warning-snackbar',
        });
      }
    } catch (error) {
      console.error('❌ Rhino focus error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.snackBar.open(`❌ Fehler beim Fokussieren von Rhino: ${errorMessage}`, 'OK', {
        duration: 5000,
        panelClass: 'error-snackbar',
      });
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
   * Get Rhino button tooltip text for focus-only functionality
   */
  getRhinoButtonTooltip(): string {
    if (this.isRhinoSwitching) {
      return 'Rhino-Fenster wird fokussiert...';
    }
    return 'Rhino-Fenster fokussieren (bringt bereits geöffnetes Rhino in den Vordergrund)';
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
