import { Component, OnInit, Input, Inject } from '@angular/core';
import { MatList, MatSelectionListChange } from '@angular/material/list';
import { MatListOption } from '@angular/material/list';
import { MCOptionDTO, McQuestionDTO, OptionDTO, QuestionDTO, QuestionVersionDTO, UserMCAnswerDTO } from '@DTOs/question.dto';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';  

@Component({
  selector: 'app-mcTask',
  templateUrl: './mcTask.component.html',
  styleUrls: ['./mcTask.component.css']
})

export class McTaskComponent implements OnInit {

  //init question version data
  questionVersion : QuestionVersionDTO = {
    id : -1,
    questionId : -1,
    version : -1,
    isApproved : false,
    successor : null
  }
  //init question data
  questionData : QuestionDTO = {
    id : -1,
    name : '',
    description : '',
    score : -1,
    type : '',
    text : ''
  }

  //the mc question data
  mcQuestion : McQuestionDTO = {
    id : -1,
    isSC : false,
    shuffleOptions : false
  }

  //the userMCAnswer data
  userMCAnswer : UserMCAnswerDTO = {
    id: -1,
    userId: -1,
    mcQuestionId: -1
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
    this.questionDataService.createUserMCAnswer(this.userId, this.mcQuestion.id).subscribe(data => {
      this.userMCAnswer = data;
  
      //add the selected options to the submit
      for(let optionSelected of this.selectedOptions) {
        console.log(optionSelected);
        console.log(this.userMCAnswer.id);
        this.questionDataService.createUserMCOptionSelected(this.userMCAnswer.id, optionSelected).subscribe();
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
      this.questionVersion = data;
      //console.log(data);
      //console.log(this.questionVersion);
    
      //Get the question data of the newest question version
      this.questionDataService.getQuestionData(this.questionVersion.questionId).subscribe(data => {
        this.questionData = data;
        //console.log(data);
        //console.log(this.questionData);
      });

      //Get the mc question data of the newest question version
      this.questionDataService.getMCQuestion(this.questionVersion.id).subscribe(data => {
        this.mcQuestion = data;
        //console.log(data);
        //console.log(this.mcQuestion);
      
        //Get the MC-Options of the question
        this.questionDataService.getMCOptions(this.mcQuestion.id).subscribe(data => {
          //console.log(this.mcQuestion.id);
          this.options = data;
          //console.log(data);
          //console.log(this.options);
        });
      })
  
    });  
  }

}