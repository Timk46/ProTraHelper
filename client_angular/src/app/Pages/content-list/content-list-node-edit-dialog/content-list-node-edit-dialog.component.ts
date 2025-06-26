import { Component, Inject, Input, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContentDTO } from '@DTOs/index';

@Component({
  selector: 'app-content-list-node-edit-dialog',
  templateUrl: './content-list-node-edit-dialog.component.html',
  styleUrls: ['./content-list-node-edit-dialog.component.scss']
})
export class ContentListNodeEditDialogComponent implements OnInit {
  form: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<ContentListNodeEditDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ContentDTO
  ) {
    this.form = this.fb.group({
      name: [data.name, Validators.required],
      description: [data.description],
      difficulty: [data.level, Validators.required]
    });
  }

  ngOnInit(): void {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
