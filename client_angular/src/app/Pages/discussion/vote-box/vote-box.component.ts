import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-vote-box',
  templateUrl: './vote-box.component.html',
  styleUrls: ['./vote-box.component.scss']
})
export class VoteBoxComponent {
  voteId: number = 1;
  @Input() votes : number = 0;
  userVoteStatus : number = 0; /* 0 = nicht gevotet, 1 = upvote, -1 = downvote */
  @Input() isSolution : boolean = true;

  onUpvote() {
    if (this.userVoteStatus != 1) {
      this.userVoteStatus = 1;
    } else {
      this.userVoteStatus = 0;
    }
  }

  onDownvote() {
    if (this.userVoteStatus != -1) {
      this.userVoteStatus = -1;
    } else {
      this.userVoteStatus = 0;
    }
  }

}
