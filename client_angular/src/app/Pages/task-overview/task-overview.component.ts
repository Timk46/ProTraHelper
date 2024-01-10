import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { QuestionVersionDTO } from '@DTOs/question.dto';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { TaskOverviewService } from 'src/app/Services/taskOverview/task-overview.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';
import { FreeTextTaskComponent } from '../contentView/contentElement/free-text-task/free-text-task.component';

@Component({
  selector: 'app-task-overview',
  templateUrl: './task-overview.component.html',
  styleUrls: ['./task-overview.component.scss'],
})
export class TaskOverviewComponent implements OnInit, OnChanges {

  @Input() activeConceptNodeId: any; 

  questionsForConcept : Number[] = [];
  questionIdentityData : {id: number, type: string}[] = [];

  //activeTask : Number = -1;
  showTask : Boolean = false;

  constructor (private taskOverviewService : TaskOverviewService, private questionDataService : QuestionDataService, private dialog : MatDialog) { }

  ngOnInit() { }

  ngOnChanges() { 
    /* this.taskOverviewService.getTaskIdsForConceptNode(this.activeConceptNodeId).subscribe(data => {
      console.log(this.activeConceptNodeId);
      this.questionsForConcept = data;
    }); */

    this.taskOverviewService.getTaskIdentityDataForConceptNode(this.activeConceptNodeId).subscribe(identityData => {
      console.log(this.activeConceptNodeId);
      this.questionIdentityData = identityData;
      console.log(this.questionIdentityData);
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

  /**
   * Opens the task dialog for the given task id and type
   * @param question_data 
   */
  onTaskIdentityClick(question_data: {id: number, type: string}) {
    console.log('active task id: ' + question_data.id);
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      question_id: question_data.id,
    }  
    if (question_data.type == 'SC') { // why SC and not MC?
      this.dialog.open(McTaskComponent, dialogConfig);
    }
    if (question_data.type == 'FreeText') {
      this.dialog.open(FreeTextTaskComponent, dialogConfig);
    }
  }
    
}
