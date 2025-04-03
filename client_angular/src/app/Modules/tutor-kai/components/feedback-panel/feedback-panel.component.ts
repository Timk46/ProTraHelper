import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { WorkspaceStateService } from '../../services/workspace-state.service';
import { FeedbackCategory, FeedbackQuestion, FEEDBACK_CATEGORIES, WorkspaceState } from '../../models/code-submission.model';
import { MarkdownService } from '../../services/markdown/markdown.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-feedback-panel',
  templateUrl: './feedback-panel.component.html',
  styleUrls: ['./feedback-panel.component.scss'],
  animations: [
    trigger('bubbleAnimation', [
      state('hidden', style({
        opacity: 0,
        transform: 'translateY(-20px)'
      })),
      state('visible', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      transition('hidden => visible', [
        animate('300ms ease-out')
      ]),
      transition('visible => hidden', [
        animate('200ms ease-in')
      ])
    ])
  ]
})
export class FeedbackPanelComponent implements OnInit, OnDestroy {
  feedbackContent = '';
  sanitizedFeedback: SafeHtml = '';
  isGenerating = false;
  generatingMessage = 'Lass mich einen Augenblick über die Aufgabe nachdenken...';

  // Neue Feedback-Kategorien und -Fragen
  feedbackCategories = FEEDBACK_CATEGORIES;
  selectedCategory: FeedbackCategory | null = null;
  selectedQuestion: FeedbackQuestion | null = null;

  // Zustand
  currentState: WorkspaceState = WorkspaceState.START;

  private destroy$ = new Subject<void>();

  constructor(
    private workspaceState: WorkspaceStateService,
    private markdownService: MarkdownService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Abonniere den Workspace-Zustand
    this.workspaceState.workspaceState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.currentState = state;
        this.isGenerating = state === WorkspaceState.GENERATING_FEEDBACK || state === WorkspaceState.RECEIVING_FEEDBACK;
      });

    // Abonniere Feedback-Inhalt
    this.workspaceState.feedback$
      .pipe(takeUntil(this.destroy$))
      .subscribe(feedback => {
        this.feedbackContent = feedback;
        if (feedback) {
          const parsedMarkdown = this.markdownService.parse(feedback);
          this.sanitizedFeedback = this.sanitizer.bypassSecurityTrustHtml(parsedMarkdown);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Wählt eine Feedback-Kategorie aus
   */
  selectCategory(category: FeedbackCategory): void {
    // Wenn die gleiche Kategorie erneut angeklickt wird, schließe die Sprechblase
    if (this.selectedCategory === category) {
      this.selectedCategory = null;
    } else {
      // Wenn eine neue Kategorie ausgewählt wird, setze sie direkt
      this.selectedCategory = category;
    }
    this.selectedQuestion = null; // Zurücksetzen der ausgewählten Frage
  }

  /**
   * Fordert KI-Feedback für eine spezifische Frage an
   */
  requestFeedbackForQuestion(question: FeedbackQuestion): void {
    this.selectedQuestion = question;
    this.selectedCategory = null; // Schließe die Sprechblase
    
    const task = this.workspaceState.getCurrentTask();
    const lastResult = this.workspaceState.getCodeSubmissionResult();
    
    if (task && lastResult) {
      this.workspaceState.requestFeedback(
        task.id,
        this.selectedQuestion.value, // Feedback Type + Question (e.g. KC_FURTHER_EXPLANATIONS)
        question.value, // Neuer Wert für das Feedback-Level
        lastResult
      ).pipe(takeUntil(this.destroy$))
      .subscribe();
    }
  }

  /**
   * Schließt die Sprechblase, wenn außerhalb geklickt wird
   */
  closeQuestionBubble(): void {
    this.selectedCategory = null;
  }

  /**
   * Behandelt die Bewertungsabgabe
   */
  onRatingSubmitted(rating: number): void {
    const result = this.workspaceState.getCodeSubmissionResult();

    if (result) {
      this.workspaceState.submitRating(
        rating,
        '', // Leerer Kommentar
        result.encryptedCodeSubissionId
      ).pipe(takeUntil(this.destroy$))
      .subscribe();
    }
  }

  /**
   * Prüft, ob der aktuelle Zustand dem übergebenen Zustand entspricht
   */
  isState(state: WorkspaceState): boolean {
    return this.currentState === state;
  }

  /**
   * Prüft, ob Feedback-Optionen angezeigt werden sollen
   */
  showFeedbackOptions(): boolean {
    return this.currentState === WorkspaceState.SUBMITTED_CODE;
  }

  /**
   * Prüft, ob das Feedback-Bewertungssystem angezeigt werden soll
   */
  showRating(): boolean {
    return this.currentState === WorkspaceState.FINISHED_FEEDBACK;
  }

  /**
   * Gibt den Anzeigenamen für die ausgewählte Feedback-Frage zurück
   */
  getSelectedFeedbackName(): string {
    if (this.selectedCategory && this.selectedQuestion) {
      return `${this.selectedCategory.icon} ${this.selectedQuestion.text}`;
    }
    return '';
  }
}
