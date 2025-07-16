import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { of } from 'rxjs';

export interface Question {
  questionId: number;
  type: string;
}

export interface UserAnswer {
  userId: number;
  questionId: number;
  answer: string;
}

export interface UserUploadAnswer {
  userId: number;
  questionId: number;
  uploadPath: string;
}

@Injectable({
  providedIn: 'root',
})
export class GradingService {
  private readonly questions: Question[] = [
    { questionId: 101, type: 'EntwurfUpload' },
    { questionId: 102, type: 'MultipleChoice' },
    { questionId: 103, type: 'EntwurfUpload' },
    { questionId: 104, type: 'Freetext' },
  ];

  private readonly userAnswers: UserAnswer[] = [
    { userId: 1, questionId: 101, answer: 'upload_ref_101_user1' },
    { userId: 2, questionId: 101, answer: 'upload_ref_101_user2' },
    { userId: 1, questionId: 102, answer: 'A' },
    { userId: 2, questionId: 102, answer: 'C' },
    { userId: 1, questionId: 103, answer: 'upload_ref_103_user1' },
  ];

  private readonly userUploadAnswers: UserUploadAnswer[] = [
    { userId: 1, questionId: 101, uploadPath: '/uploads/module1/q101_user1.pdf' },
    { userId: 2, questionId: 101, uploadPath: '/uploads/module1/q101_user2.jpg' },
    { userId: 1, questionId: 103, uploadPath: '/uploads/module1/q103_user1.zip' },
  ];

  constructor() {}

  getQuestions(): Observable<Question[]> {
    return of(this.questions);
  }

  getUserAnswers(): Observable<UserAnswer[]> {
    return of(this.userAnswers);
  }

  getUserUploadAnswers(): Observable<UserUploadAnswer[]> {
    return of(this.userUploadAnswers);
  }
}
