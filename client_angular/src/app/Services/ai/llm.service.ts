import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  messages: ChatBotMessage[];
}

export interface ChatBotMessage {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
  isBot: boolean;
  ratingByStudent?: number;
  sessionId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LlmService {
  constructor(private http: HttpClient) {}

  /**
   * Gets all chat sessions for the current user
   * @returns Observable of chat sessions array
   */
  getChatSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${environment.server}/chat-bot/sessions`);
  }

  /**
   * Gets a basic answer from the LLM.
   * @param question The question to ask.
   * @returns Observable of the answer.
   */
  getLlmAnswer(question: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(`${environment.server}/chat-bot/ask/basic`, { question });
  }

  /**
   * Gets a dialog-based answer from the LLM.
   * @param context The context of the conversation.
   * @param question The question to ask.
   * @param dialogSessionId The ID of the dialog session.
   * @param sessionId Optional ID of an existing chat session.
   * @returns Observable of the response.
   */
  getLlmAnswerDialog(
    context: Array<{ role: string; content: string }>,
    question: string,
    dialogSessionId: string,
    url: string, // Added url parameter
    sessionId?: number
  ): Observable<ChatBotMessage> {
    return this.http.post<ChatBotMessage>(`${environment.server}/chat-bot/ask/basic/getDialog`, {
      context,
      question,
      dialogSessionId,
      sessionId,
      url // Added url to payload
    });
  }
}
