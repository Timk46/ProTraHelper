import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, Inject, ViewChild } from '@angular/core';
import { NgSelectOption } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-description-dialog',
  templateUrl: './description-dialog.component.html',
  styleUrls: ['./description-dialog.component.scss']
})
export class MCDescriptionDialogComponent {

  @ViewChild('autosize') autosize: CdkTextareaAutosize | undefined;
  constructor(
    public dialogref: MatDialogRef<MCDescriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {description: string}  ) { }


  onNoClick() {
    this.dialogref.close();
  }
}
