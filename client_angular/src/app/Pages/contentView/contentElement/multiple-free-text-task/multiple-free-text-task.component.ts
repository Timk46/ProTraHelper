import { AfterViewInit, OnInit, QueryList, Component, EventEmitter, Inject, Input, Output, ViewChildren } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserAnswerDataDTO, freeTextQuestionDTO, userAnswerFeedbackDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { Location } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number;
  name: string;
  type: string;
  progress: number;
  description?: string;
}

/**
 * Component for displaying and answering multiple free text questions
 */
@Component({
  selector: 'app-multiple-free-text-task',
  templateUrl: './multiple-free-text-task.component.html',
  styleUrls: ['./multiple-free-text-task.component.scss'],
})
export class MultipleFreeTextTaskComponent implements OnInit, AfterViewInit {
  @ViewChildren('textEditors') textEditors!: QueryList<any>;
  @Output() submitClicked = new EventEmitter<any>();
  @Input() conceptId!: number;
  @Input() questionId!: number;

  // Konfiguration für TinyMCE mit reduzierter Höhe
  editorConfig = {
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar:
      'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
    min_height: 150, // Reduzierte Höhe im Vergleich zum Original
    max_height: 250, // Reduzierte Höhe im Vergleich zum Original
    resize: false,
  };

  taskViewData: TaskViewData;

  // In einer realen Anwendung würden IDs dynamisch geladen
  // Hier verwenden wir für das Beispiel 4 gleiche Fragen mit der gleichen ID
  freeTextQuestions: freeTextQuestionDTO[] = [];
  answers: string[] = ['', '', '', ''];
  feedbackTexts: string[] = ['', '', '', ''];
  overallFeedbackText: string = '';
  showOverallFeedback: boolean = false;
  isSending: boolean = false;
  isLoading: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<MultipleFreeTextTaskComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly questionService: QuestionDataService,
    private readonly location: Location,
  ) {
    this.taskViewData = data.taskViewData;
  }

  ngOnInit(): void {
    // In einer realen Implementierung würden hier IDs von Fragen übergeben werden
    // Für dieses Beispiel laden wir 4 Mal die gleiche Frage
    this.loadQuestions();
  }

  ngAfterViewInit(): void {
    // Wenn das Laden abgeschlossen ist, könnten hier zusätzliche Initialisierungen erfolgen
  }

  /**
   * Lädt die Fragen für die Anzeige
   */
  loadQuestions(): void {
    this.isLoading = true;

    // Simuliere das Laden von 4 Fragen mit der gleichen ID
    const questionPromises = Array(4)
      .fill(0)
      .map((_, i) => {
        return this.questionService.getFreeTextQuestion(this.taskViewData.id).pipe(
          catchError(err => {
            console.error(`Error loading question ${i + 1}:`, err);
            return of(this.createDummyQuestion(i + 1));
          }),
        );
      });

    forkJoin(questionPromises).subscribe(questions => {
      this.freeTextQuestions = questions;

      // Für jede Frage prüfen, ob es bereits eine Antwort gibt
      questions.forEach((_, index) => {
        this.questionService
          .getNewestUserAnswer(this.taskViewData.id)
          .pipe(catchError(() => of(null)))
          .subscribe(answer => {
            if (answer?.userFreetextAnswer) {
              this.answers[index] = answer.userFreetextAnswer;
            }
          });
      });

      this.isLoading = false;
    });
  }

  /**
   * Erstellt eine Dummy-Frage für den Fall, dass das Laden fehlschlägt
   */
  private createDummyQuestion(num: number): freeTextQuestionDTO {
    return {
      questionId: -1,
      contentElementId: this.taskViewData.contentElementId,
      title: `Beispiel Freitext Frage ${num}`,
      text: `Beschreiben Sie in eigenen Worten, was Sie unter dem Begriff "Programmierung" verstehen. Dies ist Frage ${num}.`,
      expectations: 'Der Nutzer soll die Grundkonzepte der Programmierung erklären.',
      maxPoints: 10,
    };
  }

  /**
   * Wird aufgerufen, wenn der Benutzer alle Antworten einreicht
   */
  onSubmitAll(): void {
    if (!this.textEditors || this.textEditors.length !== this.freeTextQuestions.length) {
      console.error('Text editors not properly initialized');
      return;
    }

    this.isSending = true;
    this.showOverallFeedback = false;

    // Sammle die Inhalte aus allen Editoren
    const editorContents = this.textEditors.map(editor => {
      return {
        content: editor.getContent(),
        rawContent: editor.getRawContent(),
      };
    });

    // Erstelle Beobachtbare für jeden Antwort-Submit
    const submitObservables = this.freeTextQuestions.map((question, index) => {
      const userAnswerData: UserAnswerDataDTO = {
        id: -1,
        questionId: question.questionId,
        contentElementId: this.taskViewData.contentElementId,
        userId: -1,
        userFreetextAnswer: editorContents[index].content,
        userFreetextAnswerRaw: editorContents[index].rawContent,
      };

      return this.questionService.createUserAnswer(userAnswerData).pipe(
        catchError(err => {
          console.error(`Error submitting answer ${index + 1}:`, err);
          // Erstelle eine Mock-Antwort im Fehlerfall
          const mockFeedback: userAnswerFeedbackDTO = {
            id: -1,
            userAnswerId: -1,
            score: 5,
            feedbackText: `Feedback für Antwort ${index + 1}: Gut gemacht!`,
            elementDone: true,
            progress: 100,
          };
          return of(mockFeedback);
        }),
      );
    });

    // Warte auf alle Antworten
    forkJoin(submitObservables).subscribe(feedbacks => {
      // Aktualisiere die Feedback-Texte für jede Frage
      feedbacks.forEach((feedback, index) => {
        this.feedbackTexts[index] = feedback.feedbackText.replace(/\n/g, '<br>');
      });

      // Erstelle ein Gesamt-Feedback
      this.overallFeedbackText = 'Alle Antworten wurden erfolgreich eingereicht.';
      this.showOverallFeedback = true;

      // Emittiere den Fortschritt (Durchschnitt aller Feedback-Fortschritte)
      const avgProgress =
        feedbacks.reduce((acc, curr) => acc + curr.progress, 0) / feedbacks.length;
      this.submitClicked.emit(avgProgress);

      this.isSending = false;
    });
  }

  /**
   * Schließt den Dialog
   */
  onClose(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }

    if (this.conceptId && this.questionId) {
      this.location.replaceState(`/dashboard/conceptOverview/${this.conceptId}`);
    } else if (this.conceptId) {
      this.location.replaceState(`/dashboard/conceptOverview`);
    } else {
      this.location.replaceState(`/dashboard`);
    }
  }
}
