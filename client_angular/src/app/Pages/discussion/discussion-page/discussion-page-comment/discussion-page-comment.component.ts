import { discussionMessageDTO } from '@DTOs/discussionMessage.dto';
import { Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-discussion-page-comment',
  templateUrl: './discussion-page-comment.component.html',
  styleUrls: ['./discussion-page-comment.component.scss', '../discussion-page.component.scss']
})
export class DiscussionPageCommentComponent {

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
