import type { discussionFilterContentNodeDTO } from '@DTOs/index';
import { Component, Inject } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-discussion-precreation',
  templateUrl: './discussion-precreation.component.html',
  styleUrls: ['./discussion-precreation.component.scss'],
})
export class DiscussionPrecreationComponent {
  contentNodes: discussionFilterContentNodeDTO[];

  constructor(
    public dialogRef: MatDialogRef<DiscussionPrecreationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: discussionFilterContentNodeDTO[],
  ) {
    this.contentNodes = data;
  }

  /**
   * Closes the dialog and passes the selected content node to the parent component
   * @param contentNode
   */
  onSelect(contentNode: discussionFilterContentNodeDTO) {
    this.dialogRef.close(contentNode);
  }

  /**
   * Closes the dialog and passes a common content node to the parent component
   */
  onAllSelect() {
    //console.log("Alle");
    this.dialogRef.close({
      id: -1,
      name: 'Alle',
      description: '',
    });
  }

  /**
   * Closes the dialog without passing any data to the parent component
   */
  onCancel() {
    this.dialogRef.close();
  }
}
