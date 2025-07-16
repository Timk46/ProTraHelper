import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { detailedQuestionDTO } from '@DTOs/detailedQuestion.dto';
import { CodeGameEvaluationDTO } from '@DTOs/codeGame.dto';
import { UserAnswerDataDTO } from '@DTOs/userAnswer.dto';
import { userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';

@Injectable({
  providedIn: 'root',
})
export class CodeGameTaskDataService {
  private readonly apiCodeGameURL = `${environment.server}/code-game`;
  private readonly apiQuestionDataURL = `${environment.server}/question-data`;

  constructor(private readonly http: HttpClient) {}

  getCodeGameTask(id: number): Observable<detailedQuestionDTO> {
    return this.http.get<detailedQuestionDTO>(`${this.apiCodeGameURL}/${id}`);
  }

  executeCodeGameTask(
    questionId: number | undefined,
    language: string,
    mainFile: { [p: string]: string },
    additionalFiles: { [p: string]: string },
    gameFile: { [p: string]: string },
  ): Observable<{ success: boolean; message: string; result: CodeGameEvaluationDTO }> {
    const body = {
      questionId: questionId,
      language: language,
      mainFile: mainFile,
      additionalFiles: additionalFiles,
      gameFile: gameFile,
    };

    const response: Observable<{
      success: boolean;
      message: string;
      result: CodeGameEvaluationDTO;
    }> = this.http.post<{ success: boolean; message: string; result: CodeGameEvaluationDTO }>(
      `${this.apiCodeGameURL}/execute`,
      body,
    );
    return response;
  }

  submitCodeGameUserAnswer(
    questionId: number,
    contentElementId: number,
    language: string,
    codeGameEvaluation: CodeGameEvaluationDTO,
  ): any {
    const body: UserAnswerDataDTO = {
      id: -1,
      userId: -1,
      questionId: questionId,
      contentElementId: contentElementId,
      codeGameEvaluation: codeGameEvaluation,
    };

    const response: Observable<any> = this.http.post<any>(
      `${this.apiQuestionDataURL}/userAnswer/create`,
      body,
    );
    return response;
  }
}
