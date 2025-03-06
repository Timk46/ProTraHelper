import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Abbrechen</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Ja, löschen</button>
    </mat-dialog-actions>
  `,
})
export class CodeGameConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CodeGameConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}
}
