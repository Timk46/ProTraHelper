import { discussionDTO } from '@DTOs/discussion.dto';
import { discussionMessageDTO } from '@DTOs/discussionMessage.dto';
import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-discussion-view-question',
  templateUrl: './discussion-view-question.component.html',
  styleUrls: ['./discussion-view-question.component.scss']
})
export class DiscussionViewQuestionComponent implements OnChanges{

  readableDate: string = 'dummy date';

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

  ngOnChanges() {
    if (this.discussionData.id != -1 && this.discussionData.createdAt != null && this.readableDate == 'dummy date'){
      this.readableDate = this.getDateDisplay(this.discussionData.createdAt);
    }
  }

  /**
   * Sanitizes the content of the message, trusting its content because it was generated ty the tinymce editor
   * @param content
   * @returns the sanitized content
   */
  sanitizeContent(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /**
   * Returns the date in a human readable format, e.g. "heute" or "1. 1. 2021"
   * @param date
   * @returns
   */
  getDateDisplay(date: Date): string {
    const today = new Date();
    const newDate = new Date(date);
    today.setHours(0, 0, 0, 0); // set time to 00:00:00.000
    if (newDate.setHours(0, 0, 0, 0) === today.getTime()) {
      return 'heute';
    } else {
      return `${newDate.getDate()}.${newDate.getMonth() + 1}.${newDate.getFullYear()}`;
    }
  }

}
