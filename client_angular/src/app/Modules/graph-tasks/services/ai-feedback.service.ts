import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiFeedbackService {

  graphAIFeedbackUrl = environment.server + '/graph-ai-feedback';

  constructor(private readonly http: HttpClient) { }

  generateGraphAIFeedback(userAnswerId: number): Observable<{ feedback: string, feedbackId: number }> {
    return this.http.post<{ feedback: string, feedbackId: number }>(this.graphAIFeedbackUrl, { userAnswerId });
  }
  
  rateGraphAIFeedback(feedbackId: number, rating: 1 | 2 | 3 | 4 | 5): Observable<void> {
    return this.http.patch<void>(`${this.graphAIFeedbackUrl}/${feedbackId}`, { rating });
  } 
}
