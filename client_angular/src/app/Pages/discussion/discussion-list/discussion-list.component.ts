import { discussionsDTO, discussionDTO } from '@DTOs/discussion.dto';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';
import { DiscussionPageComponent } from '../discussion-page/discussion-page.component';
import { discussionFilterDTO } from '@DTOs/discussionFilter.dto';
import { DiscussionCreationComponent } from '../discussion-creation/discussion-creation.component';


@Component({
  selector: 'app-discussion-list',
  templateUrl: './discussion-list.component.html',
  styleUrls: ['./discussion-list.component.scss', '../discussion.component.css']
})
export class DiscussionListComponent {

  @Output() createDiscussion = new EventEmitter();

  visibleDiscussions: discussionsDTO = {
    discussions: [] as discussionDTO[],
  };

  filterData: discussionFilterDTO = {
    conceptNodeId: -1,
    contentNodeId: -1,
    authorId: -1,
    onlySolved: false,
    searchString: ""
  }

  constructor(private discussionDataService: DiscussionDataService, public dialog : MatDialog) { }

  /**
   * Renews the list of discussions with the given filter data
   * @param filterData
   */
  listDiscussions(filterData: discussionFilterDTO) {
    console.log("do i want to list? Different?: " + this.isDifferent(filterData) + " conceptNodeId: " + filterData.conceptNodeId)
    if (filterData.conceptNodeId != -1 && this.isDifferent(filterData)) {
      console.log('discussion-list: listDiscussions');
      this.filterData = {...filterData}; //prevents mutation
      this.discussionDataService.getDiscussions(filterData).subscribe(discussions => this.visibleDiscussions = discussions);
    }
  }

  /**
   * Opens a new tab with the discussion page for the given discussion id
   * @param discussionId
   */
  onQuestionClick(discussionId: number) {
    const url = '/discussion-page/' + discussionId;
    window.open(url, "_blank");
  }

  /**
   * Emits the createDiscussion event
   */
  onNewDiscussion(){
    this.createDiscussion.emit();
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
