import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { QuestionVersionDTO } from '@DTOs/question.dto';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { TaskOverviewService } from 'src/app/Services/taskOverview/task-overview.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';

@Component({
  selector: 'app-task-overview',
  templateUrl: './task-overview.component.html',
  styleUrls: ['./task-overview.component.scss'],
})
export class TaskOverviewComponent implements OnInit, OnChanges {

  @Input() activeConceptNodeId: any; 

  questionsIDsForConcept : Number[] = [];

  studentQuestionStutus : any = [];

  //activeTask : Number = -1;
  showTask : Boolean = false;

  constructor (private taskOverviewService : TaskOverviewService, private questionDataService : QuestionDataService, private dialog : MatDialog) { }

  ngOnInit() { }

  ngOnChanges() { 
    this.taskOverviewService.getTaskIdsForConceptNode(this.activeConceptNodeId).subscribe(data => {
      console.log(this.activeConceptNodeId);
      this.questionsIDsForConcept = data;

      for(let questionID of this.questionsIDsForConcept) {
        //init question version data
        this.questionDataService.getNewestQuestionVersion(questionID as number).subscribe(data => {
          let questionVersion = data;
          let input = {
            q_id: questionID,
            version: questionVersion,
            passed: false,
            attempts: 4,
            progress: 20,
            type: 'Multiple Choice',
            color: 'warn',
          }
          this.studentQuestionStutus.push(input);
          console.log(this.studentQuestionStutus);
        })
      }

    });
  }

  onTaskClick(question : any) {
    console.log('active task id: ' + question.q_id);
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      question_id: question.q_id
    }  

    this.dialog.open(McTaskComponent, dialogConfig);

    //this.showTask = true;
    //this.activeTask = question_id;
  }
    
}
