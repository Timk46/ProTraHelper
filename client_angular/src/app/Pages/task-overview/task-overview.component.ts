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
import { Router } from '@angular/router';

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
  displayedColumns: string[] = ['id', 'name', 'type', 'attempts', 'progress', 'mode', 'actions'];

  titles = [
    "Python Kapitalwert",
    "Python Buchhandlung",
    "Python Quersumme",
    "Python_Fibonacci Index",
    "Buchstabenfrequenz",
    "Rekursive Summe",
    "Euklidischer Algorithmus",
    "Sieb des Erathostenes",
    "Java Alter",
    "Java Bruchsumme",
    "Java Discount",
    "Java Maximalwert",
    "Java Arrays und Schleifen",
    "Java Königsschach",
    "Java Switch",
    "Java Bibliothek",
    "Java GGT",
    "Java Uni",
    "Java VektorWork",
    "Java_KFZ",
    "Java_Punkt",
    "Java_Bank",
    "Java_Radio",
    "UMLtoJava",
    "Java_Airline",
    "Java_Koerper",
    "Java_Threads",
    "Python Matrix",
    "Python Funktionen",
    "Python Potenz",
    "Python Drehe String",
    "Python Steuer",
    "Python Filter Liste",
    "Python Reduziere Liste",
    "Python Fibonacci",
    "Java Wettrennen",
    "Java BubbleSort",
    "Java UML to Java"
  ];

  getRouterLink(index: number): string {
    return `/tutor-kai/code/${index}`;
  }

  getRouterLinkOLD(index: number): string {
    return `/tutor-kai/code/${index + 3}`;
  }

  constructor (private taskOverviewService : TaskOverviewService, private dialog : MatDialog, private router: Router) {
    
  }

  ngOnInit() { }

  ngOnChanges() {

    this.taskOverviewService.getTaskOverviewDataForConceptNode(this.activeConceptNodeId).subscribe(taskOverviewData => {
      console.log(this.activeConceptNodeId);
      this.taskOverviewData = taskOverviewData;
      console.log(this.taskOverviewData);
    });
  }

  /**
   * Opens the task dialog for the given task id and type
   * @param question_data
   */
  onTaskClick(question_data: {id: number, type: string}) {
    console.log('active task id: ' + question_data.id);
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      question_id: question_data.id,
    }
    let dialogRef;
    if (question_data.type == 'MC') { // why SC and not MC?
      dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
    }
    if (question_data.type == 'FreeText') {
      dialogRef = this.dialog.open(FreeTextTaskComponent, dialogConfig);
    }
    if (question_data.type == 'CodingQuestion') {
      this.router.navigate([this.getRouterLink(question_data.id)]);
    }
    
    if(dialogRef) {
      dialogRef.afterClosed().subscribe(result => {
        // Aktualisieren Sie hier die Seite
        this.ngOnChanges();
      });
    }
  }

}
