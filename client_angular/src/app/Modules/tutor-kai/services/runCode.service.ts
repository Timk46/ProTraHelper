import { CodeSubmissionResultDto } from '@DTOs/index';
import { HttpClient, HttpDownloadProgressEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * A service for running and managing user code submissions.
 */
@Injectable({
  providedIn: 'root',
})
export class RunCodeService {
  private apiUrl = environment.server + '/run-code';

  constructor(private http: HttpClient) { }

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
    additionalFiles: { [fileName: string]: string }
  ): Observable<CodeSubmissionResultDto> {
    const body = {
      taskId: taskId,
      inputArgs: inputArgs,
      CodeFiles: additionalFiles,
    };
    return this.http.post<CodeSubmissionResultDto>(`${this.apiUrl}/execute`, body);
  }

  /**
   * Gets feedback on the user-submitted code.
   *
   * @param code - The source code to be evaluated.
   * @param task - The task the code is associated with.
   * @param language - The programming language of the submitted code.
   * @param CodeSubmissionResultDto - The result of the code execution and the ID of the last code submission (which is the submission associated with the feedback)
   * @returns An Observable with the LLM generated Feedback string.
   */
  getKiFeedback(
    questionId: number,
    flavor: string,
    relatedCodeSubmissionResult: CodeSubmissionResultDto
  ): Observable<string> {

    const body = {
      questionId: questionId,
      flavor: flavor,
      relatedCodeSubmissionResult: relatedCodeSubmissionResult
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return new Observable<string>(observer => {
      this.http.post(`${this.apiUrl}/evaluate-code`, body, {
        headers: headers,
        reportProgress: true,
        observe: 'events',
        responseType: 'text'
      }).pipe(
        catchError(error => { throw error; })
      ).subscribe({
        next: (event) => {
          switch (event.type) {
            case HttpEventType.Response:
              observer.next(event.body!);
              observer.complete();
              break;
            case HttpEventType.DownloadProgress:
              const downloadEvent = event as HttpDownloadProgressEvent;
              if (downloadEvent.partialText != undefined) {
                const partialText = downloadEvent.partialText;
                observer.next(partialText);
              }
              break;
          }
        },
        error: (err: any) => {
          observer.error(err);
        }
      });
    });
  }

  /**
   * Posts user feedback (rating and comment) on the code execution.
   *
   * @param rating - The rating given by the user (1-5).
   * @param feedback - The user's written feedback on the code execution.
   * @param lastSubmissionId - The ID of the last code submission (which is the submission associated with the feedback).
   * @returns An Observable with the server's response.
   */
  postFeedback(
    rating: number,
    feedback: string,
    lastSubmissionId: string,
  ): Observable<any> {
    const body = {
      rating: rating,
      feedback: feedback,
      lastSubmissionId: lastSubmissionId
    };
    return this.http.post<any>(`${this.apiUrl}/post-Feedback`, body);
  }
}
