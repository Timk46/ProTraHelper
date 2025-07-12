import type { UserAnswerDataDTO, freeTextQuestionDTO } from '@DTOs/index';
import { DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, EventEmitter, Output, Input } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { Location } from '@angular/common';
interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number;
  name: string;
  type: string;
  progress: number;
  description?: string;
}

@Component({
  selector: 'app-free-text-task',
  templateUrl: './free-text-task.component.html',
  styleUrls: ['./free-text-task.component.scss'],
})
export class FreeTextTaskComponent {
  @Output() submitClicked = new EventEmitter<any>();
  @Input() conceptId!: number;
  @Input() questionId!: number;

  editorConfig = {
    //tinyMCE
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar:
      'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
    min_height: 300,
    max_height: 500,
    resize: false,
  };

  answerText: string = '';
  feedbackText: string = '';
  isSending: boolean = false;

  taskViewData: TaskViewData;

  freeTextQuestion: freeTextQuestionDTO = {
    questionId: -1,
    contentElementId: -1,
    title: '',
    text: '',
    expectations: '',
    maxPoints: 0,
  };

  constructor(
    public dialogRef: DialogRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly questionService: QuestionDataService,
    private readonly location: Location,
  ) {
    this.taskViewData = data.taskViewData;
    this.questionService.getFreeTextQuestion(this.taskViewData.id).subscribe(data => {
      this.freeTextQuestion = data;
      this.freeTextQuestion.contentElementId = this.taskViewData.contentElementId;
    });
    this.questionService.getNewestUserAnswer(this.taskViewData.id).subscribe(data => {
      this.answerText = data.userFreetextAnswer || '';
    });
  }

  onSubmit(text: string, rawText: string) {
    this.isSending = true;
    this.answerText = text;
    this.feedbackText = '';
    //console.log(this.answerText);
    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      questionId: this.freeTextQuestion.questionId,
      contentElementId: this.freeTextQuestion.contentElementId,
      userId: -1,
      userFreetextAnswer: text,
      userFreetextAnswerRaw: rawText,
    };
    this.questionService.createUserAnswer(userAnswerData).subscribe(data => {
      console.log(data);
      this.feedbackText = data.feedbackText.replace(/\n/g, '<br>');
      this.isSending = false;
      this.submitClicked.emit(data.progress);
    });
  }

  private replaceNewLines(text: string) {
    //replace all "\n" with "<br>"
  }

  onClose(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    if (this.conceptId && this.questionId) {
      this.location.replaceState(`/dashboard/conceptOverview/${this.conceptId}`);
    } else if (this.conceptId) {
      this.location.replaceState(`/dashboard/conceptOverview`);
    } else {
      this.location.replaceState(`/dashboard`);
    }
  }
}
