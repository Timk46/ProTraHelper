import { ContentDTO, ContentsForConceptDTO } from '@DTOs/content.dto';
import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ContentViewComponent } from '../contentView/contentView.component';
import { MatTab } from '@angular/material/tabs';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { ContentService } from 'src/app/Services/content/content.service';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';
import { FreeTextTaskComponent } from '../contentView/contentElement/free-text-task/free-text-task.component';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';

interface ContentViewData {
  id: number;
  name: string;
  progress: any;
  question: any;
  action: ContentDTO;
}

interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number;
  name: string;
  type: string;
  progress: number;
  description?: string;
  level: number;
}

@Component({
  selector: 'app-contentBoard',
  templateUrl: './contentBoard.component.html',
  styleUrls: ['./contentBoard.component.css'],
})
export class ContentBoardComponent implements OnInit, OnChanges {
  @Input() activeConceptNodeId: any; //needed for the discussion creation dialog

  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  @ViewChild(MatSort) sort: MatSort;

  //the data for the table of questions
  displayedColumns: string[] = [
    'id',
    'name',
    'type',
    'progress',
    //'level',
    'actions'
  ];

  getRouterLink(index: number): string {
    return `/tutor-kai/code/${index}`;
  }

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

  dataSource: MatTableDataSource<TaskViewData>;

  constructor(private router: Router, public dialog: MatDialog) {
    this.dataSource = new MatTableDataSource<TaskViewData>();
    this.sort = new MatSort();
  }


  ngOnInit() {
  }

  ngOnChanges() {
    const data: TaskViewData[] = [];
    for (let content of this.contentsForActiveConceptNode.trainedBy) {
      for (let contentElement of content.contentElements) {
        if (contentElement.question == null) {
          continue;
        }
        const input: TaskViewData = {
          contentNodeId: content.contentNodeId,
          contentElementId: contentElement.id,
          id: contentElement.question.id,
          name: contentElement.question.name ? contentElement.question.name : content.name,
          type: contentElement.question.type,
          progress: contentElement.question.progress,
          description: contentElement.question.description,
          level: contentElement.question.level,
        };
        data.push(input);
      }

    }
    this.dataSource = new MatTableDataSource(data);
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  onContentClick(content: ContentDTO, type: string[]) {

    // Create Dialog Config https://material.angular.io/components/dialog/api#MatDialogConfig
    const dialogConfig = new MatDialogConfig();

    // Communicate ContentDTO with all ContentElements of that ContentView to the Dialog/ContentViewComponent
    dialogConfig.data = {
      contentViewData: content,
      conceptNodeId: this.activeConceptNodeId,
      contentTypes: type,
    };

    // Open the Dialog with ContentViewComponent. We could navigate to the component instead aswell.
    this.dialog.open(ContentViewComponent, dialogConfig);
  }

  onTaskClick(taskViewData: TaskViewData) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      taskViewData: taskViewData,
    };
    //dialogConfig.maxHeight = "80vh";
    dialogConfig.width = "auto";
    let dialogRef;
    if (taskViewData.type == 'MC') {
      dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
      const dialogSubmitSubscription = dialogRef.componentInstance.submitClicked.subscribe((data) => {
        console.log('submit clicked', data);
        this.dataSource.data = this.dataSource.data.map((element) => {
          if (element.id === taskViewData.id) {
            element.progress = data;
          }
          return element;
        });
        dialogSubmitSubscription.unsubscribe();
      });
    }
    
    if (taskViewData.type == 'SC') {
      dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
      const dialogSubmitSubscription = dialogRef.componentInstance.submitClicked.subscribe((data) => {
        console.log('submit clicked', data);
        this.dataSource.data = this.dataSource.data.map((element) => {
          if (element.id === taskViewData.id) {
            element.progress = data;
          }
          return element;
        });
        dialogSubmitSubscription.unsubscribe();
      });
    }

    if (taskViewData.type == 'FreeText') {
      dialogRef = this.dialog.open(FreeTextTaskComponent, dialogConfig);
      const dialogSubmitSubscription = dialogRef.componentInstance.submitClicked.subscribe((data) => {
        console.log('submit clicked', data);
        this.dataSource.data = this.dataSource.data.map((element) => {
          if (element.id === taskViewData.id) {
            element.progress = data;
          }
          return element;
        });
        dialogSubmitSubscription.unsubscribe();
      });
    }

    if (taskViewData.type == 'CodingQuestion') {
      this.router.navigate([this.getRouterLink(taskViewData.id)]);
    }
  }

  hasContentElementType(content : ContentDTO, type: string) {
    return content.contentElements.some(element => element.type === type);
  }

  getFilteredData(contentNodeId: number) {
    return this.dataSource.data.filter(element => element.contentNodeId === contentNodeId);
  }

  getLevels(num: number) {
    return new Array(num);
  }

}
