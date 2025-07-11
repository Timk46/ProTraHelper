import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionDTO, questionType } from '../../../../../../../shared/dtos/question.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

@Component({
  selector: 'app-grading-overview',
  templateUrl: './grading-overview.component.html',
  styleUrls: ['./grading-overview.component.scss']
})
export class GradingOverviewComponent implements OnInit {
  question: QuestionDTO | null = null;
  questionType = questionType;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private questionDataService: QuestionDataService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('questionId');
      if (id) {
        this.fetchQuestionData(+id);
      }
    });
  }

  fetchQuestionData(questionId: number): void {
    this.isLoading = true;
    this.error = null;
    this.questionDataService.getQuestionData(questionId).subscribe({
      next: (data) => {
        this.question = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load question data.';
        this.isLoading = false;
      }
    });
  }
}
