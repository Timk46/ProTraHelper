import { ContentDTO, discussionCreationDTO, discussionFilterContentNodeDTO } from '@DTOs/index';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DiscussionCreationComponent } from 'src/app/Pages/discussion/discussion-creation/discussion-creation.component';
import { DiscussionPrecreationComponent } from 'src/app/Pages/discussion/discussion-creation/discussion-precreation/discussion-precreation.component';
import { DiscussionListService } from './discussion-list.service';
import { Observable } from 'rxjs';

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
  async openContentSelection(conceptNode: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.listService.getFilterContentNodes(conceptNode).subscribe(contentNodes => {
        const dialogRef = this.dialog.open(DiscussionPrecreationComponent, {
          width: '40%',
          data: contentNodes
        });

        dialogRef.afterClosed().subscribe((result: discussionFilterContentNodeDTO) => {
          if (result) {
            //console.log("created discussion id: ");
            //console.log(result);
            this.openDiscussionCreation(conceptNode, result.id, -1).then((result: number) => {
              resolve(result);
            });
          } else {
            reject("No result"); // Reject the promise with an error message
          }
        });
      });
    });
  }

  /**
   * Opens the discussion creation dialog. Here the user can create a discussion for the given concept and content node
   * @param discussionData
   */
  async openDiscussionCreation(conceptNodeId: number, contentNodeId: number, contentElementId: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const dialogRef = this.dialog.open(DiscussionCreationComponent, {
        width: '50%',
        panelClass: 'discussionDialog',
        data: {
          id: -1,
          title: "",
          conceptNodeId: conceptNodeId,
          contentNodeId: contentNodeId,
          contentElementId: contentElementId,
          authorId: -1,
          isSolved: false
        }
      });

      dialogRef.afterClosed().subscribe((result: number) => {
        if (result && result != -1) {
          //console.log("created discussion id: " + result);
          const url = `/discussion-view/${result}`;
          window.open(url, "_blank");
          resolve(result);
        } else {
          //console.log("no discussion created");
          reject("No discussion created");
        }
      });
    });
  }
}
