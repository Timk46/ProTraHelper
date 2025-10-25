import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ChatSessionDTO, ChatBotMessageDTO } from '@DTOs/index';
export { ChatSessionDTO as ChatSession, ChatBotMessageDTO as ChatBotMessage } from '@DTOs/index';

@Injectable({
  providedIn: 'root',
})
export class LlmService {
  constructor(private readonly http: HttpClient) {}

  /**
   * Gets all chat sessions for the current user
   * @returns Observable of chat sessions array
   */
  getChatSessions(): Observable<ChatSessionDTO[]> {
    return this.http.get<ChatSessionDTO[]>(`${environment.server}/chat-bot/sessions`);
  }

  /**
   * Gets a basic answer from the LLM.
   * @param question The question to ask.
   * @returns Observable of the answer.
   */
  getLlmAnswer(question: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(`${environment.server}/chat-bot/ask/basic`, {
      question,
    });
  }

  /**
   * Gets a dialog-based answer from the LLM.
   * @param context The context of the conversation.
   * @param question The question to ask.
   * @param dialogSessionId The ID of the dialog session.
   * @param url Added url parameter
   * @param sessionId Optional ID of an existing chat session.
   * @returns Observable of the response.
   */
  getLlmAnswerDialog(
    context: { role: string; content: string }[],
    question: string,
    dialogSessionId: string,
    url: string,
    sessionId?: number,
  ): Observable<ChatBotMessageDTO> {
    return this.http.post<ChatBotMessageDTO>(`${environment.server}/chat-bot/ask/basic/getDialog`, {
      context,
      question,
      dialogSessionId,
      sessionId,
      url,
    });
  }
}
