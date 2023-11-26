import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = environment.wsserver;

  constructor() {}

  getChatStream(query: string): Observable<string> {
    return new Observable((subscriber: Subscriber<string>) => {
      const websocket = new WebSocket(`${this.apiUrl}/chat/${query}`);

      websocket.onmessage = event => {
        console.log(event.data);
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
