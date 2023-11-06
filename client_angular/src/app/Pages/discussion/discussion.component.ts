import { Component, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { ContentDTO, ContentsForConceptDTO } from '@DTOs/content.dto';
import { discussionFilterDTO } from '@DTOs/discussionFilter.dto';
import { DiscussionListComponent } from './discussion-list/discussion-list.component';
import { DialogConfig } from '@angular/cdk/dialog';

import { MatDialog } from '@angular/material/dialog';
import { CreationDialogComponent } from './creation-dialog/creation-dialog.component';


@Component({
  selector: 'app-discussion',
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.css']
})
export class DiscussionComponent implements OnChanges {

  //used to pass the filter data to the discussion list, ! is used to tell typescript that the variable is initialized in the html
  @ViewChild(DiscussionListComponent) discussionList!: DiscussionListComponent;

  //used to pass available content 'cards' to the filter, but only 'trainedBy' is passed through
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  //dummy content, used to pass the active concept node to the filter
  @Input() activeConceptNodeId: number = -1;

  @Input() filterData: discussionFilterDTO = {
    conceptNodeId: -1,
    contentNodeId: -1,
    authorId: -1,
    onlySolved: false,
    searchString: ""
  }

  constructor(public dialog: MatDialog) {}

  /**
   * Lists the discussions for the active concept node if the active concept node has changed and the filter data is not set to the active concept node
   */
  ngOnChanges() {
    if (this.activeConceptNodeId != -1 && this.filterData.conceptNodeId != this.activeConceptNodeId) {
      console.log("changing filter data");
      this.filterData.conceptNodeId = this.activeConceptNodeId;
      this.discussionList.listDiscussions(this.filterData);
    }
  }

  /**
   * Tells the discussion list child to list the discussions with the given filter data
   * @param filterData
   */
  changeFilter(filterData: discussionFilterDTO) {
    //this.filterData = filterData;
    this.discussionList.listDiscussions(filterData);
  }

  /**
   * Opens a new tab asking the user to select a content node to create a discussion for
   */
  onCreateDiscussion() {
    const dialogRef = this.dialog.open(CreationDialogComponent, {
      width: '50%',
      data: this.contentsForActiveConceptNode.trainedBy
    });

    dialogRef.afterClosed().subscribe((result: ContentDTO) => {
      if (result) {
        // do something with the selected content node
        console.log("selected content node: " + result.contentNodeId);
        const url = `/discussion-creation/${this.activeConceptNodeId}/${result.contentNodeId}/-1`;
        window.open(url, "_blank");
      }
    });
  }

}
