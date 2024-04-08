import { Component, OnInit, Input, Inject } from '@angular/core';
import { MatList, MatSelectionListChange } from '@angular/material/list';
import { MatListOption } from '@angular/material/list';
import { MCOptionDTO, McQuestionDTO, QuestionDTO, QuestionVersionDTO } from '@DTOs/question.dto';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-mcTask',
  templateUrl: './mcTask.component.html',
  styleUrls: ['./mcTask.component.css']
})

export class McTaskComponent implements OnInit {

  editorConfig = { //tinyMCE
    readonly: true,
    plugins: 'lists table link image code codesample',
    toolbar: false,
    min_height: 100,
    max_height: 500,
    resize: false,
  }

  //init question data
  questionData : QuestionDTO = {
    id : -1,
    name : '',
    description : '',
    score : -1,
    type : '',
    text : '',
    isApproved: false,
    originId: -1,
    level: -1,
  }

  dataLoaded : boolean = false;

  //the mc question data
  mcQuestion : McQuestionDTO = {
    id : -1,
    questionId : -1,
    isSC : false,
    shuffleOptions : false
  }

  //the userAnswer data
  userAnswer : UserAnswerDataDTO = {
    id: -1,
    userId: -1,
    questionId: -1,
  }

  feedback : userAnswerFeedbackDTO = {
    id: -1,
    userAnswerId: -1,
    score: -1,
    feedbackText: '',
  }

  //the requested question
  questionId: number;

  //isSelfAssessment
  @Input() isSelfAssessment: boolean = false;

  //the mc options
  options : MCOptionDTO[] = [];

  //the selected option(s)
  selectedOptions : number[] = [];

  submitDisabled : boolean = false;

  onSelectionChange(): void {
    for (const option of this.options) {
      if(this.selectedOptions.includes(option.id)) {
        option.selected = true;
      }
      else {
        option.selected = false;
      }
    }
  }

  onSubmit() :void {
    //Create new submit
    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      userId: -1,
      questionId: this.questionData.id,
      userMCAnswer: this.selectedOptions,
    }

    this.questionDataService.createUserAnswer(userAnswerData).subscribe(data => {
      this.feedback = data;
    });

    setTimeout(() => {
      //timeout for showing the feedback
      this.submitDisabled = true;
    }, 500);
  
  }

  //Get data from dialog
  constructor(
    public dialogRef: MatDialogRef<McTaskComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private questionDataService: QuestionDataService) {

    this.questionId = data.question_id as number;
  }

  ngOnInit() {
    //Show the newest Version of the questions
    this.questionDataService.getQuestionData(this.questionId).subscribe(data => {
      this.questionData = data;
      this.dataLoaded = true;

      //Get the mc question data of the newest question version
      this.questionDataService.getMCQuestion(this.questionData.id).subscribe(data => {
        this.mcQuestion = data;

        //Get the MC-Options of the question
        this.questionDataService.getMCOptions(this.mcQuestion.id).subscribe(data => {
          console.log(this.mcQuestion.id);
          this.options = data;

        });
      })
    });
  }

  //Close the dialog
  onClose(): void {
    const result = {reached_score: this.feedback.score, question_score: this.questionData.score};
    //mit dem close() soll die Punktzahl an die parent component übergeben werden
    this.dialogRef.close(result);
  }

}
