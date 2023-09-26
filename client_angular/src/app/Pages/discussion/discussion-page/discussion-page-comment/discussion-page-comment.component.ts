import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-discussion-page-comment',
  templateUrl: './discussion-page-comment.component.html',
  styleUrls: ['./discussion-page-comment.component.scss', '../discussion-page.component.scss']
})
export class DiscussionPageCommentComponent {

  @Input() commentData = {
    date: '01.01.2020',
    username: 'maxmuster253',
    voteId: 1,
    text: 'dummytext',
  }

}
