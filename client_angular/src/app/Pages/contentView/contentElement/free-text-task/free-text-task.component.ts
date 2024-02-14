import { QuestionDTO, UserAnswerDataDTO } from '@DTOs/index';
import { DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

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
  questionData : QuestionDTO = {
    id : -1,
    name : '',
    description : '',
    score : -1,
    type : '',
    text : '',
    isApproved: false,
    originId: -1,
  }

  feedbackText: string = '';
  isSending: boolean = false;

  constructor(public dialogRef: DialogRef, @Inject(MAT_DIALOG_DATA) public data: {question_id: number}, private quesitonService: QuestionDataService) {
    this.quesitonService.getQuestionData(this.data.question_id).subscribe(data => {
      this.questionData = data;
    });
  }

  onSubmit(text: string, rawText: string) {
    this.isSending = true;
    this.answerText = text;
    this.feedbackText = '';
    console.log(this.answerText);
    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      questionId: this.questionData.id,
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
