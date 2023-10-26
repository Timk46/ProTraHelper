import { ContentDTO } from '@DTOs/content.dto';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-creation-dialog',
  templateUrl: './creation-dialog.component.html',
  styleUrls: ['./creation-dialog.component.scss']
})
export class CreationDialogComponent {

  contentNodes: ContentDTO[];

  constructor(public dialogRef: MatDialogRef<CreationDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: ContentDTO[]) {
    this.contentNodes = data;
  }

  onSelect(contentNode: ContentDTO) {
    this.dialogRef.close(contentNode);
  }

  onAllSelect(){
    this.dialogRef.close({
      contentNodeId: -1,
      name: "Alle",
      description: "",
      contentElements: [],
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
