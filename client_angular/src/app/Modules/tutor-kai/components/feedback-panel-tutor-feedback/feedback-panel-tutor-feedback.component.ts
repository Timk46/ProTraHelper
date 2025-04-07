import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Subject, takeUntil, finalize, catchError, throwError, Observable } from 'rxjs';
import { WorkspaceStateService } from '../../services/workspace-state.service';
import { WorkspaceState } from '../../models/code-submission.model';
import { MarkdownService } from '../../services/markdown/markdown.service';
import { environment } from 'src/environments/environment';
import * as Prism from 'prismjs';
// TODO: Import FeedbackOutput and KcrOutput types/interfaces from shared DTOs
// import { FeedbackOutput, KcrOutput } from '@DTOs/tutorKaiDtos/feedback-output.dto'; // Adjust path as needed
// TODO: Import EvaluateRequestDto type/interface from shared DTOs
// import { EvaluateRequestDto } from '@DTOs/tutorKaiDtos/EvaluateRequest.dto'; // Adjust path as needed
// TODO: Import CodeSubmissionResultDto type/interface from shared DTOs
// import { CodeSubmissionResultDto } from '@DTOs/tutorKaiDtos/submission.dto'; // Adjust path as needed

// Placeholder types/interfaces (replace with actual imports when available)
interface KcrData {
  explanation: string;
  steps: string[];
}
interface FeedbackOutput {
  IT?: string; // Optional internal thoughts
  KCR?: string;
  KM?: string;
  KTC?: string;
  KC?: string;
  KH?: string;
  [key: string]: any; // Allow other potential keys if needed, though we filter
}
type FeedbackKey = 'KCR' | 'KM' | 'KTC' | 'KC' | 'KH'; // Define specific keys for feedback types

type EvaluateRequestDto = any;
type CodeSubmissionResultDto = any;


@Component({
  selector: 'app-feedback-panel-tutor-feedback',
  templateUrl: './feedback-panel-tutor-feedback.component.html',
  styleUrls: ['./feedback-panel-tutor-feedback.component.scss'],
  animations: [
    trigger('expandCollapse', [
      state('false', style({
        height: '0',
        opacity: '0',
        overflow: 'hidden'
      })),
      state('true', style({
        height: '*',
        opacity: '1'
      })),
      transition('false <=> true', animate('300ms ease-in-out'))
    ])
  ]
})
export class FeedbackPanelTutorFeedbackComponent implements OnInit, OnDestroy {
  feedback: FeedbackOutput | null = null;
  isLoading = false;
  // Track expansion state for each feedback section
  expandedSections: Record<FeedbackKey, boolean> = {
    KCR: false,
    KM: false,
    KTC: false,
    KC: false,
    KH: false
  };
  error: string | null = null;
  currentState: WorkspaceState = WorkspaceState.START;

  // Use Record for type safety with FeedbackKey
  feedbackTitles: Record<FeedbackKey, string> = {
    KCR: 'Zeige mir die korrekte Lösung.',
    KM: 'Erkläre die Fehler.',
    KTC: 'Erkläre die Aufgabenstellung.',
    KC: 'Erkläre relevante Konzepte.',
    KH: 'Erkläre, wie ich weiter machen kann.'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private workspaceState: WorkspaceStateService,
    private markdownService: MarkdownService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Subscribe to workspace state
    this.workspaceState.workspaceState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.currentState = state;
        // Optionally reset feedback when state changes, e.g., back to START
        // if (state === WorkspaceState.START) {
        //   this.feedback = null;
        //   this.error = null;
        // }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchFeedback(): void {
    const task = this.workspaceState.getCurrentTask();
    const lastResult = this.workspaceState.getCodeSubmissionResult();

    if (!task || !lastResult) {
      this.error = 'Cannot fetch feedback: Task or submission result is missing.';
      console.error(this.error);
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.feedback = null; // Clear previous feedback

    const requestBody: EvaluateRequestDto = {
      questionId: task.id, // Assuming task has an id property
      relatedCodeSubmissionResult: lastResult
      // Add flavor/feedbackLevel if needed based on final DTO
    };

    this.http.post<FeedbackOutput>(environment.server + '/tutoring-feedback/structured', requestBody) // Ensure API path is correct
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false),
        catchError(err => {
          console.error('Error fetching tutoring feedback:', err);
          this.error = `Failed to load feedback. ${err.error?.message || err.message || 'Unknown error'}`;
          return throwError(() => err); // Re-throw the error
        })
      )
      .subscribe(response => {
        this.feedback = response;
        // TODO: Remove internal thoughts if present and not needed for display
        if (this.feedback?.IT) {
          delete this.feedback.IT;
        }
        console.log('Received feedback:', this.feedback);
      });
  }

  // Adjust signature to handle potential undefined from template access
  parseMarkdown(content: string | undefined): SafeHtml {
    if (!content) return ''; // Return empty string if content is null or undefined
    const parsed = this.markdownService.parse(content);
    return this.sanitizer.bypassSecurityTrustHtml(parsed);
  }


  // --- Rating ---
  showRating(): boolean {
    // Adapted from FeedbackPanelComponent
    // Ensure the second part evaluates strictly to boolean
    return this.currentState === WorkspaceState.FINISHED_FEEDBACK || (!!this.feedback && !this.isLoading && !this.error);
  }

  onRatingSubmitted(rating: number): void {
    // Adapted from FeedbackPanelComponent
    const result = this.workspaceState.getCodeSubmissionResult();
    if (result) {
      this.workspaceState.submitRating(
        rating,
        '', // Empty comment for now
        result.encryptedCodeSubissionId
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('Rating submitted successfully'),
        error: (err) => console.error('Error submitting rating:', err)
      });
    } else {
      console.error('Cannot submit rating: Code submission result is missing.');
    }
  }

  // Helper to get feedback keys for iteration in template, ensuring type safety
  getFeedbackKeys(): FeedbackKey[] {
    if (!this.feedback) return [];
    // Order matters for display
    const orderedKeys: FeedbackKey[] = ['KCR', 'KM', 'KTC', 'KC', 'KH'];
    // Filter keys that exist and have truthy content in the feedback object
    return orderedKeys.filter(key => this.feedback && this.feedback[key]);
  }

  // Toggle a feedback section's expanded state
  toggleSection(key: FeedbackKey): void {
    this.expandedSections[key] = !this.expandedSections[key];
  }
}
