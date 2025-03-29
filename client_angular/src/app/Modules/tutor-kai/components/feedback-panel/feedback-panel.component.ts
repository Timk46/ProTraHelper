import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { WorkspaceStateService } from '../../services/workspace-state.service';
import { WorkspaceState } from '../../models/code-submission.model';
import { MarkdownService } from '../../services/markdown/markdown.service';

@Component({
  selector: 'app-feedback-panel',
  templateUrl: './feedback-panel.component.html',
  styleUrls: ['./feedback-panel.component.scss']
})
export class FeedbackPanelComponent implements OnInit, OnDestroy {
  feedbackContent = '';
  sanitizedFeedback: SafeHtml = '';
  isGenerating = false;
  generatingMessage = 'Lass mich einen Augenblick über die Aufgabe nachdenken...';

  // Feedback-Level-Optionen
  feedbackLevelOptions = [
    'Wenig Unterstützung',
    'Standard Unterstützung',
    'Viel Unterstützung',
  ];

  selectedLevel = 'Standard Unterstützung';

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
   * Fordert KI-Feedback mit dem gewählten Level an
   */
  getKIFeedback(level: string): void {
    this.selectedLevel = level;

    const task = this.workspaceState.getCurrentTask();
    const lastResult = this.workspaceState.getCodeSubmissionResult();

    if (task && lastResult) {
      this.workspaceState.requestFeedback(
        task.id,
        'Feedback mit Konzept-Erklärung', // Standard-Flavor
        level,
        lastResult
      ).pipe(takeUntil(this.destroy$))
      .subscribe();
    }
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
}
