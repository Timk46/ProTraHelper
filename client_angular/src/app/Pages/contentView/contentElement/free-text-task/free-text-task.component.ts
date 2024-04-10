import { QuestionDTO, UserAnswerDataDTO, freeTextQuestionDTO } from '@DTOs/index';
import { DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

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
  styleUrls: ['./free-text-task.component.scss']
})
export class FreeTextTaskComponent {

  editorConfig = { //tinyMCE
    readonly: false,
    plugins: 'autoresize lists table link image code codesample',
    toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
    min_height: 300,
    max_height: 500,
    resize: false,
  }

  answerText: string = '';
  feedbackText: string = '';
  isSending: boolean = false;
  
  taskViewData: TaskViewData;



  freeTextQuestion: freeTextQuestionDTO = {
    questionId: -1,
    contentElementId: -1,
    title: "",
    text: "",
    expectations: "",
    maxPoints: 0,
  }


  constructor(public dialogRef: DialogRef, @Inject(MAT_DIALOG_DATA) public data: any, private quesitonService: QuestionDataService) {
    this.taskViewData = data.taskViewData;
    this.quesitonService.getFreeTextQuestion(this.taskViewData.id).subscribe(data => {
      this.freeTextQuestion = data;
      this.freeTextQuestion.contentElementId = this.taskViewData.contentElementId;
    });
    this.quesitonService.getNewestUserAnswer(this.taskViewData.id).subscribe(data => {
      this.answerText = data.userFreetextAnswer || '';
    });
  }

  onSubmit(text: string, rawText: string) {
    this.isSending = true;
    this.answerText = text;
    this.feedbackText = '';
    console.log(this.answerText);
    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      questionId: this.freeTextQuestion.questionId,
      contentElementId: this.freeTextQuestion.contentElementId,
      userId: -1,
      userFreetextAnswer: text,
      userFreetextAnswerRaw: rawText,
    }
    this.quesitonService.createUserAnswer(userAnswerData).subscribe(data => {
      console.log(data);
      this.feedbackText = data.feedbackText.replace(/\n/g, '<br>');
      this.isSending = false;
    });
  }

  private replaceNewLines(text: string){
    //replace all "\n" with "<br>"

  }


}
