import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss']
})
export class QuestionComponent {
  @Input() title : String = 'Ist ein dictionary in Python mutable?';

  /* dummy content, TODO: create DTO*/
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
      commentCount: 5,
    }




}
