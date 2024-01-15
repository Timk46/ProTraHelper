import { McQuestionDTO, QuestionDTO, QuestionVersionDTO, MCOptionDTO, UserAnswerDTO, UserMCOptionSelectedDTO, UserAnswerDataDTO } from '@DTOs/question.dto';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuestionDataService {

  constructor(private http: HttpClient) { }

  /**
   * 
   * @param questionId 
   * @returns the question data
   */
  getQuestionData(questionId: number) : Observable<QuestionDTO> {
    return this.http.get<QuestionDTO>(environment.server + `/question-data/${questionId}`);
  }
  
  getNewestQuestionVersion(questionId: number) : Observable<QuestionDTO> {
    return this.http.get<QuestionDTO>(environment.server + `/question-data/newestQuestionVersion/${questionId}`);
  }

  getMCQuestion(questionVersionId: number) : Observable<McQuestionDTO> {
    return this.http.get<McQuestionDTO>(environment.server + `/question-data/mcQuestion/${questionVersionId}`);
  }

  getMCOptions(questionId: number) : Observable<MCOptionDTO[]> {
    return this.http.get<MCOptionDTO[]>(environment.server + `/question-data/mcOptions/${questionId}`);
  }

  /* createUserAnswer(userId: number, questionId: number) : Observable<UserAnswerDTO> {
    console.log('create user mc answer for question ' + questionId + ' and user ' + userId);
    return this.http.post<UserAnswerDTO>(environment.server + `/question-data/userAnswer/create`, {userId, questionId});
  } */
  createUserAnswer(data: UserAnswerDataDTO) : Observable<UserAnswerDataDTO> {
    console.log('create user mc answer for question ' + data.questionId + ' and user ' + data.userId);
    return this.http.post<UserAnswerDataDTO>(environment.server + `/question-data/userAnswer/create`, data);
  }

  
  createUserMCOptionSelected(userAnswerId: number, mcOptionId: number) : Observable<UserMCOptionSelectedDTO> {
    return this.http.post<UserMCOptionSelectedDTO>(environment.server + `/question-data/userMCOptionSelected/create`, {userAnswerId, mcOptionId});
  }

}
