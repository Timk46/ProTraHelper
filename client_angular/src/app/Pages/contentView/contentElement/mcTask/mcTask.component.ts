import { Component, OnInit, Input, Inject, EventEmitter, Output } from '@angular/core';
import { MatList, MatSelectionListChange } from '@angular/material/list';
import { MatListOption } from '@angular/material/list';
import { MCOptionViewDTO, McQuestionDTO, QuestionDTO, QuestionVersionDTO } from '@DTOs/question.dto';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';

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
  selector: 'app-mcTask',
  templateUrl: './mcTask.component.html',
  styleUrls: ['./mcTask.component.css']
})

export class McTaskComponent implements OnInit {

  @Output() submitClicked = new EventEmitter<any>();

  editorConfig = { //tinyMCE
    readonly: true,
    plugins: 'lists table link image code codesample',
    toolbar: false,
    min_height: 100,
    max_height: 500,
    resize: false,
  }

  //init question data
  questionData : QuestionDTO = { // dummy data
    id : -1,
    name : '',
    description : '',
    score : -1,
    type : '',
    text : '',
    conceptNodeId : -1,
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
    shuffleOptions : false,
    questionVersion: {
      id: -1,
      version: -1,
      isApproved: false,
      questionId: -1,
      successor: null
    },
    mcQuestionOption: []
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
    elementDone: false,
    progress: -1,
  }

  //the requested question
  taskViewData : TaskViewData;

  //isSelfAssessment
  @Input() isSelfAssessment: boolean = false;

  //the mc options
  options : MCOptionViewDTO[] = [];

  //the selected option(s)
  selectedOptions : number[] = [];

  submitDisabled : boolean = false;
  fullscore : number = 0;
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
    //console.log('create submit for contentElementId: ' + this.taskViewData.contentElementId);
    const userAnswerData: UserAnswerDataDTO = {
      id: -1,
      contentElementId: this.taskViewData.contentElementId,
      userId: -1,
      questionId: this.questionData.id,
      userMCAnswer: this.selectedOptions,
    }

    this.questionDataService.createUserAnswer(userAnswerData).subscribe(data => {
      this.feedback = data;
      this.submitClicked.emit(data.progress);
    });

    if(this.feedback.progress > this.taskViewData.progress) {
      this.taskViewData.progress = this.feedback.progress;
    }

    setTimeout(() => {
      //timeout for showing the feedback
      this.submitDisabled = true;
    }, 500);

  }


  //Get data from dialog
  constructor(
    public dialogRef: MatDialogRef<McTaskComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private questionDataService: QuestionDataService,
    private screenSizeService: ScreenSizeService) {
    this.taskViewData = data.taskViewData;
  }

  checkCorrect() {
    return this.questionData.score === this.feedback.score;
  }

  ngOnInit() {
    //Show the newest Version of the questions
    this.questionDataService.getQuestionData(this.taskViewData.id).subscribe(data => {
      this.questionData = data;
      this.dataLoaded = true;

      //Get the mc question data of the newest question version
      this.questionDataService.getMCQuestion(this.questionData.id).subscribe(data => {
        this.mcQuestion = data;

        //Get the MC-Options of the question
        this.questionDataService.getMCOptions(this.mcQuestion.id).subscribe(data => {
          //console.log(this.mcQuestion.id);
          this.options = data;
          this.options.sort(() => Math.random() - 0.5);
        });
      })
    });
  }

  retry() {
    this.submitDisabled = false;
    this.feedback = {
      id: -1,
      userAnswerId: -1,
      score: -1,
      feedbackText: '',
      elementDone: false,
      progress: -1,
    }
    this.options.sort(() => Math.random() - 0.5);

  }

  getFeedbackColor() {

    if (this.feedback.score === this.questionData.score) {
      return '#a3be8c';
    } else if (this.feedback.score >= this.questionData.score! * 0.5) {
      return '#ffa500';
    } else {
      return '#ff0000';
    }

  }

  //Close the dialog
  onClose(): void {
    //console.log('element done: ' + this.feedback.elementDone);
    this.dialogRef.close(this.feedback.elementDone);
  }

}
