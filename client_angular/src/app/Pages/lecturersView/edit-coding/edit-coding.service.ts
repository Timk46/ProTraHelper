import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  detailedQuestionDTO,
  CodeSubmissionResultDto,
  CodeGeruestDto,
  CodingQuestionInternal,
} from '@DTOs/index';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EditCodeService {
  private readonly apiUrl = `${environment.server}/run-code`;
  private readonly genTaskUrl = `${environment.server}/coding-question-generator`;

  constructor(private readonly http: HttpClient) {}

  executeForTaskCreation(
    detailedQuestion: detailedQuestionDTO,
  ): Observable<CodeSubmissionResultDto> {
    return this.http.post<CodeSubmissionResultDto>(`${this.apiUrl}/executeForTaskCreation`, {
      detailedQuestion,
    });
  }

  generateCppTask(
    taskDescription: string,
    codeGerueste: CodeGeruestDto[],
  ): Observable<CodingQuestionInternal> {
    return this.http.post<CodingQuestionInternal>(`${this.genTaskUrl}/genCppTask`, {
      taskDescription,
      codeGerueste,
    });
  }

  generatePythonTask(concept: string, context: string): Observable<CodingQuestionInternal> {
    return this.http.post<CodingQuestionInternal>(`${this.genTaskUrl}/genPythonTaskWithTopic`, {
      concept,
      context,
    });
  }
}
