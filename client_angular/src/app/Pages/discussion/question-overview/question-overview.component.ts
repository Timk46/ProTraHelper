import { discussionsDTO, discussionDTO } from '@DTOs/discussion.dto';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';
import { DiscussionPageComponent } from '../discussion-page/discussion-page.component';


@Component({
  selector: 'app-question-overview',
  templateUrl: './question-overview.component.html',
  styleUrls: ['./question-overview.component.scss', '../discussion.component.css']
})
export class QuestionOverviewComponent implements OnChanges {

  @Input() activeConceptNodeId: number = -1;

  visibleDiscussions: discussionsDTO = {
    discussions: [] as discussionDTO[],
  };

  constructor(private discussionDataService: DiscussionDataService, public dialog : MatDialog) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeConceptNodeId'] && this['activeConceptNodeId'] != -1) {
      this.discussionDataService.getDiscussions(this['activeConceptNodeId'], -1, false, -1, JSON.stringify( {"content" : "" } )).subscribe(discussions => this.visibleDiscussions = discussions);
    }
  }

  onQuestionClick(discussionId: number) {
    const url = '/discussion-page/' + discussionId;
    window.open(url, "_blank");
  }



  // In case we want to open the discussion page in a dialog
/*   onQuestionClick(inputDiscussion: discussionDTO) {
    // Create Dialog Config https://material.angular.io/components/dialog/api#MatDialogConfig
    const dialogConfig = new MatDialogConfig();

    // Communicate ContentDTO with all ContentElements of that ContentView to the Dialog/ContentViewComponent
    dialogConfig.data = {
      discussionData: inputDiscussion as discussionDTO
    };

    // Open the Dialog with ContentViewComponent. We could navigate to the component instead aswell.
    this.dialog.open(DiscussionPageComponent, dialogConfig);
  } */
}
