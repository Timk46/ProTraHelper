import { QuestionDTO } from '@DTOs/index';
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

  constructor(public dialogRef: DialogRef, @Inject(MAT_DIALOG_DATA) public data: {question_id: number}, private quesitonService: QuestionDataService) {
    this.quesitonService.getQuestionData(this.data.question_id).subscribe(data => {
      this.questionData = data;
    });
  }

  onSubmit() {
    console.log(this.answerText);
  }


}
