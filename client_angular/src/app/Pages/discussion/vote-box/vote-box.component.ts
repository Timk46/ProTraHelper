import { Component, Input } from '@angular/core';
import { discussionMessageVoteCreationDTO, discussionMessageVoteDTO } from '@DTOs/index';
import { CreationService } from 'src/app/Services/discussion/creation.service';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';

@Component({
  selector: 'app-vote-box',
  templateUrl: './vote-box.component.html',
  styleUrls: ['./vote-box.component.scss']
})
export class VoteBoxComponent {
  @Input() messageId: number = -1; // to be changed on init
  @Input() isSolution : boolean = false;
  @Input() userId: number = 1; //HAS TO BE CHANGED

  userVoteStatus : number = 0; /* 0 = nicht gevotet, 1 = upvote, -1 = downvote */

  timeoutID : any;

  voteData: discussionMessageVoteDTO = {
    messageId: -1,
    votes: 0,
    userVoteStatus: 0
  }

  constructor(private discussionDataService: DiscussionDataService, private creationService: CreationService) { }

  /* find the anonymous user by userId and get the vote data for the message */
  ngOnInit(): void {
    this.discussionDataService.getVoteData(this.messageId, this.userId).subscribe(voteData => this.voteData = voteData);
  }

  /* if the upvote button is clicked*/
  onUpvote() {
    if (this.voteData.userVoteStatus != 1) {
      this.voteData.userVoteStatus = 1;
    } else {
      this.voteData.userVoteStatus = 0;
    }
    this.resetTimerSetStatus();
  }

  /* if the downvote button is clicked */
  onDownvote() {
    if (this.voteData.userVoteStatus != -1) {
      this.voteData.userVoteStatus = -1;
    } else {
      this.voteData.userVoteStatus = 0;
    }
    this.resetTimerSetStatus();
  }

  /**
   * Sets the vote status after a timeout of 1 second
   * This is done to prevent too many requests to the server
   * If the timeout is reached, the vote status is set
   */
  resetTimerSetStatus() {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
    }
    this.timeoutID = setTimeout(() => {
      console.log("setting vote status");
      const voteCreationData: discussionMessageVoteCreationDTO = {
        messageId: this.messageId,
        userId: this.userId,
        voteStatus: this.voteData.userVoteStatus
      }
      this.creationService.createOrModifyVote(voteCreationData).subscribe(voteData => console.log(voteData));
    }, 1000);
  }

}
