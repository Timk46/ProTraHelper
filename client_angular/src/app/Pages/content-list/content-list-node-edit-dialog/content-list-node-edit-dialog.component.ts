import type { OnInit } from '@angular/core';
import { Component, Inject, Input } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import type { FormBuilder, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { ContentDTO } from '@DTOs/index';

@Component({
  selector: 'app-content-list-node-edit-dialog',
  templateUrl: './content-list-node-edit-dialog.component.html',
  styleUrls: ['./content-list-node-edit-dialog.component.scss'],
})
export class ContentListNodeEditDialogComponent implements OnInit {
  form: FormGroup;

  constructor(
    private readonly dialogRef: MatDialogRef<ContentListNodeEditDialogComponent>,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ContentDTO,
  ) {
    this.form = this.fb.group({
      name: [data.name, Validators.required],
      description: [data.description],
      difficulty: [data.level, Validators.required],
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
