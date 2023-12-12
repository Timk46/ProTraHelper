import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { TaskOverviewService } from 'src/app/Services/taskOverview/task-overview.service';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';

@Component({
  selector: 'app-task-overview',
  templateUrl: './task-overview.component.html',
  styleUrls: ['./task-overview.component.scss'],
})
export class TaskOverviewComponent implements OnInit, OnChanges {

  @Input() activeConceptNodeId: any; 

  questionsForConcept : Number[] = [];

  //activeTask : Number = -1;
  showTask : Boolean = false;

  constructor (private taskOverviewService : TaskOverviewService, private dialog : MatDialog) { }

  ngOnInit() { }

  ngOnChanges() { 
    this.taskOverviewService.getTaskIdsForConceptNode(this.activeConceptNodeId).subscribe(data => {
      console.log(this.activeConceptNodeId);
      this.questionsForConcept = data;
    });
  }

  onTaskClick(question_id : Number) {
    
    console.log('active task id: ' + question_id);
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      question_id: question_id
    }  

    this.dialog.open(McTaskComponent, dialogConfig);

    //this.showTask = true;
    //this.activeTask = question_id;
  }
    
}
