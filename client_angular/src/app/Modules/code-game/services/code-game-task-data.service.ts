import { Injectable } from '@angular/core';
import { environment } from "../../../../environments/environment";
import { Observable } from "rxjs";
import { HttpClient } from '@angular/common/http';
import { detailedQuestionDTO } from "@DTOs/detailedQuestion.dto";
import { CodeGameEvaluationDTO, CppProjectExecutionResult } from "@DTOs/codeGame.dto";

@Injectable({
  providedIn: 'root'
})
export class CodeGameTaskDataService {
  private readonly apiURL = `${environment.server}/code-game`;

  constructor(private http: HttpClient) {}

  getCodeGameTask(id: number): Observable<detailedQuestionDTO> {
    return this.http.get<detailedQuestionDTO>(`${this.apiURL}/${id}`);
  }

  executeCodeGameTask(
    questionId: number | undefined,
    mainFile: { [p: string]: string },
    additionalFiles: { [p: string]: string },
    gameFile: { [p: string]: string })
    : Observable<CodeGameEvaluationDTO> {
    const body = {
      questionId: questionId,
      mainFile: mainFile,
      additionalFiles: additionalFiles,
      gameFile: gameFile,
    };

    const response: Observable<CodeGameEvaluationDTO> = this.http.post<CodeGameEvaluationDTO>(`${this.apiURL}/execute`, body);
    return response;
  }
}
