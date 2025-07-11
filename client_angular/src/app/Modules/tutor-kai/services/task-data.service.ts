import { Injectable } from '@angular/core';
import type { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { QuestionDTO } from '@DTOs/index';
import { environment } from 'src/environments/environment';

/**
 * Service to manage task data.
 */
@Injectable({
  providedIn: 'root',
})
export class TaskDataService {
  private readonly apiURL = `${environment.server}/questions`;

  constructor(private readonly http: HttpClient) {}

  getTask(id: number): Observable<QuestionDTO> {
    return this.http.get<QuestionDTO>(`${this.apiURL}/${id}`);
  }
}
