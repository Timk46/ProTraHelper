import { Component, Input } from '@angular/core';
import { discussionMessageVoteDTO } from '@DTOs/discussionMessageVote.dto';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';

@Component({
  selector: 'app-vote-box',
  templateUrl: './vote-box.component.html',
  styleUrls: ['./vote-box.component.scss']
})
export class VoteBoxComponent {
  @Input() messageId: number = -1; // to be changed on init
  @Input() isSolution : boolean = false;

  userVoteStatus : number = 0; /* 0 = nicht gevotet, 1 = upvote, -1 = downvote */

  voteData: discussionMessageVoteDTO = {
    messageId: -1,
    votes: 0,
  }

  constructor(private discussionDataService: DiscussionDataService) { }

  /* get the vote data for the message */
  ngOnInit(): void {
    this.discussionDataService.getVoteData(this.messageId).subscribe(voteData => this.voteData = voteData);
  }

  /* if the upvote button is clicked*/
  onUpvote() {
    if (this.userVoteStatus != 1) {
      this.userVoteStatus = 1;
    } else {
      this.userVoteStatus = 0;
    }
  }

  /* if the downvote button is clicked */
  onDownvote() {
    if (this.userVoteStatus != -1) {
      this.userVoteStatus = -1;
    } else {
      this.userVoteStatus = 0;
    }
  }

}
