import { ContentDTO, discussionCreationDTO, discussionFilterContentNodeDTO } from '@DTOs/index';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DiscussionCreationComponent } from 'src/app/Pages/Discussion/discussion-creation/discussion-creation.component';
import { DiscussionPrecreationComponent } from 'src/app/Pages/Discussion/discussion-creation/discussion-precreation/discussion-precreation.component';
import { DiscussionListService } from './discussion-list.service';

@Injectable({
  providedIn: 'root'
})
export class DiscussionDialogService {

  constructor(private dialog: MatDialog, private listService: DiscussionListService) { }

  /**
   * Opens the discussion creation dialog. The dialog is used to choose a content node for the discussion.
   * This function does not connect a discussion to a contentElement
   * @param conceptNode
   * @param contentNodes
   * @param userId
   */
  openContentSelection(conceptNode: number, userId: number = 1){ //TODO: replace userId with auth
    this.listService.getFilterContentNodes(conceptNode).subscribe(contentNodes => {
      const dialogRef = this.dialog.open(DiscussionPrecreationComponent, {
        width: '40%',
        data: contentNodes
      });

      dialogRef.afterClosed().subscribe((result: discussionFilterContentNodeDTO) => {
        if (result) {
          this.openDiscussionCreation(conceptNode, result.id, -1);
        }
      });
    });
  }

  /**
   * Opens the discussion creation dialog. Here the user can create a discussion for the given concept and content node
   * @param discussionData
   */
  openDiscussionCreation(conceptNodeId: number, contentNodeId: number, contentElementId: number, userId: number = 1){ //TODO: replace userId with auth
    const dialogRef = this.dialog.open(DiscussionCreationComponent, {
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
        const url = `/discussion-view/${result}`;
        window.open(url, "_blank");
      } else {
        console.log("no discussion created");
      }
    });
  }
}
