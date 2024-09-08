import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { detailedQuestionDTO, CodeSubmissionResultDto } from '@DTOs/index';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EditCodeService {
  private apiUrl = `${environment.server}/run-code`;

  constructor(private http: HttpClient) { }

  executeForTaskCreation(detailedQuestion: detailedQuestionDTO): Observable<CodeSubmissionResultDto> {
    return this.http.post<CodeSubmissionResultDto>(`${this.apiUrl}/executeForTaskCreation`, { detailedQuestion });
  }
}
