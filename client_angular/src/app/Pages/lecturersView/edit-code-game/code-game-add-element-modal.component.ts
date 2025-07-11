import { Component, Inject } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import type { FormBuilder, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-add-element-modal',
  template: `
    <h2 mat-dialog-title>Add New {{ data.type | titlecase }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width" style="padding-top: 5px">
          <mat-label>File Name</mat-label>
          <input matInput formControlName="fileName" required />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Code</mat-label>
          <textarea matInput formControlName="code" rows="10" required></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!form.valid" (click)="onSubmit()">
        Add
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class CodeGameAddElementModalComponent {
  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    public dialogRef: MatDialogRef<CodeGameAddElementModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { type: string },
  ) {
    this.form = this.fb.group({
      fileName: ['', Validators.required],
      code: ['', Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
