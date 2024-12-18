import { Injectable } from '@angular/core';
import { environment } from "../../../../environments/environment";
import { Observable } from "rxjs";
import { HttpClient } from '@angular/common/http';
import { detailedQuestionDTO } from "@DTOs/detailedQuestion.dto";
import {CppProjectExecutionResult} from "@DTOs/codeGame.dto";

@Injectable({
  providedIn: 'root'
})
export class CodeGameTaskDataService {
  private readonly apiURL = `${environment.server}/code-game`;

  constructor(private http: HttpClient) {}

  getCodeGameTask(id: number): Observable<detailedQuestionDTO> {
    return this.http.get<detailedQuestionDTO>(`${this.apiURL}/${id}`);
  }

  executeCodeGameTask(mainFile: { [fileName: string]: string }, additionalFiles: { [fileName: string]: string }, gameFile: { [fileName: string]: string }): Observable<CppProjectExecutionResult> {
    const body = {
      mainFile: mainFile,
      additionalFiles: additionalFiles,
      gameFile: gameFile,
    };

    const response: Observable<CppProjectExecutionResult> = this.http.post<CppProjectExecutionResult>(`${this.apiURL}/execute`, body);
    return response;
  }
}
