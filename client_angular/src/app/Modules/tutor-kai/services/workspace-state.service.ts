import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BehaviorSubject, Subject, catchError, finalize, of, tap, throwError } from 'rxjs';
import { QuestionDTO, CodeSubmissionResultDto } from '@DTOs/index';
import { CodeSubmissionResult, TestResult } from '../models/code-submission.model';
import { FeedbackLevel, FlavorType, WorkspaceState } from '../models/code-submission.model'; // Merged TestResult import
import { TaskDataService } from './task-data.service';
import { RunCodeService } from './runCode.service';

/**
 * Service to manage the state of the student workspace
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspaceStateService {
  // State subjects
  private readonly currentTaskSubject = new BehaviorSubject<QuestionDTO | null>(null);
  private readonly workspaceStateSubject = new BehaviorSubject<WorkspaceState>(
    WorkspaceState.START,
  );
  private readonly codeSubmissionResultSubject =
    new BehaviorSubject<CodeSubmissionResultDto | null>(null);
  private readonly feedbackSubject = new BehaviorSubject<string>('');
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly currentFeedbackIdSubject = new BehaviorSubject<string | null>(null); // Added for feedback ID

  // Public observables
  readonly currentTask$ = this.currentTaskSubject.asObservable();
  readonly workspaceState$ = this.workspaceStateSubject.asObservable();
  readonly codeSubmissionResult$ = this.codeSubmissionResultSubject.asObservable();
  readonly feedback$ = this.feedbackSubject.asObservable();
  readonly isLoading$ = this.isLoadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly currentFeedbackId$ = this.currentFeedbackIdSubject.asObservable(); // Added observable for feedback ID

  constructor(
    private readonly taskDataService: TaskDataService,
    private readonly runCodeService: RunCodeService,
  ) {}

  /**
   * Lädt eine Aufgabe anhand ihrer ID
   */
  loadTask(taskId: number): Observable<QuestionDTO> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.taskDataService.getTask(taskId).pipe(
      tap(task => {
        this.currentTaskSubject.next(task);
        this.workspaceStateSubject.next(WorkspaceState.EDITING_CODE);
      }),
      catchError(error => {
        this.errorSubject.next(`Fehler beim Laden der Aufgabe ${taskId}: ${error.message}`);
        return throwError(() => error);
      }),
      finalize(() => {
        this.isLoadingSubject.next(false);
      }),
    );
  }

  /**
   * Führt den Code aus und gibt das Ergebnis zurück
   */
  executeCode(
    taskId: number,
    inputArgs: any[],
    additionalFiles: Record<string, string>,
  ): Observable<CodeSubmissionResultDto> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.runCodeService.executeStudentCode(taskId, inputArgs, additionalFiles).pipe(
      tap(result => {
        // Default to null if result or nested properties are missing
        let finalResultForSubject: CodeSubmissionResultDto | null = null;

        if (result?.CodeSubmissionResult) {
          let frontendTestResults: TestResult[] = []; // Default to empty array

          // Transform backend results if they exist
          if (result.CodeSubmissionResult.testResults) {
            const backendTestResults = result.CodeSubmissionResult.testResults as any[];
            frontendTestResults = backendTestResults.map((test: any) => {
              const transformedTest: TestResult = {
                name: test.test || '',
                passed: test.status === 'SUCCESSFUL',
                exception: test.exception,
              };
              return transformedTest;
            });
          }

          // Create a new object conforming to the DTO structure expected by the Subject
          finalResultForSubject = {
            CodeSubmissionResult: {
              output: result.CodeSubmissionResult.output ?? '', // Provide default empty string if null
              score: result.CodeSubmissionResult.score,
              testsPassed: result.CodeSubmissionResult.testsPassed ?? false, // Provide default false if null/undefined
              testResults: frontendTestResults, // Use the transformed results
            },
            encryptedCodeSubissionId: result.encryptedCodeSubissionId,
          };
        }

        // Emit the correctly typed frontend object (or null)
        this.codeSubmissionResultSubject.next(finalResultForSubject);
        this.workspaceStateSubject.next(WorkspaceState.SUBMITTED_CODE);
        console.log(JSON.stringify(this.codeSubmissionResultSubject));
      }),
      catchError(error => {
        this.errorSubject.next(`Fehler beim Ausführen des Codes: ${error.message}`);
        return throwError(() => error);
      }),
      finalize(() => {
        this.isLoadingSubject.next(false);
      }),
    );
  }

  // --- New Agent-Specific Feedback Request Methods ---

  /**
   * Helper method to handle the common logic for requesting feedback from an agent.
   */
  private requestAgentFeedback(
    agentRequest$: Observable<string>,
    agentName: string, // For logging/error messages
  ): Observable<string> {
    this.workspaceStateSubject.next(WorkspaceState.GENERATING_FEEDBACK);
    this.feedbackSubject.next('');
    this.errorSubject.next(null);

    return agentRequest$.pipe(
      tap(feedback => {
        this.feedbackSubject.next(feedback);
        this.workspaceStateSubject.next(WorkspaceState.RECEIVING_FEEDBACK);
      }),
      catchError(error => {
        this.errorSubject.next(
          `Fehler beim Generieren des ${agentName}-Feedbacks: ${error.message}`,
        );
        this.workspaceStateSubject.next(WorkspaceState.SUBMITTED_CODE); // Reset state on error
        return throwError(() => error);
      }),
      finalize(() => {
        // Ensure state transitions correctly even if there's an error before finalize
        if (this.workspaceStateSubject.value === WorkspaceState.RECEIVING_FEEDBACK) {
          this.workspaceStateSubject.next(WorkspaceState.FINISHED_FEEDBACK);
        }
      }),
    );
  }

  requestSupervisorFeedback(
    taskId: number,
    submissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    const agentRequest$ = this.runCodeService.getSupervisorFeedback(taskId, submissionResult);
    return this.requestAgentFeedback(agentRequest$, 'Supervisor');
  }

  requestKcFeedback(taskId: number, submissionResult: CodeSubmissionResultDto): Observable<string> {
    const agentRequest$ = this.runCodeService.getKcFeedback(taskId, submissionResult);
    return this.requestAgentFeedback(agentRequest$, 'KC');
  }

  requestKhFeedback(taskId: number, submissionResult: CodeSubmissionResultDto): Observable<string> {
    const agentRequest$ = this.runCodeService.getKhFeedback(taskId, submissionResult);
    return this.requestAgentFeedback(agentRequest$, 'KH');
  }

  requestKmFeedback(taskId: number, submissionResult: CodeSubmissionResultDto): Observable<string> {
    const agentRequest$ = this.runCodeService.getKmFeedback(taskId, submissionResult);
    return this.requestAgentFeedback(agentRequest$, 'KM');
  }

  requestKtcFeedback(
    taskId: number,
    submissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    const agentRequest$ = this.runCodeService.getKtcFeedback(taskId, submissionResult);
    return this.requestAgentFeedback(agentRequest$, 'KTC');
  }

  // Old requestFeedback method removed

  /**
   * Sendet eine Bewertung für das erhaltene Feedback
   */
  submitRating(rating: number, comment: string, submissionId: string): Observable<any> {
    return this.runCodeService.postFeedback(rating, comment, submissionId).pipe(
      tap(() => {
        this.workspaceStateSubject.next(WorkspaceState.FEEDBACK_RATED);
      }),
      catchError(error => {
        this.errorSubject.next(`Fehler beim Senden des Feedbacks: ${error.message}`);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Setzt den Zustand auf Code-Bearbeitung zurück, wenn der Code geändert wird
   */
  codeChanged(): void {
    if (
      this.workspaceStateSubject.value !== WorkspaceState.GENERATING_FEEDBACK &&
      this.workspaceStateSubject.value !== WorkspaceState.RECEIVING_FEEDBACK
    ) {
      this.workspaceStateSubject.next(WorkspaceState.EDITING_CODE);
    }
  }

  /**
   * Liefert den aktuellen Zustand zurück
   */
  getCurrentState(): WorkspaceState {
    return this.workspaceStateSubject.value;
  }

  /**
   * Liefert das aktuelle Ergebnis der Code-Ausführung zurück
   */
  getCodeSubmissionResult(): CodeSubmissionResultDto | null {
    return this.codeSubmissionResultSubject.value;
  }

  /**
   * Liefert die aktuelle Aufgabe zurück
   */
  getCurrentTask(): QuestionDTO | null {
    return this.currentTaskSubject.value;
  }

  /**
   * Sets the current feedback ID.
   */
  setFeedbackId(id: string | null): void {
    this.currentFeedbackIdSubject.next(id);
  }

  /**
   * Gets the current feedback ID synchronously.
   */
  getCurrentFeedbackId(): string | null {
    return this.currentFeedbackIdSubject.value;
  }
}
