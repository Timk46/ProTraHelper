import { discussionMessageDTO } from '@DTOs/discussionMessage.dto';
import { discussionDTO } from '@DTOs/discussion.dto';
import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DiscussionViewService } from 'src/app/Services/discussion/discussion-view.service';

@Component({
  selector: 'app-discussion-view',
  templateUrl: './discussion-view.component.html',
  styleUrls: ['./discussion-view.component.scss']
})
export class DiscussionViewComponent {

  conceptNodeName: string = 'dummy concept';
  messagesData: discussionMessageDTO[] = [];

  discussionData: discussionDTO = {
    id: -1,
    initMessageId: -1,
    title: "dummy title",
    authorName: "dummy author",
    createdAt: new Date(),
    contentNodeName: "dummy content node",
    commentCount: 0,
    isSolved: false,
  }
  initiatorMessage: discussionMessageDTO = {
      messageId: -1,
      discussionId: -1,
      authorId: -1,
      authorName: 'dummy',
      createdAt: new Date(),
      messageText: 'dummy',
      isSolution: false,
      isInitiator: true
  };

  @Input() discussionId: number = -1;

  constructor(private route: ActivatedRoute, private discussionViewService: DiscussionViewService) {
    this.route.params.subscribe(params => {
      this.discussionId = parseInt(params['discussionId']);
      console.log(this.discussionId);
      if (this.discussionId != -1) {
        this.discussionViewService.getConceptNodeName(this.discussionId).subscribe(conceptNodeName => this.conceptNodeName = conceptNodeName.name);
        this.discussionViewService.getDiscussion(this.discussionId).subscribe(discussion => {
          this.discussionData = discussion;
          this.refreshMessages();
          /* this.discussionDataService.getMessages(this.discussionId).subscribe(messages => {
            this.messagesData = messages;
            this.initiatorMessage = this.getAndSeparateMessage(this.discussionData.initMessageId);
          }); */
        });
      }
    });

  }

  /**
   * Looks for a message by its id and deletes it from the messages.
   * @returns the message
   */
  getAndSeparateMessage(messageId: number) : discussionMessageDTO {
    return this.messagesData.splice(this.messagesData.findIndex(message => message.messageId == messageId), 1)[0];
  }

  /**
   * Refreshes the messages of the discussion.
   * @param discussionId the id of the discussion
   * @param messageId the id of the message to be separated from the messages (usually the initiating question message)
   */
  refreshMessages(discussionId: number = this.discussionId, messageId: number = this.discussionData.initMessageId) {
    this.discussionViewService.getMessages(discussionId).subscribe(messages => {
      this.messagesData = messages;
      this.initiatorMessage = this.getAndSeparateMessage(messageId);
      this.discussionData.commentCount = this.messagesData.length;
    });
  }

}
