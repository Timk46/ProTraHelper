import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { detailedQuestionDTO, GroupReviewStatusDTO } from '@DTOs/index';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';

interface TaskViewData {
  contentNodeId: number;
  contentElementId: number;
  id: number;
  name: string;
  type: string;
  progress: number;
  description?: string;
}

@Component({
  selector: 'app-group-review-gate-dialog',
  templateUrl: './group-review-gate-dialog.component.html',
  styleUrls: ['./group-review-gate-dialog.component.scss']
})
export class GroupReviewGateDialogComponent implements OnInit {

  @Output() submitClicked = new EventEmitter<any>();

  taskViewData: TaskViewData;
  statuses: GroupReviewStatusDTO[] = [];
  displayedColumns: string[] = ['submissionIdentifier', 'reviewPhase', 'userStatus', 'action'];

  constructor(
    private questionDataService: QuestionDataService,
    public dialogRef: MatDialogRef<GroupReviewGateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.taskViewData = data.taskViewData;
    console.log('Dialog data:', this.taskViewData);
  }

  ngOnInit(): void {
    this.getGroupReviewStatuses();
  }

  getGroupReviewStatuses(): void {
    this.questionDataService.getGroupReviewStatuses(this.taskViewData.id).subscribe({
      next: (statuses: GroupReviewStatusDTO[]) => {
        this.statuses = statuses;
        console.log('Fetched group review statuses:', this.statuses);
      },
      error: (error) => {
        console.error('Error fetching group review statuses:', error);
      }
    });
  }


  onGoToReview(status: GroupReviewStatusDTO): void {
    // TODO: Implement navigation to the actual review page
    console.log('Navigate to review for:', status.submissionIdentifier);
    this.dialogRef.close();
  }

  onClose(): void {
    this.dialogRef.close();
  }

}
