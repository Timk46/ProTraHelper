import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-feedback-hint-confirmation-dialog',
  templateUrl: './feedback-hint-confirmation-dialog.component.html',
  styleUrls: ['./feedback-hint-confirmation-dialog.component.scss']
})
export class FeedbackHintConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<FeedbackHintConfirmationDialogComponent>
  ) {}

  /**
   * Close the dialog when the user cancels (chooses "Nein")
   */
  cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Close the dialog when the user confirms (chooses "Ja")
   */
  confirm(): void {
    this.dialogRef.close(true);
  }
}
