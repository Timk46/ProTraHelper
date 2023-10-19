import { discussionMessageDTO, discussionMessagesDTO } from '@DTOs/discussionMessage.dto';
import { discussionDTO } from '@DTOs/discussion.dto';
import { Component, Inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DiscussionDataService } from 'src/app/Services/discussion/discussion-data.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-discussion-page',
  templateUrl: './discussion-page.component.html',
  styleUrls: ['./discussion-page.component.scss', '../discussion.component.css']
})
export class DiscussionPageComponent{

  @Input() discussionId: number = -1;

  // should be replaced by the data from the backend
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

  conceptNodeName: string = 'dummy concept';

  messagesData: discussionMessagesDTO = {
    messages: []
  };

  initiatorMessage: discussionMessageDTO = {
    messageId: -1,
    discussionId: -1,
    authorId: -1,
    authorName: 'dummy',
    createdAt: new Date(),
    messageText: 'dummy',
    isSolution: false,
    isInitiator: true
  }

  constructor(private route: ActivatedRoute, private discussionDataService: DiscussionDataService) { }

  /**
   * Gets the discussion id from the url and loads the discussion data.
   * Even the initiating discussion question is stored in the messages table, so it is mandatory to separate it from the messages.
   */
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.discussionId = parseInt(params['discussionId']);
      if (this.discussionId != -1) {
        this.discussionDataService.getConceptNodeName(this.discussionId).subscribe(conceptNodeName => this.conceptNodeName = conceptNodeName.name);
        this.discussionDataService.getDiscussion(this.discussionId).subscribe(discussion => {
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
    return this.messagesData['messages'].splice(this.messagesData['messages'].findIndex(message => message.messageId == messageId), 1)[0];
  }

  /**
   * Refreshes the messages of the discussion.
   * @param discussionId the id of the discussion
   * @param messageId the id of the message to be separated from the messages (usually the initiating question message)
   */
  refreshMessages(discussionId: number = this.discussionId, messageId: number = this.discussionData.initMessageId) {
    this.discussionDataService.getMessages(discussionId).subscribe(messages => {
      this.messagesData = messages;
      this.initiatorMessage = this.getAndSeparateMessage(messageId);
    });
  }

}
