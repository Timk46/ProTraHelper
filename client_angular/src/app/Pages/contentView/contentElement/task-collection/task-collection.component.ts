import { DialogRef } from '@angular/cdk/dialog';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QuestionDataService } from '../../../../Services/question/question-data.service';
import { QuestionCollectionDto } from '@DTOs/index';

interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number; //the question id
  name: string;
  type: string;
  progress: number;
  description?: string;
}

@Component({
  selector: 'app-task-collection',
  standalone: true,
  imports: [],
  templateUrl: './task-collection.component.html',
  styleUrl: './task-collection.component.scss',
})
export class TaskCollectionComponent {
  @Input() taskViewData!: TaskViewData;
  @Output() submitClicked = new EventEmitter<any>();

  questionCollection: QuestionCollectionDto | undefined;

  constructor(
    public dialogRef: DialogRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly questionService: QuestionDataService,
  ) {
    // Initialization logic here
    if (data && data.taskViewData) {
      this.taskViewData = data.taskViewData;
    }
  }

  ngOnInit() {
    // Initialization logic here
    this.questionService
      .getTaskCollectionData(this.taskViewData.id, this.taskViewData.contentNodeId)
      .subscribe(data => {
        // Handle the retrieved task collection data
        console.log('TaskView Data:', this.taskViewData);
        console.log('Task Collection Data:', data);
        this.questionCollection = data;
        this.handleData();
      });
  }

  private handleData() {
    if (this.questionCollection) {
      // Filter out invisible elements and sort by position
      this.questionCollection = {
        ...this.questionCollection,
        linkedContentElements: this.questionCollection.linkedContentElements.sort(
          (a, b) => (a.position || 0) - (b.position || 0),
        ),
      };
      console.log('Sorted:', this.questionCollection.linkedContentElements);
    }
  }
}
