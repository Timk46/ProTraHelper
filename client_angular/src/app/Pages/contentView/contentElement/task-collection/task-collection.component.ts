import { DialogRef } from '@angular/cdk/dialog';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { QuestionDataService } from '../../../../Services/question/question-data.service';

interface TaskViewData {
  contentNodeId?: number;
  contentElementId: number;
  id: number;
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
  }
}
