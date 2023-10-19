import { discussionsDTO, discussionDTO } from '@DTOs/discussion.dto';
import { Component, Input } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';
import { DiscussionPageComponent } from '../discussion-page/discussion-page.component';
import { discussionFilterDTO } from '@DTOs/discussionFilter.dto';


@Component({
  selector: 'app-discussion-list',
  templateUrl: './discussion-list.component.html',
  styleUrls: ['./discussion-list.component.scss', '../discussion.component.css']
})
export class DiscussionListComponent {

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
    if (filterData.conceptNodeId != -1 && filterData != this.filterData) {
      console.log('discussion-list: listDiscussions');
      this.filterData = filterData;
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
}
