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
  isLoading = false; // New from plan

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
    this.isLoading = true;
    this.questionService
      .getTaskCollectionData(this.taskViewData.id, this.taskViewData.contentNodeId)
      .subscribe(data => {
        this.setupCollection(data);
        this.isLoading = false;
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
      this.loadTaskComponent();
    }
  }

  startTasks() {
    this.showStartPage = false;
    this.loadTaskComponent();
  }

  private loadTaskComponent() {
    if (!this.taskHost) {
      // Defer if view is not ready
      setTimeout(() => this.loadTaskComponent(), 50);
      return;
    }

    this.isLoading = true;
    this.componentRef?.destroy(); // Destroy previous component immediately

    // Loading animation for better UX
    setTimeout(() => {
      if (this.currentIndex < 0 || this.currentIndex >= this.sortedTasks.length) {
        this.isLoading = false;
        return;
      }

      const currentTaskElement = this.sortedTasks[this.currentIndex];

      if (!currentTaskElement.questionId || !currentTaskElement.questionType) {
        console.error(`Task is missing questionId or questionType:`, currentTaskElement);
        this.isLoading = false;
        return;
      }

      const componentToLoad = this.componentMap[currentTaskElement.questionType];
      this.taskHost.clear();

      if (!componentToLoad) {
        console.error(`No component mapped for question type: ${currentTaskElement.questionType}`);
        this.componentRef = undefined;
        this.isLoading = false;
        return;
      }

      this.componentRef = this.taskHost.createComponent(componentToLoad);

      const taskViewDataForComponent: TaskViewData = {
        id: currentTaskElement.questionId,
        contentElementId: currentTaskElement.id,
        type: currentTaskElement.questionType as questionType,
        progress: currentTaskElement.userProgress ?? 0,
        contentNodeId: this.taskViewData.contentNodeId,
      };

      this.componentRef.instance.collectionMode = true;
      this.componentRef.instance.taskViewData = taskViewDataForComponent;
      this.isCurrentTaskCompleted = taskViewDataForComponent.progress === 100;

      this.componentRef.instance.submitClicked.subscribe(score => {
        this.handleTaskSubmission(score);
      });

      this.isLoading = false;
    }, 300); // Simulate loading time for smooth transition
  }

  private handleTaskSubmission(score: number) {
    const currentTask = this.sortedTasks[this.currentIndex];
    // Update progress only if it's higher than the previous score
    if (score > (currentTask.userProgress ?? 0)) {
      currentTask.userProgress = score;
    }
    if (currentTask.userProgress === 100) {
      currentTask.markedAsDone = true;
      this.isCurrentTaskCompleted = true;
    }
  }

  goToNextTask() {
    if (this.currentIndex < this.sortedTasks.length - 1) {
      this.currentIndex++;
      this.loadTaskComponent();
    } else {
      // All tasks are done
      this.submitClicked.emit(100);
      this.onClose();
    }
  }

  goToPreviousTask() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadTaskComponent();
    }
  }

  // New methods from the plan

  /**
   * Navigate to a specific task by its index.
   * @param index The index of the task to navigate to.
   */
  goToTask(index: number): void {
    if (index >= 0 && index < this.sortedTasks.length && index !== this.currentIndex) {
      this.currentIndex = index;
      this.loadTaskComponent();
    }
  }

  /**
   * Check if a task at a given index is completed.
   * @param index The index of the task.
   * @returns True if the task's progress is 100 or more.
   */
  isTaskCompleted(index: number): boolean {
    const task = this.sortedTasks[index];
    return (task?.userProgress ?? 0) >= 100;
  }

  /**
   * Get the total count of completed tasks.
   * @returns The number of completed tasks.
   */
  getCompletedTasksCount(): number {
    return this.sortedTasks.filter((_, index) => this.isTaskCompleted(index)).length;
  }

  /**
   * Calculate the overall progress percentage for the entire collection.
   * @returns A number between 0 and 100.
   */
  getOverallProgress(): number {
    if (this.sortedTasks.length === 0) return 0;
    const completedCount = this.getCompletedTasksCount();
    return (completedCount / this.sortedTasks.length) * 100;
  }

  /**
   * Close the dialog.
   */
  onClose(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  /**
   * Finds the index of the first task that is not yet completed.
   * @returns The index of the first uncompleted task, or -1 if all are completed.
   */
  private getFirstUncompletedTaskIndex(): number {
    return this.sortedTasks.findIndex(task => (task.userProgress ?? 0) < 100);
  }

  /**
   * Determines if a task at a given index is accessible to the user.
   * A task is accessible if all previous tasks are completed.
   * @param index The index of the task to check.
   * @returns True if the task is accessible.
   */
  isTaskAccessible(index: number): boolean {
    const firstUncompletedIndex = this.getFirstUncompletedTaskIndex();
    // If all tasks are completed, all are accessible.
    if (firstUncompletedIndex === -1) {
      return true;
    }
    // Otherwise, only tasks up to and including the first uncompleted one are accessible.
    return index <= firstUncompletedIndex;
  }
}