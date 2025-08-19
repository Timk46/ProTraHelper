import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-content-node-dialog',
  templateUrl: './create-content-node-dialog.component.html',
  styleUrls: ['./create-content-node-dialog.component.scss'],
})
export class CreateContentNodeDialogComponent {
  form: FormGroup;

  constructor(
    private readonly dialogRef: MatDialogRef<CreateContentNodeDialogComponent>,
    private readonly fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      difficulty: ['', Validators.required],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Submits the form data.
   *
   * If the form is valid, it closes the dialog with the form value.
   * If the form is invalid, it marks all form controls as touched.
   */
  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
