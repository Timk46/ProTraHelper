import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-discussion-page-question',
  templateUrl: './discussion-page-question.component.html',
  styleUrls: ['./discussion-page-question.component.scss', '../discussion-page.component.scss']
})
export class DiscussionPageQuestionComponent {

  @Input() questionData =
  {
    id: -1,
    title: 'dummy question',
    date: '01.01.2020',
    userId: -1,
    username: 'maxmuster253',
    contentNode: -1,
    contentNodeName: 'dummy',
    votes: 0, /* Lieber mit voteId tauschen */
    solved: false,
    tags: ['dummy1', 'dummy2'],
    commentCount: 0,
    text: 'dummytext',
  }


}
