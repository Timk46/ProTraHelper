import { discussionDTO } from '@DTOs/discussion.dto';
import { discussionMessageDTO } from '@DTOs/discussionMessage.dto';
import { Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-discussion-page-question',
  templateUrl: './discussion-page-question.component.html',
  styleUrls: ['./discussion-page-question.component.scss', '../discussion-page.component.scss']
})
export class DiscussionPageQuestionComponent {

  @Input() conceptNodeName: string = 'dummy concept';

  @Input() messageData : discussionMessageDTO = {
    messageId: -1,
    discussionId: -1,
    authorId: -1,
    authorName: 'dummy',
    createdAt: new Date(),
    messageText: 'dummy',
    isSolution: false,
    isInitiator: false
  };

  @Input() discussionData : discussionDTO = {
    id: -1,
    initMessageId: -1,
    title: "dummy title",
    authorName: "dummy author",
    createdAt: new Date(),
    contentNodeName: "dummy content node",
    commentCount: 0,
    isSolved: false,
  };

  constructor(private sanitizer: DomSanitizer) { }

  /**
   * Sanitizes the content of the message, trusting its content because it was generated ty the tinymce editor
   * @param content
   * @returns the sanitized content
   */
  sanitizeContent(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

}
