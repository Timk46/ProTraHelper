import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { QuestionVersionDTO } from '@DTOs/question.dto';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { TaskOverviewService } from 'src/app/Services/taskOverview/task-overview.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';
import { FreeTextTaskComponent } from '../contentView/contentElement/free-text-task/free-text-task.component';
import { taskOverviewElementDTO } from '@DTOs/taskOverview.dto';
import { MatTableDataSource } from '@angular/material/table';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

@Component({
  selector: 'app-task-overview',
  templateUrl: './task-overview.component.html',
  styleUrls: ['./task-overview.component.scss'],
})
export class TaskOverviewComponent implements OnInit, OnChanges {

  @Input() activeConceptNodeId: any; 
  taskOverviewData : taskOverviewElementDTO[] = [];

  //the data for the table
  displayedColumns: string[] = ['id', 'name', 'type', 'attempts', 'progress', 'actions'];

  constructor (private taskOverviewService : TaskOverviewService, private questionDataService : QuestionDataService, private dialog : MatDialog) {
    
  }

  ngOnInit() { }

  ngOnChanges() { 

    this.taskOverviewService.getTaskOverviewDataForConceptNode(this.activeConceptNodeId).subscribe(taskOverviewData => {
      console.log(this.activeConceptNodeId);
      this.taskOverviewData = taskOverviewData;
      console.log(this.taskOverviewData);
    });
  }

  onTaskClick(question : any) {
    console.log('active task id: ' + question.q_id);
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      question_id: question.q_id
    }  

    this.dialog.open(McTaskComponent, dialogConfig);

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
    if (question_data.type == 'MC') { // why SC and not MC?
      this.dialog.open(McTaskComponent, dialogConfig);
    }
    if (question_data.type == 'FreeText') {
      this.dialog.open(FreeTextTaskComponent, dialogConfig);
    }
  }
    
}
