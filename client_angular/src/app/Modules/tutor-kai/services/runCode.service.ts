import { CodeSubmissionResultDto } from '@DTOs/index';
import { HttpClient } from '@angular/common/http'; // Removed unused imports
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FeedbackLevel, FlavorType } from '../models/code-submission.model'; // Import enums

/**
 * A service for running and managing user code submissions.
 */
@Injectable({
  providedIn: 'root',
})
export class RunCodeService {
  private readonly runCodeApiUrl = environment.server + '/run-code'; // Renamed for clarity
  private readonly langgraphApiUrl = environment.server + '/langgraph-feedback'; // New API base URL

  constructor(private readonly http: HttpClient) {}

  /**
   * Executes multiple files of user-submitted code on the server.
   *
   * @param taskId - The ID of the task the code is associated with.
   * @param inputArgs - Arguments provided for execution.
   * @param additionalFiles - A dictionary of filename (key) and source code (value) pairs for additional files.
   * @returns An Observable with the server's response.
   */
  executeStudentCode(
    taskId: number,
    inputArgs: string[],
    additionalFiles: { [fileName: string]: string },
  ): Observable<CodeSubmissionResultDto> {
    const body = {
      taskId: taskId,
      inputArgs: inputArgs,
      CodeFiles: additionalFiles,
    };
    return this.http.post<CodeSubmissionResultDto>(`${this.runCodeApiUrl}/execute`, body);
  }

  // --- New Agent-Specific Feedback Methods ---

  private getAgentFeedback(
    endpoint: string,
    questionId: number,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    const body = {
      questionId: questionId,
      flavor: FlavorType.STANDARD, // Use default flavor
      feedbackLevel: FeedbackLevel.STANDARD, // Use default level
      relatedCodeSubmissionResult: relatedCodeSubmissionResult,
    };
    return this.http
      .post<{ feedback: string | null }>(`${this.langgraphApiUrl}/${endpoint}`, body)
      .pipe(
        map(response => response?.feedback ?? ''), // Extract the feedback string, default to empty string if null/undefined
        catchError(error => {
          console.error(`Error fetching ${endpoint} feedback:`, error);
          throw error; // Re-throw the error to be handled by the caller
        }),
      );
  }

  getSupervisorFeedback(
    questionId: number,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    return this.getAgentFeedback('supervisor', questionId, relatedCodeSubmissionResult);
  }

  getKcFeedback(
    questionId: number,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    return this.getAgentFeedback('kc', questionId, relatedCodeSubmissionResult);
  }

  getKhFeedback(
    questionId: number,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    return this.getAgentFeedback('kh', questionId, relatedCodeSubmissionResult);
  }

  getKmFeedback(
    questionId: number,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    return this.getAgentFeedback('km', questionId, relatedCodeSubmissionResult);
  }

  getKtcFeedback(
    questionId: number,
    relatedCodeSubmissionResult: CodeSubmissionResultDto,
  ): Observable<string> {
    return this.getAgentFeedback('ktc', questionId, relatedCodeSubmissionResult);
  }

  // Old getKiFeedback method removed

  /**
   * Posts user feedback (rating and comment) on the code execution.
   *
   * @param rating - The rating given by the user (1-5).
   * @param feedback - The user's written feedback on the code execution.
   * @param lastSubmissionId - The ID of the last code submission (which is the submission associated with the feedback).
   * @returns An Observable with the server's response.
   */
  postFeedback(rating: number, feedback: string, lastSubmissionId: string): Observable<any> {
    const body = {
      rating: rating,
      feedback: feedback,
      lastSubmissionId: lastSubmissionId,
    };
    return this.http.post<any>(`${this.runCodeApiUrl}/post-Feedback`, body);
  }
}
