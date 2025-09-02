import { DialogRef } from '@angular/cdk/dialog';
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  Output,
  ViewChild,
  ViewContainerRef,
  ComponentRef,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QuestionDataService } from '../../../../Services/question/question-data.service';
import {
  LinkedCollectionContentElementDto,
  QuestionCollectionDto,
  questionType,
} from '@DTOs/index';

// Import all possible task components
import { McTaskComponent } from '../mcTask/mcTask.component';
import { FreeTextTaskComponent } from '../free-text-task/free-text-task.component';
import { FillinTaskNewComponent } from '../fill-in-task-new/fill-in-task-new.component';
import { UploadTaskComponent } from '../upload-task/upload-task.component';
import { GroupReviewGateDialogComponent } from '../group-review-gate-dialog/group-review-gate-dialog.component';

// This is the simplified data structure that the child components expect as an input.
interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number; //the question id
  name?: string;
  type: string;
  progress: number;
  description?: string;
}

// This is the interface the dynamically loaded components will adhere to
export interface ITaskComponent {
  collectionMode?: boolean;
  taskViewData: TaskViewData;
  submitClicked: EventEmitter<number>;
}

@Component({
  selector: 'app-task-collection',
  templateUrl: './task-collection.component.html',
  styleUrl: './task-collection.component.scss',
})
export class TaskCollectionComponent implements OnDestroy, AfterViewInit {
  @Input() taskViewData!: TaskViewData;
  @Output() submitClicked = new EventEmitter<any>();

  @ViewChild('taskHost', { read: ViewContainerRef, static: false })
  taskHost!: ViewContainerRef;

  componentRef?: ComponentRef<ITaskComponent>;

  // State Management
  questionCollection: QuestionCollectionDto | undefined;
  sortedTasks: LinkedCollectionContentElementDto[] = [];
  currentIndex = 0;
  isCurrentTaskCompleted = false;
  showStartPage = false;

  // update this if new question types are added
  private componentMap: { [key: string]: any } = {
    [questionType.SINGLECHOICE]: McTaskComponent,
    [questionType.MULTIPLECHOICE]: McTaskComponent,
    [questionType.FREETEXT]: FreeTextTaskComponent,
    [questionType.FILLIN]: FillinTaskNewComponent,
    [questionType.UPLOAD]: UploadTaskComponent,
    [questionType.GROUP_REVIEW_GATE]: GroupReviewGateDialogComponent,
  };

  constructor(
    public dialogRef: DialogRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly questionService: QuestionDataService,
  ) {
    if (data && data.taskViewData) {
      this.taskViewData = data.taskViewData;
    }
  }

  ngAfterViewInit() {
    this.questionService
      .getTaskCollectionData(this.taskViewData.id, this.taskViewData.contentNodeId)
      .subscribe(data => {
        this.setupCollection(data);
      });
  }

  ngOnDestroy() {
    this.componentRef?.destroy();
  }

  private setupCollection(data: QuestionCollectionDto) {
    if (!data) return;
    this.questionCollection = data;
    this.sortedTasks = [...this.questionCollection.linkedContentElements].sort(
      (a, b) => (a.position || 0) - (b.position || 0),
    );

    const firstUncompletedIndex = this.sortedTasks.findIndex(
      task => (task.userProgress ?? 0) < 100,
    );

    this.currentIndex =
      firstUncompletedIndex === -1 ? this.sortedTasks.length - 1 : firstUncompletedIndex;

    if (this.currentIndex < 0) this.currentIndex = 0;

    if (this.questionCollection.textHTML) {
      this.showStartPage = true;
    } else {
      // No start page, begin tasks immediately
      setTimeout(() => this.loadTaskComponent(), 0);
    }
  }

  startTasks() {
    this.showStartPage = false;
    setTimeout(() => this.loadTaskComponent(), 0);
  }

  private loadTaskComponent() {
    if (!this.taskHost) {
      console.warn('TaskHost ist noch nicht verfügbar');
      return;
    }

    if (this.currentIndex < 0 || this.currentIndex >= this.sortedTasks.length) {
      return;
    }

    const currentTaskElement = this.sortedTasks[this.currentIndex];

    if (!currentTaskElement.questionId) {
      console.error(`No QuestionId found for task: ${currentTaskElement.id}`);
      return;
    }

    if (!currentTaskElement.questionType) {
      console.error(`No question type found for task: ${currentTaskElement.id}`);
      return;
    }

    const componentToLoad = this.componentMap[currentTaskElement.questionType];

    this.taskHost.clear();
    this.componentRef?.destroy();

    if (!componentToLoad) {
      console.error(`No component mapped for question type: ${currentTaskElement.questionType}`);
      return;
    }

    this.componentRef = this.taskHost.createComponent(componentToLoad);

    const taskViewDataForComponent: TaskViewData = {
      id: currentTaskElement.questionId, // This is the Question ID
      contentElementId: currentTaskElement.id,
      type: currentTaskElement.questionType as questionType,
      progress: currentTaskElement.userProgress ?? 0,
      contentNodeId: this.taskViewData.contentNodeId,
    };

    this.componentRef.instance.collectionMode = true; // if component has dialog closing features
    this.componentRef.instance.taskViewData = taskViewDataForComponent;
    this.isCurrentTaskCompleted = taskViewDataForComponent.progress === 100;

    this.componentRef.instance.submitClicked.subscribe(score => {
      this.handleTaskSubmission(score);
    });
  }

  private handleTaskSubmission(score: number) {
    const currentTask = this.sortedTasks[this.currentIndex];
    if (currentTask.userProgress) {
      if (score > currentTask.userProgress) {
        currentTask.userProgress = score;
      }
    } else {
      currentTask.userProgress = score;
      currentTask.markedAsDone = score === 100;
    }

    if (score === 100) {
      this.isCurrentTaskCompleted = true;
    }
  }

  goToNextTask() {
    if (this.currentIndex < this.sortedTasks.length - 1) {
      this.currentIndex++;
      this.loadTaskComponent();
    } else {
      this.submitClicked.emit(100);
      this.dialogRef.close();
    }
  }

  goToPreviousTask() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadTaskComponent();
    }
  }
}
