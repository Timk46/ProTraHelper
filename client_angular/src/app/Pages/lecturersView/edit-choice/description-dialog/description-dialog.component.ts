import type { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, Inject, ViewChild } from '@angular/core';
import { NgSelectOption } from '@angular/forms';
import type { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-description-dialog',
  templateUrl: './description-dialog.component.html',
  styleUrls: ['./description-dialog.component.scss'],
})
export class DescriptionDialogComponent {
  @ViewChild('autosize') autosize: CdkTextareaAutosize | undefined;
  constructor(
    public dialogref: MatDialogRef<DescriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { description: string },
  ) {}

  onNoClick() {
    this.dialogref.close();
  }
}
