import { Component, Input, OnInit } from '@angular/core';
import { GradingService } from '../services/grading.service';
import { forkJoin } from 'rxjs';
import { questionType, UserAnswerDTO } from '@DTOs/question.dto';
import { UserAnswerDataDTO, UserUploadAnswerListItemDTO } from '@DTOs/userAnswer.dto';

@Component({
  selector: 'app-grading-upload',
  templateUrl: './grading-upload.component.html',
  styleUrls: ['./grading-upload.component.scss']
})
export class GradingUploadComponent implements OnInit {
  @Input() questionId!: number;
  isLoading = true;
  error: string | null = null;

  userAnswers: UserUploadAnswerListItemDTO[] = [];

  constructor(private gradingService: GradingService) { }

  ngOnInit(): void {
    if (this.questionId) {
      this.getUserAnswers(this.questionId);
    }
  }

  getUserAnswers(questionId: number): void {
    this.isLoading = true;
    this.error = null;
    this.gradingService.getAllUserUploadAnswers(questionId).subscribe({
      next: (data) => {
        this.userAnswers = data;
        this.isLoading = false;
        console.log('User Answers:', this.userAnswers);
      },
      error: (err) => {
        this.error = 'Failed to load user answers';
        this.isLoading = false;
      }
    });
  }
}
