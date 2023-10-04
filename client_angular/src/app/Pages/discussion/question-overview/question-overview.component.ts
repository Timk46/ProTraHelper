import { discussionsDTO } from '@DTOs/discussion.dto';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';

@Component({
  selector: 'app-question-overview',
  templateUrl: './question-overview.component.html',
  styleUrls: ['./question-overview.component.scss', '../discussion.component.css']
})
export class QuestionOverviewComponent implements OnChanges {

  @Input() activeConceptNodeId: number = -1;

  visibleDiscussions: discussionsDTO = {
    discussions: [],
  };

  constructor(private discussionDataService: DiscussionDataService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeConceptNodeId'] && this['activeConceptNodeId'] != -1) {
      this.discussionDataService.getDiscussions(this['activeConceptNodeId'], -1, false, -1, JSON.stringify( {"content" : "" } )).subscribe(discussions => this.visibleDiscussions = discussions);
    }
  }
}
