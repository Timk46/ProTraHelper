import { ContentDTO, ContentsForConceptDTO } from '@DTOs/content.dto';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ContentViewComponent } from '../contentView/contentView.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { McTaskComponent } from '../contentView/contentElement/mcTask/mcTask.component';
import { FreeTextTaskComponent } from '../contentView/contentElement/free-text-task/free-text-task.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, Observable } from 'rxjs';

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
    'actions',
  ];

  getRouterLink(index: number): string {
    return `/tutor-kai/code/${index}`;
  }

  titles = [
    'Python Kapitalwert',
    'Python Buchhandlung',
    'Python Quersumme',
    'Python_Fibonacci Index',
    'Buchstabenfrequenz',
    'Rekursive Summe',
    'Euklidischer Algorithmus',
    'Sieb des Erathostenes',
    'Java Alter',
    'Java Bruchsumme',
    'Java Discount',
    'Java Maximalwert',
    'Java Arrays und Schleifen',
    'Java Königsschach',
    'Java Switch',
    'Java Bibliothek',
    'Java GGT',
    'Java Uni',
    'Java VektorWork',
    'Java_KFZ',
    'Java_Punkt',
    'Java_Bank',
    'Java_Radio',
    'UMLtoJava',
    'Java_Airline',
    'Java_Koerper',
    'Java_Threads',
    'Python Matrix',
    'Python Funktionen',
    'Python Potenz',
    'Python Drehe String',
    'Python Steuer',
    'Python Filter Liste',
    'Python Reduziere Liste',
    'Python Fibonacci',
    'Java Wettrennen',
    'Java BubbleSort',
    'Java UML to Java',
  ];
  isHandset$: Observable<boolean> = this.bps.observe(Breakpoints.Handset)
  .pipe(
    map(result => result.matches)
  );
  dataSource: MatTableDataSource<TaskViewData>;

  constructor(private router: Router, public dialog: MatDialog, private bps: BreakpointObserver) {



    this.dataSource = new MatTableDataSource<TaskViewData>();
    this.sort = new MatSort();
  }

  ngOnInit() {
    this.bps.observe([
      Breakpoints.Handset,
      Breakpoints.Tablet,
      Breakpoints.Web]).subscribe(result => {
        console.log("result what breakpoints to handle",result.breakpoints);
        this.handleBreakpoints(result.breakpoints);
    });
  }

  handleBreakpoints(breakpoints: { [key: string]: boolean }) {

    if (this.bps.isMatched(Breakpoints.Handset)) {
        console.log('Handset');
        this.updateDisplayedColumns(['type', 'progress', 'actions']);
    }
    else if (this.bps.isMatched(Breakpoints.Tablet)) {
      console.log('Tablet');
        this.updateDisplayedColumns([ 'name', 'type', 'progress']);
    }
  }
   updateDisplayedColumns(columns: string[]) {
     this.displayedColumns = columns;
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
          name: contentElement.question.name
            ? contentElement.question.name
            : content.name,
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

  // For Video und PDF
  onContentClick(content: ContentDTO, type: string[], event: MouseEvent) {
    event.stopPropagation(); // prevents any reaction from the expansion panel for clicks on video/pdf

    // Create Dialog Config https://material.angular.io/components/dialog/api#MatDialogConfig
    const dialogConfig = new MatDialogConfig();

    dialogConfig.width = '70vw';
    dialogConfig.maxHeight = '95vh';
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
    dialogConfig.width = 'auto';
    dialogConfig.maxHeight = '95vh';
    let dialogRef;
    if (taskViewData.type == 'MC') {
      dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
    }

    if (taskViewData.type == 'SC') {
      dialogRef = this.dialog.open(McTaskComponent, dialogConfig);
    }

    if (taskViewData.type == 'FreeText') {
      dialogRef = this.dialog.open(FreeTextTaskComponent, dialogConfig);
    }

    if (dialogRef) {
      const prevScore = taskViewData.progress;
      const dialogSubmitSubscription =
        dialogRef.componentInstance.submitClicked.subscribe((score) => {
          this.dataSource.data = this.dataSource.data.map((element) => {
            if (element.id === taskViewData.id) {
              // Update the progress value of the task
              if(score > prevScore) {
                element.progress = score;
              }
              // Update the contentNode that is connected to the task
              if (score == 100 && prevScore != 100) {
                this.contentsForActiveConceptNode.trainedBy.map((content) => {
                  if (
                    content.contentElements.some(
                      (element) => element.id === taskViewData.contentElementId
                    )
                  ) {
                    const elementCount = content.contentElements.length;
                    content.progress += 100 / elementCount;
                  }
                });
              }
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

  hasContentElementType(content: ContentDTO, type: string) {
    return content.contentElements.some((element) => element.type === type);
  }

  getFilteredData(contentNodeId: number) {
    return this.dataSource.data.filter(
      (element) => element.contentNodeId === contentNodeId
    );
  }

  getLevels(num: number) {
    return new Array(num);
  }

  genBetterElementNames(type: string): string {
    switch (type) {
      case 'MC':
        return 'Multiple Choice';
      case 'SC':
        return 'Single Choice';
      case 'FreeText':
        return 'Freitext';
      case 'CodingQuestion':
        return 'Programmieraufgabe';
      default:
        return 'undefiniert';
    }
  }
}
