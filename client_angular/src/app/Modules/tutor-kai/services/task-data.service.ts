import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QuestionDTO } from '@DTOs/index';
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

  getTask(id: number): Observable<QuestionDTO> {

    return this.http.get<QuestionDTO>(`${this.apiURL}/${id}`);
  }
}
