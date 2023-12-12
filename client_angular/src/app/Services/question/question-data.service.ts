import { McQuestionDTO, QuestionDTO, QuestionVersionDTO, MCOptionDTO, UserMCAnswerDTO, UserMCOptionSelectedDTO } from '@DTOs/question.dto';
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
  
  getQuestionVersionData(questionId: number) : Observable<QuestionVersionDTO> {
    return this.http.get<QuestionVersionDTO>(environment.server + `/question-data/questionVersion/${questionId}`);
  }
  
  getNewestQuestionVersion(questionId: number) : Observable<QuestionVersionDTO> {
    return this.http.get<QuestionVersionDTO>(environment.server + `/question-data/newestQuestionVersion/${questionId}`);
  }

  getMCQuestion(questionVersionId: number) : Observable<McQuestionDTO> {
    return this.http.get<McQuestionDTO>(environment.server + `/question-data/mcQuestion/${questionVersionId}`);
  }

  getMCOptions(questionId: number) : Observable<MCOptionDTO[]> {
    return this.http.get<MCOptionDTO[]>(environment.server + `/question-data/mcOptions/${questionId}`);
  }

  createUserMCAnswer(userId: number, mcQuestionId: number) : Observable<UserMCAnswerDTO> {
    return this.http.post<UserMCAnswerDTO>(environment.server + `/question-data/userMCAnswer/create`, {userId, mcQuestionId});
  }
  
  createUserMCOptionSelected(userMCAnswerId: number, mcOptionId: number) : Observable<UserMCOptionSelectedDTO> {
    console.log('userMCOptionSelected created');
    return this.http.post<UserMCOptionSelectedDTO>(environment.server + `/question-data/userMCOptionSelected/create`, {userMCAnswerId, mcOptionId});
  }

}
