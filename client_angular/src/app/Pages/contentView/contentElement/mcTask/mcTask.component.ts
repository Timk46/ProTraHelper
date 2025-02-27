import { Component, OnInit, Input, Inject, EventEmitter, Output, Optional } from '@angular/core';
import { MCOptionViewDTO, McQuestionDTO, QuestionDTO } from '@DTOs/question.dto';
import { UserAnswerDataDTO, userAnswerFeedbackDTO } from '@DTOs/userAnswer.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TaskViewData } from '@DTOs/index';
import {  Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-mcTask',
  templateUrl: './mcTask.component.html',
  styleUrls: ['./mcTask.component.css']
})

export class McTaskComponent implements OnInit {

  @Output() submitClicked = new EventEmitter<any>();

  @Input() conceptId!: number;
  @Input() questionId!: number;
  @Input() isSelfAssessment: boolean = false;
  @Input() taskViewData!: TaskViewData;

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
  conceptIdParam!: number;
  questionIdParam!: number;
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

  //isSelfAssessment

  //the mc options
  options : MCOptionViewDTO[] = [];

  //the selected option(s)
  selectedOptions : number[] = [];

  submitDisabled : boolean = false;
  fullscore : number = 0;

  //Get data from dialog
  constructor(
    //public dialogRef: MatDialogRef<McTaskComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: {taskViewData: TaskViewData, conceptId: number, questionId: number},
    private questionDataService: QuestionDataService,
    private router: Router,
    private dialogRef: MatDialogRef<McTaskComponent>,
    private location: Location
  ) {
    if (data && data.taskViewData) {
      this.taskViewData = data.taskViewData;
    }
  }

  ngOnInit() {
    if (this.taskViewData && this.taskViewData.id) {
      //Show the newest Version of the questions
      this.questionDataService.getQuestionData(this.taskViewData.id).subscribe(data => {
        this.questionData = data;
        this.dataLoaded = true;

        //Get the mc question data of the newest question version
        console.log("id: ", this.questionData.id, "typeof", typeof this.questionData.id);
        this.questionDataService.getMCQuestion(this.questionData.id).subscribe(data => {
          this.mcQuestion = data;
          console.log("mcQuestion id: ", this.mcQuestion.id);

          //Get the MC-Options of the question
          this.questionDataService.getMCOptions(this.mcQuestion.id).subscribe(data => {
            //console.log(this.mcQuestion.id);
            this.options = data;
            this.options.sort(() => Math.random() - 0.5);
          });
        })
      });
    }
  }

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
      // Emit progress before setting submitDisabled
      this.submitClicked.emit(data.progress);
      // Set submitDisabled immediately after emitting
      this.submitDisabled = true;
    });
  }

  checkCorrect() {
    return this.questionData.score === this.feedback.score;
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
    // Clear selected options
    this.selectedOptions = [];
    // Reset selected state for all options
    this.options.forEach(option => {
      option.selected = false;
    });
    // Shuffle options if needed
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

  onClose(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }

    if (this.conceptId && this.questionId) {
      // Navigate to /dashboard/conceptOverview/:conceptId
      this.location.replaceState(`/dashboard/conceptOverview/${this.conceptId}`);
    } else if (this.conceptId) {
      // Navigate to /dashboard/conceptOverview
      this.location.replaceState(`/dashboard/conceptOverview`);
    } else {
      // Navigate to /dashboard
      this.location.replaceState(`/dashboard`);
    }
  }
}
