import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContentDTO, ContentElementDTO, contentElementType, ContentsForConceptDTO } from '@DTOs/index';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { ContentElement } from '@DTOs/prisma.dto';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { ProgressService } from 'src/app/Services/progress/progress.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ContentViewComponent } from '../contentView/contentView.component';

@Component({
  selector: 'app-content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.scss'],
  animations: [
    trigger('contentExpand', [
      state('collapsed', style({
        height: '0',
        opacity: 0,
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: 1
      })),
      transition('collapsed <=> expanded', animate('200ms ease-out'))
    ])
  ]
})
export class ContentListComponent {

  @Input() activeConceptNodeId: any;
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  expandedIndex = 0;
  panelOpenState = false;

  // emitter for refreshing
  @Output() fetchContentsForConcept = new EventEmitter<void>();

  constructor(
    private dialog: MatDialog,
    private sSS: ScreenSizeService,
    private progressService: ProgressService
  ) { }

  /**
   * Generates an array with a specified number of elements.
   *
   * @param num - The number of elements in the array.
   * @returns An array with the specified number of elements.
   */
  getLevels(num: number) {
    return new Array(num);
  }


  /**
   * Checks if the given content has at least one content element of the specified type.
   *
   * @param content - The content object to check.
   * @param type - The type of content element to look for.
   * @returns `true` if the content has at least one element of the specified type, otherwise `false`.
   */
  hasContentElementType(content: ContentDTO, type: string): boolean {
    return content.contentElements.some((element) => element.type === type);
  }

  /**
   * Filters and returns the content elements of type QUESTION from the given content.
   *
   * @param {ContentDTO} content - The content object containing content elements.
   * @returns {ContentElement[]} An array of content elements that are of type QUESTION.
   */
  getQuestions(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements.filter((element) => element.type === contentElementType.QUESTION);
  }

  /**
   * Retrieves the attachments from the given content.
   * Filters the content elements to include only those of type PDF or VIDEO.
   *
   * @param content - The content object containing content elements.
   * @returns An array of content elements that are either of type PDF or VIDEO.
   */
  getAttachments(content: ContentDTO): ContentElementDTO[] {
    return content.contentElements.filter((element) => element.type === contentElementType.PDF || element.type === contentElementType.VIDEO);
  }

  /**
   * Handles the click event on a content item.
   *
   * @param content - The content data transfer object (DTO) representing the clicked content.
   * @param type - An array of strings representing the type of the content.
   * @param event - The mouse event triggered by the click.
   *
   * This method stops the propagation of the click event, configures and opens a dialog to display the content,
   * and updates the progress if the content type is not "VIDEO" or "PDF". If the content is fully completed (100% progress),
   * it triggers a graph update.
   */
  async onContentClick(content: ContentDTO, type: string[], event: MouseEvent) {
    event.stopPropagation();
    const dialogConfig = new MatDialogConfig();
    const isLandscape = await firstValueFrom(this.sSS.isLandscape);

    // Set dialog dimensions based on screen orientation
    dialogConfig.width = isLandscape ? '70vw' : '90%';
    dialogConfig.maxHeight = isLandscape ? '95vh' : '80vh';

    // Set dialog data
    dialogConfig.data = {
      contentViewData: content,
      conceptNodeId: this.activeConceptNodeId,
      contentTypes: type,
    };

    // Open the dialog
    const dialogRef = this.dialog.open(ContentViewComponent, dialogConfig);

    // Handle dialog close event
    // We use this to update the data source and refresh graph is progress is 100%
    if (type[0] != "VIDEO" && type[0] != "PDF") { // Dont update progress for video and pdf
      dialogRef.afterClosed().subscribe(() => {
        // Find the updated content in contentsForActiveConceptNode
        const updatedContent = this.contentsForActiveConceptNode.trainedBy.find(
          c => c.contentNodeId === content.contentNodeId
        );

        // If the content is fully completed (100% progress), trigger a graph update
        if (updatedContent && updatedContent.progress > 99) {
          this.progressService.answerSubmitted();
        }
      });
    }
  }

  onScoreUpdated(elementData: ContentElementDTO) {
    console.log("Score updated:", elementData.question?.progress);
  }


}
