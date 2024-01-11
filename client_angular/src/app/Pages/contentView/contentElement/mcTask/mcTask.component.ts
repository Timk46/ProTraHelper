import { Component, OnInit, Input, Inject } from '@angular/core';
import { MatList, MatSelectionListChange } from '@angular/material/list';
import { MatListOption } from '@angular/material/list';
import { MCOptionDTO, McQuestionDTO, OptionDTO, QuestionDTO, QuestionVersionDTO, UserAnswerDTO } from '@DTOs/question.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';  

@Component({
  selector: 'app-mcTask',
  templateUrl: './mcTask.component.html',
  styleUrls: ['./mcTask.component.css']
})

export class McTaskComponent implements OnInit {

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
  }

  //the mc question data
  mcQuestion : McQuestionDTO = {
    id : -1,
    isSC : false,
    shuffleOptions : false
  }

  //the userAnswer data
  userAnswer : UserAnswerDTO = {
    id: -1,
    userId: -1,
    questionId: -1,
    feedbackId: null,
    userFreetextAnswer: null,
  }

  //the requested question
  questionId: number;
  
  //the current unser
  @Input() userId : number = 2;

  //isSelfAssessment
  @Input() isSelfAssessment: boolean = true;
  
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
    this.questionDataService.createUserAnswer(this.userId, this.questionData.id).subscribe(data => {
      this.userAnswer = data;
  
      //add the selected options to the submit
      for(let optionSelected of this.selectedOptions) {
        console.log(optionSelected);
        console.log(this.userAnswer.id);
        this.questionDataService.createUserMCOptionSelected(this.userAnswer.id, optionSelected).subscribe();
      }
    
    });
    
    this.submitDisabled = true;

  }

  //Get data from dialog
  constructor(
    public dialogRef: MatDialogRef<McTaskComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private questionDataService: QuestionDataService) { 

    this.questionId = data.question_id as number;
  }

  ngOnInit() {
    //Get the newest Version of the requested question
    this.questionDataService.getNewestQuestionVersion(this.questionId).subscribe(data => {
      this.questionData = data;
      //console.log("The data of the newest question version: " + data.id);
      //console.log("The data of the newest question version (check): " + this.questionData.id);

      //Get the mc question data of the newest question version
      this.questionDataService.getMCQuestion(this.questionData.id).subscribe(data => {
        this.mcQuestion = data;
        //console.log("The mc question data: " + data);
        //console.log("The mc question data (check): " + this.mcQuestion);
      
        //Get the MC-Options of the question
        this.questionDataService.getMCOptions(this.mcQuestion.id).subscribe(data => {
          console.log(this.mcQuestion.id);
          this.options = data;
          console.log("The mc question options: " + data);
          console.log("The mc question options (check)" + this.options);
        });
      })
    });  
  }

}