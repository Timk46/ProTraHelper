import type { discussionFilterContentNodeDTO } from '@DTOs/index';
import { ContentDTO, discussionCreationDTO } from '@DTOs/index';
import { Injectable } from '@angular/core';
import type { MatDialog } from '@angular/material/dialog';
import { DiscussionCreationComponent } from 'src/app/Pages/discussion/discussion-creation/discussion-creation.component';
import { DiscussionPrecreationComponent } from 'src/app/Pages/discussion/discussion-creation/discussion-precreation/discussion-precreation.component';
import type { DiscussionListService } from './discussion-list.service';
import { Observable, firstValueFrom } from 'rxjs';
import type { ScreenSizeService } from '../mobile/screen-size.service';

@Injectable({
  providedIn: 'root',
})
export class DiscussionDialogService {
  constructor(
    public sSS: ScreenSizeService,
    private readonly dialog: MatDialog,
    private readonly listService: DiscussionListService,
  ) {}

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
        const landsub = this.sSS.isLandscape.subscribe(isLandscape => {
          const dialogRef = this.dialog.open(DiscussionPrecreationComponent, {
            width: isLandscape ? '40vw' : '80%',
            data: contentNodes,
          });

          dialogRef.afterClosed().subscribe((result: discussionFilterContentNodeDTO) => {
            if (result) {
              //console.log("created discussion id: ");
              //console.log(result);
              this.openDiscussionCreation(conceptNode, result.id, -1).then((result: number) => {
                resolve(result);
              });
            } else {
              reject('No result'); // Reject the promise with an error message
            }
          });
        });
        landsub.unsubscribe();
      });
    });
  }

  /**
   * Opens the discussion creation dialog. Here the user can create a discussion for the given concept and content node
   * @param discussionData
   */
  async openDiscussionCreation(
    conceptNodeId: number,
    contentNodeId: number,
    contentElementId: number,
  ): Promise<number> {
    const isLandscape = await firstValueFrom(this.sSS.isLandscape);
    return new Promise<number>((resolve, reject) => {
      const dialogRef = this.dialog.open(DiscussionCreationComponent, {
        width: isLandscape ? '50vw' : '80%',
        panelClass: 'discussionDialog',
        data: {
          id: -1,
          title: '',
          conceptNodeId: conceptNodeId,
          contentNodeId: contentNodeId,
          contentElementId: contentElementId,
          authorId: -1,
          isSolved: false,
        },
      });

      dialogRef.afterClosed().subscribe((result: number) => {
        if (result && result != -1) {
          //console.log("created discussion id: " + result);
          const url = `/discussion-view/${result}`;
          window.open(url, '_blank');
          resolve(result);
        } else {
          //console.log("no discussion created");
          reject('No discussion created');
        }
      });
    });
  }
}
