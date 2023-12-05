import { discussionMessageDTO } from '@DTOs/index';
import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UserService } from 'src/app/Services/auth/user.service';

@Component({
  selector: 'app-discussion-view-message',
  templateUrl: './discussion-view-message.component.html',
  styleUrls: ['./discussion-view-message.component.scss']
})
export class DiscussionViewMessageComponent implements OnChanges {

  readableDate: string = 'dummy date';

  @Input() userIsAuthor: boolean = false;

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

  ngOnChanges() {
    if (this.messageData.messageId != -1 && this.messageData.createdAt != null && this.readableDate == 'dummy date'){
      this.readableDate = this.getDateDisplay(this.messageData.createdAt);
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
    console.log("getDateDisplay called");
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
