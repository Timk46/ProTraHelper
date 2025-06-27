import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GradingService, Question, UserAnswer, UserUploadAnswer } from './services/grading.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-grading-overview',
  templateUrl: './grading-overview.component.html',
  styleUrls: ['./grading-overview.component.scss']
})
export class GradingOverviewComponent implements OnInit {

  uploadOverview: any[] = [];
  moduleId: number | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private gradingService: GradingService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('moduleId');
      if (id) {
        this.moduleId = +id;
        this.generateUploadOverview(this.moduleId);
      }
    });
  }

  generateUploadOverview(moduleId: number): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      questions: this.gradingService.getQuestions(),
      userAnswers: this.gradingService.getUserAnswers(),
      userUploadAnswers: this.gradingService.getUserUploadAnswers()
    }).subscribe({
      next: ({ questions, userAnswers, userUploadAnswers }) => {
        const entwurfUploadQuestions = questions.filter(q => q.type === 'EntwurfUpload');

        this.uploadOverview = entwurfUploadQuestions.map(question => {
          const answersForQuestion = userAnswers.filter(ua => ua.questionId === question.questionId);
          return answersForQuestion.map(answer => {
            const upload = userUploadAnswers.find(uua => uua.userId === answer.userId && uua.questionId === answer.questionId);
            return {
              questionId: question.questionId,
              userId: answer.userId,
              uploadPath: upload ? upload.uploadPath : 'N/A'
            };
          });
        }).flat();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load data.';
        this.isLoading = false;
      }
    });
  }
}
