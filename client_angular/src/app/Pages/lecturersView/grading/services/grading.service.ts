import { Injectable } from '@angular/core';
import { questionType } from '@DTOs/question.dto';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { detailedQuestionDTO, UserAnswerDataDTO, UserAnswerDTO, UserUploadAnswerDTO, UserUploadAnswerListItemDTO} from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

@Injectable({
  providedIn: 'root'
})
export class GradingService {

  constructor(
    private questionService: QuestionDataService,
  ) { }

/*   getQuestions(): Observable<Question[]> {
    return of(this.questions);
  }

  getUserAnswers(): Observable<UserAnswer[]> {
    return of(this.userAnswers);
  } */

  getAllUserUploadAnswers(questionId: number, questionType?: questionType): Observable<UserUploadAnswerListItemDTO[]> {
    return this.questionService.getAllUserUploadAnswers(questionId);
  }
}
