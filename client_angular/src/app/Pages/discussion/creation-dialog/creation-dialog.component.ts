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

  /**
   * Closes the dialog and passes the selected content node to the parent component
   * @param contentNode
   */
  onSelect(contentNode: ContentDTO) {
    this.dialogRef.close(contentNode);
  }

  /**
   * Closes the dialog and passes a common content node to the parent component
   */
  onAllSelect(){
    this.dialogRef.close({
      contentNodeId: -1,
      name: "Alle",
      description: "",
      contentElements: [],
    });
  }

  /**
   * Closes the dialog without passing any data to the parent component
   */
  onCancel() {
    this.dialogRef.close();
  }
}
