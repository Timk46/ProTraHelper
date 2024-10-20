import { Injectable } from '@angular/core';
import { HttpClient, HttpDownloadProgressEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { environment } from 'src/environments/environment';

interface ChatBotMessage {
  id: number;
  question: string;
  answer: string | null;
  createdAt: Date;
  isBot: boolean;
  ratingByStudent: number | null;
  usedChunks: string | null;
  userId: number | null;
}

interface ComponentChatBotResponse {
  content: string;
  messageId: number;
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  private apiUrl = environment.server + '/chat-bot';

  constructor(private http: HttpClient) { }

  /**
   * Retrieves the answer stream for a given question.
   * @param question The question to be asked.
   * @returns An Observable that emits the answer stream as a string.
   */
  getLlmAnswerStream(question: string): Observable<string> {
    const body = {
      question: question,
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    // Observable Logic for the Token-Stream
    return new Observable<string>(observer => {
      this.http.post(`${this.apiUrl}/ask/basic/getStream`, body, {
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
   * Retrieves the completed answer (no stream) to a given question from the LLM service.
   * @param question The question to be asked.
   * @returns An Observable that emits the answer as a string. Currently any but in specific usecases it should be an interface.
   */
  getLlmAnswer(question: string): Observable<string> {
    const body = { question: question };
    return this.http.post<string>(`${this.apiUrl}/ask/basic`, body, { responseType: 'text' as 'json' });
  }

  /**
   * Retrieves the answer for a given question with context.
   * @param context The previous conversation context.
   * @param question The question to be asked.
   * @returns An Observable that emits the ComponentChatBotResponse.
   */
  getLlmAnswerDialog(context: Array<{ role: string, content: string }>, question: string, dialogSessionId: string): Observable<ComponentChatBotResponse> {
    const body = {
      context: context,
      question: question,
      dialogSessionId: dialogSessionId
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<ChatBotMessage>(`${this.apiUrl}/ask/basic/getDialog`, body, { headers }).pipe(
      map((response: ChatBotMessage) => ({
        content: response.answer || '',
        messageId: response.id
      }))
    );
  }

  /**
   * Retrieves the completed answer (no stream) to a given question with context.
   * @param context The previous conversation context.
   * @param question The question to be asked.
   * @returns An Observable that emits the answer as a string.
   */
  getLlmAnswerDialogOld(context: Array<{ role: string, content: string }>, question: string): Observable<string> {
    const body = { context: context, question: question };
    return this.http.post<string>(`${this.apiUrl}/ask/basic/getStreamDialog`, body, { responseType: 'text' as 'json' });
  }
}
