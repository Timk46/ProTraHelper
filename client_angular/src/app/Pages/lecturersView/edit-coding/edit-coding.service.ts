import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { detailedQuestionDTO, CodeSubmissionResultDto, CodeGeruestDto, CodingQuestionInternal } from '@DTOs/index';
import { environment } from 'src/environments/environment';
import { genTaskDto } from '@DTOs/tutorKaiDtos/genTask.dto';

@Injectable({
  providedIn: 'root'
})
export class EditCodeService {
  private apiUrl = `${environment.server}/run-code`;
  private genTaskUrl = `${environment.server}/coding-question-generator`;

  constructor(private http: HttpClient) { }

  executeForTaskCreation(detailedQuestion: detailedQuestionDTO): Observable<CodeSubmissionResultDto> {
    return this.http.post<CodeSubmissionResultDto>(`${this.apiUrl}/executeForTaskCreation`, { detailedQuestion });
  }

  generateTask(inhalt: string, kontext: string): Observable<genTaskDto> {
    return this.http.post<genTaskDto>(`${this.genTaskUrl}/contextualizedTask`, { inhalt, kontext });
  }

  generateCppTask(taksdecription: string, codeGerueste: CodeGeruestDto[]): Observable<CodingQuestionInternal> {
    return this.http.post<CodingQuestionInternal>(`${this.genTaskUrl}/genCppTask`, {taksdecription, codeGerueste });
  }
}
