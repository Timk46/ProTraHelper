import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
/**
 * ChatService is a class that handles the communication with the chat server.
 * It uses a WebSocket to send the user's question and receive the chatbot's response.
 */
export class ChatService {
  /**
   * The base URL of the WebSocket server.
   */
  private readonly apiUrl = environment.wsserver;

  constructor() {}

  /**
   * Returns an Observable that emits the chatbot's responses.
   *
   * @param lecture - The current lecture.
   * @param query - The user's question.
   * @returns An Observable that emits the chatbot's responses.
   */
  getChatStream(lecture: string, query: string): Observable<string> {
    return new Observable((subscriber: Subscriber<string>) => {
      const websocket = new WebSocket(`${this.apiUrl}/chat/${lecture}`);

      websocket.onopen = () => {
        websocket.send(query);
      };

      websocket.onmessage = event => {
        subscriber.next(event.data);
      };

      websocket.onerror = error => {
        subscriber.error(error);
        websocket.close();
      };

      websocket.onclose = () => {
        subscriber.complete();
      };

      return () => {
        websocket.close();
      };
    });
  }
}
