import { discussionDTO } from '@DTOs/discussion.dto';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss']
})
export class QuestionComponent {

  @Input() questionData : discussionDTO = {
    id: -1,
    initMessageId: -1,
    title: "dummy question",
    authorName: "dummy author",
    createdAt: new Date(),
    contentNodeName: "dummy content node",
    commentCount: 0,
    isSolved: false
  }

}
