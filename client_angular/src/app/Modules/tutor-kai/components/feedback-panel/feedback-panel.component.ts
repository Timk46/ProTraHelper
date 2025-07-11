import type { OnDestroy, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import type { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { Observable } from 'rxjs';
import { Subject, takeUntil } from 'rxjs'; // Added Observable import
import type { WorkspaceStateService } from '../../services/workspace-state.service';
import { WorkspaceState } from '../../models/code-submission.model'; // Removed unused imports
import type { MarkdownService } from '../../services/markdown/markdown.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-feedback-panel',
  templateUrl: './feedback-panel.component.html',
  styleUrls: ['./feedback-panel.component.scss'],
  animations: [
    trigger('bubbleAnimation', [
      state(
        'hidden',
        style({
          opacity: 0,
          transform: 'translateY(-20px)',
        }),
      ),
      state(
        'visible',
        style({
          opacity: 1,
          transform: 'translateY(0)',
        }),
      ),
      transition('hidden => visible', [animate('300ms ease-out')]),
      transition('visible => hidden', [animate('200ms ease-in')]),
    ]),
  ],
})
export class FeedbackPanelComponent implements OnInit, OnDestroy {
  feedbackContent = '';
  sanitizedFeedback: SafeHtml = '';
  isGenerating = false;
  generatingMessage = 'Lass mich einen Augenblick über die Aufgabe nachdenken...';

  // Removed properties related to old feedback categories/questions

  // Zustand
  currentState: WorkspaceState = WorkspaceState.START;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly workspaceState: WorkspaceStateService,
    private readonly markdownService: MarkdownService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    // Abonniere den Workspace-Zustand
    this.workspaceState.workspaceState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.currentState = state;
      this.isGenerating =
        state === WorkspaceState.GENERATING_FEEDBACK || state === WorkspaceState.RECEIVING_FEEDBACK;
    });

    // Abonniere Feedback-Inhalt
    this.workspaceState.feedback$.pipe(takeUntil(this.destroy$)).subscribe(feedback => {
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

  // --- New Agent-Specific Feedback Request Methods ---

  private requestAgentFeedback(
    agentRequestFn: (taskId: number, submissionResult: any) => Observable<string>,
  ): void {
    const task = this.workspaceState.getCurrentTask();
    const lastResult = this.workspaceState.getCodeSubmissionResult();

    if (task && lastResult) {
      agentRequestFn
        .call(this.workspaceState, task.id, lastResult)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          // Optional: Add next/error handlers if needed for component-specific logic
          error: (err: any) => console.error('Error requesting agent feedback in component:', err), // Added type for err
        });
    } else {
      console.error('Cannot request feedback: Task or last submission result is missing.');
      // Optionally show an error message to the user
    }
  }

  requestSupervisorFeedback(): void {
    this.requestAgentFeedback(this.workspaceState.requestSupervisorFeedback);
  }

  requestKcFeedback(): void {
    this.requestAgentFeedback(this.workspaceState.requestKcFeedback);
  }

  requestKhFeedback(): void {
    this.requestAgentFeedback(this.workspaceState.requestKhFeedback);
  }

  requestKmFeedback(): void {
    this.requestAgentFeedback(this.workspaceState.requestKmFeedback);
  }

  requestKtcFeedback(): void {
    this.requestAgentFeedback(this.workspaceState.requestKtcFeedback);
  }

  // Removed old methods: selectCategory, requestFeedbackForQuestion, closeQuestionBubble

  /**
   * Behandelt die Bewertungsabgabe
   */
  onRatingSubmitted(rating: number): void {
    const result = this.workspaceState.getCodeSubmissionResult();

    if (result) {
      this.workspaceState
        .submitRating(
          rating,
          '', // Leerer Kommentar
          result.encryptedCodeSubissionId,
        )
        .pipe(takeUntil(this.destroy$))
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

  // Removed getSelectedFeedbackName method
}
