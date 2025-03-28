import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, catchError, finalize, of, tap, throwError } from 'rxjs';
import { QuestionDTO, CodeSubmissionResultDto } from '@DTOs/index';
import { CodeSubmissionResult, FeedbackLevel, FlavorType, WorkspaceState } from '../models/code-submission.model';
import { TaskDataService } from './task-data.service';
import { RunCodeService } from './runCode.service';

/**
 * Service to manage the state of the student workspace
 */
@Injectable({
  providedIn: 'root'
})
export class WorkspaceStateService {
  // State subjects
  private currentTaskSubject = new BehaviorSubject<QuestionDTO | null>(null);
  private workspaceStateSubject = new BehaviorSubject<WorkspaceState>(WorkspaceState.START);
  private codeSubmissionResultSubject = new BehaviorSubject<CodeSubmissionResultDto | null>(null);
  private feedbackSubject = new BehaviorSubject<string>('');
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  readonly currentTask$ = this.currentTaskSubject.asObservable();
  readonly workspaceState$ = this.workspaceStateSubject.asObservable();
  readonly codeSubmissionResult$ = this.codeSubmissionResultSubject.asObservable();
  readonly feedback$ = this.feedbackSubject.asObservable();
  readonly isLoading$ = this.isLoadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor(
    private taskDataService: TaskDataService,
    private runCodeService: RunCodeService
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
      })
    );
  }

  /**
   * Führt den Code aus und gibt das Ergebnis zurück
   */
  executeCode(taskId: number, inputArgs: any[], additionalFiles: Record<string, string>): Observable<CodeSubmissionResultDto> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.runCodeService.executeStudentCode(taskId, inputArgs, additionalFiles).pipe(
      tap(result => {
        this.codeSubmissionResultSubject.next(result);
        this.workspaceStateSubject.next(WorkspaceState.SUBMITTED_CODE);
      }),
      catchError(error => {
        this.errorSubject.next(`Fehler beim Ausführen des Codes: ${error.message}`);
        return throwError(() => error);
      }),
      finalize(() => {
        this.isLoadingSubject.next(false);
      })
    );
  }

  /**
   * Fordert KI-Feedback an
   */
  requestFeedback(taskId: number, flavor: string, level: string, submissionResult: CodeSubmissionResultDto): Observable<string> {
    this.workspaceStateSubject.next(WorkspaceState.GENERATING_FEEDBACK);
    this.feedbackSubject.next('');
    this.errorSubject.next(null);

    return this.runCodeService.getKiFeedback(taskId, flavor, level, submissionResult).pipe(
      tap(feedback => {
        this.feedbackSubject.next(feedback);
        this.workspaceStateSubject.next(WorkspaceState.RECEIVING_FEEDBACK);
      }),
      catchError(error => {
        this.errorSubject.next(`Fehler beim Generieren des Feedbacks: ${error.message}`);
        this.workspaceStateSubject.next(WorkspaceState.SUBMITTED_CODE);
        return throwError(() => error);
      }),
      finalize(() => {
        this.workspaceStateSubject.next(WorkspaceState.FINISHED_FEEDBACK);
      })
    );
  }

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
      })
    );
  }

  /**
   * Setzt den Zustand auf Code-Bearbeitung zurück, wenn der Code geändert wird
   */
  codeChanged(): void {
    if (this.workspaceStateSubject.value !== WorkspaceState.GENERATING_FEEDBACK &&
        this.workspaceStateSubject.value !== WorkspaceState.RECEIVING_FEEDBACK) {
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
}
