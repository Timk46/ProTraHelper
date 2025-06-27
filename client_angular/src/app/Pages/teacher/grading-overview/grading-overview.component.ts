import { Component, OnInit } from '@angular/core';

interface Question {
  questionId: number;
  type: string; // e.g., 'EntwurfUpload', 'MultipleChoice'
}

interface UserAnswer {
  userId: number;
  questionId: number;
  answer: string; // For text answers or references to uploads
}

interface UserUploadAnswer {
  userId: number;
  questionId: number;
  uploadPath: string; // Path to the uploaded file
}

@Component({
  selector: 'app-grading-overview',
  templateUrl: './grading-overview.component.html',
  styleUrls: ['./grading-overview.component.scss']
})
export class GradingOverviewComponent implements OnInit {

  questions: Question[] = [
    { questionId: 101, type: 'EntwurfUpload' },
    { questionId: 102, type: 'MultipleChoice' },
    { questionId: 103, type: 'EntwurfUpload' },
    { questionId: 104, type: 'Freetext' },
  ];

  userAnswers: UserAnswer[] = [
    { userId: 1, questionId: 101, answer: 'upload_ref_101_user1' },
    { userId: 2, questionId: 101, answer: 'upload_ref_101_user2' },
    { userId: 1, questionId: 102, answer: 'A' },
    { userId: 2, questionId: 102, answer: 'C' },
    { userId: 1, questionId: 103, answer: 'upload_ref_103_user1' },
  ];

  userUploadAnswers: UserUploadAnswer[] = [
    { userId: 1, questionId: 101, uploadPath: '/uploads/module1/q101_user1.pdf' },
    { userId: 2, questionId: 101, uploadPath: '/uploads/module1/q101_user2.jpg' },
    { userId: 1, questionId: 103, uploadPath: '/uploads/module1/q103_user1.zip' },
  ];

  uploadOverview: any[] = [];

  constructor() { }

  ngOnInit(): void {
    this.generateUploadOverview(1); // Assuming module ID 1 for now
  }

  generateUploadOverview(moduleId: number): void {
    // In a real application, you would filter by moduleId here
    // For now, we'll process all mock data

    const entwurfUploadQuestions = this.questions.filter(q => q.type === 'EntwurfUpload');

    this.uploadOverview = entwurfUploadQuestions.map(question => {
      const answersForQuestion = this.userAnswers.filter(ua => ua.questionId === question.questionId);
      return answersForQuestion.map(answer => {
        const upload = this.userUploadAnswers.find(uua => uua.userId === answer.userId && uua.questionId === answer.questionId);
        return {
          questionId: question.questionId,
          userId: answer.userId,
          uploadPath: upload ? upload.uploadPath : 'N/A' // 'N/A' if no upload found
        };
      });
    }).flat();
  }

}