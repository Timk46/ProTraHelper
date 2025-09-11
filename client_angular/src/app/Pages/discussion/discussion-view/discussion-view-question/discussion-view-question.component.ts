import { discussionDTO } from '@DTOs/index';
import { discussionMessageDTO } from '@DTOs/index';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';

//prism languages
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-markup'; // For HTML

@Component({
  selector: 'app-discussion-view-question',
  templateUrl: './discussion-view-question.component.html',
  styleUrls: ['./discussion-view-question.component.scss'],
})
export class DiscussionViewQuestionComponent implements OnChanges {
  readableDate: string = 'dummy date';
  sanitizedContent: SafeHtml = '';

  @Input() conceptNodeName: string = 'dummy concept';

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

  @Input() discussionData: discussionDTO = {
    id: -1,
    initMessageId: -1,
    title: 'dummy title',
    authorName: 'dummy author',
    createdAt: new Date(),
    contentNodeName: 'dummy content node',
    commentCount: 0,
    isSolved: false,
  };

  constructor(private readonly sanitizer: DomSanitizer) {}

  /*  ngOnChanges() {
    if (this.discussionData.id != -1 && this.discussionData.createdAt != null && this.readableDate == 'dummy date'){
      this.readableDate = this.getDateDisplay(this.discussionData.createdAt);
    }
  } */

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['discussionData'] &&
      changes['discussionData'].currentValue.id != -1 &&
      changes['discussionData'].currentValue.createdAt != null &&
      this.readableDate == 'dummy date'
    ) {
      this.readableDate = this.getDateDisplay(changes['discussionData'].currentValue.createdAt);
    }

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

  /* getLanguageFromContent(content: string): string | null{
    const match = content.match(/<pre class="language-(.*?)">/);
    if (match && Prism.languages[match[1]]) {
      return match[1];
    } else {
      return null;
    }
  } */
}
