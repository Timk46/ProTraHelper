import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { detailedQuestionDTO, GroupReviewStatusDTO } from '@DTOs/index';

@Component({
  selector: 'app-group-review-gate-dialog',
  templateUrl: './group-review-gate-dialog.component.html',
  styleUrls: ['./group-review-gate-dialog.component.scss']
})
export class GroupReviewGateDialogComponent implements OnInit {

  statuses: GroupReviewStatusDTO[] = [];
  displayedColumns: string[] = ['submissionIdentifier', 'reviewPhase', 'userStatus', 'action'];

  constructor(
    public dialogRef: MatDialogRef<GroupReviewGateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { question: detailedQuestionDTO }
  ) { }

  ngOnInit(): void {
    if (this.data.question && this.data.question.groupReviewStatuses) {
      this.statuses = this.data.question.groupReviewStatuses;
    }
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
