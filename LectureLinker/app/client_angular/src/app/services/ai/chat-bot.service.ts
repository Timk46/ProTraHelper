import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatBotService {
  private apiUrl = environment.server;

  constructor(private http: HttpClient) { }

  askQuestion(question: string, lecture: String): Observable<any> {
    return this.http.post(`${this.apiUrl}/ask`, { lecture: lecture, prompt: question });
  }
}
