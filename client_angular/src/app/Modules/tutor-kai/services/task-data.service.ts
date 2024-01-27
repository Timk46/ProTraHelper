import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QuestionDto } from '@DTOs/index';
import { environment } from 'src/environments/environment';

/**
 * Service to manage task data.
 */
@Injectable({
  providedIn: 'root',
})
export class TaskDataService {
  private readonly apiURL = `${environment.server}/questions`;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves all questions with their codeGeruest.
   *
   * @returns All available questions with their codeGeruest wrapped in an observable.
   */
  getTasks(): Observable<QuestionDto[]> {

    return this.http.get<QuestionDto[]>(`${this.apiURL}`);
  }
}
