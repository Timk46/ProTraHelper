import { ContentDTO, discussionCreationDTO } from '@DTOs/index';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CreationDialogComponent } from 'src/app/Pages/discussion/creation-dialog/creation-dialog.component';
import { DiscussionCreationDialogComponent } from 'src/app/Pages/discussion/discussion-creation-dialog/discussion-creation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DiscussionDialogService {

  constructor(private dialog: MatDialog) { }

  /**
   * Opens the discussion creation dialog. The dialog is used to choose a content node for the discussion.
   * This function does not connect a discussion to a contentElement
   * @param conceptNode
   * @param contentNodes
   * @param userId
   */
  openContentSelection(conceptNode: number, contentNodes: ContentDTO[], userId: number){
    const dialogRef = this.dialog.open(CreationDialogComponent, {
      width: '40%',
      data: contentNodes
    });

    dialogRef.afterClosed().subscribe((result: ContentDTO) => {
      if (result) {
        this.openDiscussionCreation(conceptNode, result.contentNodeId, -1, userId);
      }
    });
  }

  /**
   * Opens the discussion creation dialog. Here the user can create a discussion for the given concept and content node
   * @param discussionData
   */
  openDiscussionCreation(conceptNodeId: number, contentNodeId: number, contentElementId: number, userId: number = -1){
    if (userId == -1) {
      throw new Error("DiscussionDialogService: userId is not set. Please rewrite this function when auth is implemented");
    }
    const dialogRef = this.dialog.open(DiscussionCreationDialogComponent, {
      width: '50%',
      panelClass: 'discussionDialog',
      //height: '95%',
      data: {
        id: -1,
        title: "",
        conceptNodeId: conceptNodeId,
        contentNodeId: contentNodeId,
        contentElementId: contentElementId,
        authorId: userId, //needs rework when auth is implemented
        isSolved: false
      }
    });

    dialogRef.afterClosed().subscribe((result: number) => {
      if (result && result != -1) {
        // do something with the selected content node
        console.log("created discussion id: " + result);
        const url = `/discussion-page/${result}`;
        window.open(url, "_blank");
      } else {
        console.log("no discussion created");
      }
    });
  }
}
