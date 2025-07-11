import type { discussionMessageDTO } from '@DTOs/index';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';

//prism languages
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-markup'; // For HTML

@Component({
  selector: 'app-discussion-view-message',
  templateUrl: './discussion-view-message.component.html',
  styleUrls: ['./discussion-view-message.component.scss'],
})
export class DiscussionViewMessageComponent implements OnChanges {
  readableDate: string = 'dummy date';
  sanitizedContent: SafeHtml = '';

  @Input() userIsAuthor: boolean = false;

  @Input() messageData: discussionMessageDTO = {
    messageId: -1,
    discussionId: -1,
    authorId: -1,
    authorName: 'dummy',
    createdAt: new Date(),
    messageText: 'dummy',
    isSolution: false,
    isInitiator: false,
  };

  constructor(private readonly sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['messageData']?.currentValue) {
      const messageData = changes['messageData'].currentValue;
      if (messageData.messageId != -1 && messageData.createdAt != null) {
        this.readableDate = this.getDateDisplay(messageData.createdAt);
        this.sanitizedContent = this.prepareContent(messageData.messageText);
      }
    }
  }

  /**
   * Prepares the content for display by highlighting code blocks and sanitizing the content
   * @param content
   * @returns SafeHtml
   */
  prepareContent(content: string): SafeHtml {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(content);
    tempDiv.querySelectorAll('code').forEach(codeElement => {
      Prism.highlightElement(codeElement);
    });
    return this.sanitizer.bypassSecurityTrustHtml(tempDiv.innerHTML);
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
