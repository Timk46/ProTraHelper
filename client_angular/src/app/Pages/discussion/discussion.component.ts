import { Component, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { ContentDTO, ContentsForConceptDTO, discussionCreationDTO, discussionFilterDTO } from '@DTOs/index';
import { DiscussionListComponent } from './discussion-list/discussion-list.component';
import { MatDialog } from '@angular/material/dialog';
import { CreationDialogComponent } from './creation-dialog/creation-dialog.component';
import { DiscussionCreationDialogComponent } from './discussion-creation-dialog/discussion-creation-dialog.component';
import { DiscussionDialogService } from 'src/app/Services/discussion/discussion-dialog.service';


@Component({
  selector: 'app-discussion',
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.css']
})
export class DiscussionComponent implements OnChanges {

  userId: number = 1; //dummy user id, will be replaced by auth service

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

  constructor(public dialog: MatDialog, private discussionDialog: DiscussionDialogService) {}

  /**
   * Lists the discussions for the active concept node if the active concept node has changed and the filter data is not set to the active concept node
   */
  ngOnChanges() {
    if (this.activeConceptNodeId && this.activeConceptNodeId != -1 && this.filterData.conceptNodeId != this.activeConceptNodeId) {
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
   * Opens a new dialog asking the user to select a content node to create a discussion for
   */
  onCreateDiscussion() {
    this.discussionDialog.openContentSelection(this.activeConceptNodeId, this.contentsForActiveConceptNode.trainedBy, this.userId);
  }

}
