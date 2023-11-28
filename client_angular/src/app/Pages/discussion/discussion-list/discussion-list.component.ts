import { discussionDTO } from '@DTOs/discussion.dto';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { discussionFilterDTO } from '@DTOs/discussionFilter.dto';
import { DiscussionListService } from 'src/app/Services/discussion/discussion-list.service';
import { DiscussionDialogService } from 'src/app/Services/discussion/discussion-dialog.service';

@Component({
  selector: 'app-discussion-list',
  templateUrl: './discussion-list.component.html',
  styleUrls: ['./discussion-list.component.scss']
})
export class DiscussionListComponent implements OnChanges {

  @Input() activeConceptNodeId: number = -1;
  @Output() createDiscussion = new EventEmitter();

  visibleDiscussions: discussionDTO[] = [];

  filterData: discussionFilterDTO = {
    conceptNodeId: -1,
    contentNodeId: -1,
    authorId: -1,
    onlySolved: false,
    searchString: ""
  }

  constructor(private discussionListService: DiscussionListService, public dialog : MatDialog, private discussionDialogService: DiscussionDialogService) { }

  //mache listDiscussions, wenn activeConceptNodeId sich ändert
  ngOnChanges() {
    if (this.activeConceptNodeId > 0) {
      this.listDiscussions(
        {
          conceptNodeId: this.activeConceptNodeId,
          contentNodeId: -1,
          authorId: -1,
          onlySolved: false,
          searchString: ""
        }
      )
    }
  }

  /**
   * Renews the list of discussions with the given filter data
   * @param filterData
   */
  listDiscussions(filterData: discussionFilterDTO, force: boolean = false) {
    //console.log("do i want to list? Different?: " + this.isDifferent(filterData) + " conceptNodeId: " + filterData.conceptNodeId)
    if ( (filterData.conceptNodeId >0 && this.isDifferent(filterData)) || force) {
      this.filterData = {...filterData}; //prevents mutation
      this.discussionListService.getDiscussions(filterData).subscribe(discussions => {
        this.visibleDiscussions = discussions;
      });
    }
  }

  /**
   * Opens a new tab with the discussion page for the given discussion id
   * @param discussionId
   */
  onQuestionClick(discussionId: number) {
    const url = '/discussion-view/' + discussionId;
    window.open(url, "_blank");
  }

  /**
   * Emits the createDiscussion event
   */
  onNewDiscussion(){
    this.discussionDialogService.openContentSelection(this.activeConceptNodeId).then((result: number) => {
      console.log("Want to refresh? result: " + result);
      if (!isNaN(result)) {
        this.listDiscussions(this.filterData, true);
      }
    });
  }

  /**
   * Checks if the given filter data is different from the current filter data
   * @param filterData
   * @returns true if the given filter data is different from the current filter data
   */
  isDifferent(filterData: discussionFilterDTO): boolean {
    console.log("checking differences...");
    return filterData.conceptNodeId != this.filterData.conceptNodeId ||
    filterData.contentNodeId != this.filterData.contentNodeId ||
    filterData.authorId != this.filterData.authorId ||
    filterData.onlySolved != this.filterData.onlySolved ||
    filterData.searchString != this.filterData.searchString;
  }
}
