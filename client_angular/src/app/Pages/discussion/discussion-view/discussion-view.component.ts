import { discussionMessageDTO, discussionDTO } from '@DTOs/index';
import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DiscussionViewService } from 'src/app/Services/discussion/discussion-view.service';
import { Subscription } from 'rxjs';
import { UserService } from 'src/app/Services/auth/user.service';
import { DiscussionCreationService } from 'src/app/Services/discussion/discussion-creation.service';
import { Title } from '@angular/platform-browser';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { NotificationService } from 'src/app/Services/notification/notification.service';

@Component({
  selector: 'app-discussion-view',
  templateUrl: './discussion-view.component.html',
  styleUrls: ['./discussion-view.component.scss']
})
export class DiscussionViewComponent {

  conceptNodeName: string = 'dummy concept';
  messagesData: discussionMessageDTO[] = [];
  subscriptions: Subscription[] = [];
  userId: number;
  displayedColumns: string[] = ['message'];
  sortingText: 'Hilfreich' | 'Datum' = 'Hilfreich';
  sortingDirection: 'asc' | 'desc' | '' = '';

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

  constructor(
    public sSS: ScreenSizeService,
    private route: ActivatedRoute,
    private discussionViewService: DiscussionViewService,
    private discussionCreationService: DiscussionCreationService,
    private userService: UserService,
    private title: Title,
    private notificationService: NotificationService,
    private router: Router
  ) {

    this.userId = parseInt(this.userService.getTokenID());
    const pSub = this.route.params.subscribe(params => {
      this.discussionId = parseInt(params['discussionId']);
      // get anonymous user id
      const auSub = this.discussionCreationService.getAnonymousUser(this.discussionId).subscribe(anonymousUser => {
        if (anonymousUser) {
          this.userId = anonymousUser.id;
        }
      });
      this.subscriptions.push(auSub);
      // get discussion data
      if (this.discussionId != -1) {
        const cnnSub = this.discussionViewService.getConceptNodeName(this.discussionId).subscribe(conceptNodeName => this.conceptNodeName = conceptNodeName.name);
        const dSub = this.discussionViewService.getDiscussion(this.discussionId).subscribe(discussion => {
          this.discussionData = discussion;
          this.refreshMessages();
        });
        this.subscriptions.push(cnnSub);
        this.subscriptions.push(dSub);
      }
    });
    this.subscriptions.push(pSub);
    // get messages
    const tsSub = this.discussionViewService.toggleStatus.subscribe(toggleStatus => {
      //console.log("got some toggle", toggleStatus);
      this.messagesData.forEach(message => {
        if (message.messageId != toggleStatus.messageId) {
          message.isSolution = false;
        } else {
          message.isSolution = toggleStatus.isSolution;
        }
      });
      this.initiatorMessage.isSolution = toggleStatus.isSolution;
      this.discussionData.isSolved = toggleStatus.isSolution;

    });
    this.subscriptions.push(tsSub);
  }

  /**
   * Looks for a message by its id and deletes it from the messages.
   * @returns the message
   */
  getAndSeparateMessage(messageId: number): discussionMessageDTO {
    return this.messagesData.splice(this.messagesData.findIndex(message => message.messageId == messageId), 1)[0];
  }

  /**
   * Refreshes the messages of the discussion.
   * @param discussionId the id of the discussion
   * @param messageId the id of the message to be separated from the messages (usually the initiating question message)
   */
  refreshMessages(discussionId: number = this.discussionId, messageId: number = this.discussionData.initMessageId) {
    const gmSub = this.discussionViewService.getMessages(discussionId).subscribe(messages => {
      this.messagesData = messages;
      this.initiatorMessage = this.getAndSeparateMessage(messageId);
      this.discussionData.commentCount = this.messagesData.length;
      this.onSort(this.sortingDirection);
    });
    this.subscriptions.push(gmSub);
  }

  /**
   * Sorts the messagesData array based on the provided sort direction.
   * @param event - The sort event object containing the sort direction.
   */
  onSort(event: any) {
    switch (event.direction) {
      case 'asc':
        this.sortingDirection = 'asc';
        this.sortingText = 'Datum';
        this.messagesData = [...this.messagesData.sort((a, b) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })];
        break;
      case 'desc':
        this.sortingDirection = 'desc';
        this.sortingText = 'Datum';
        this.messagesData = [...this.messagesData.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })];
        break;
      default:
        this.sortingDirection = '';
        this.sortingText = 'Hilfreich';
        this.messagesData = [...this.messagesData.sort((a, b) => {
          if (a.isSolution && !b.isSolution) {
            return -1;
          } else if (!a.isSolution && b.isSolution) {
            return 1;
          } else if ((a.voteCount !== undefined && b.voteCount !== undefined) && a.voteCount !== b.voteCount) {
            return b.voteCount - a.voteCount;
          } else {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        })];
        break;
    }
  }
  ngOnInit(): void {
    this.title.setTitle('GOALS: Diskutieren');
    this.notificationService.getNotifications().subscribe(notifications => {
      // handle notification if its a comment => this should make it pop up
      notifications.forEach(notification => {
        if(notification.type === 'comment') {
          this.notificationService.showNotification(
            notification.message,
            'Watch comment',
            `discussion-view/${notification.discussionId}`, // path to the discussion?
            () => {
              // or route here?
              this.router.navigate(['/discussion-view', notification.discussionId]);
              console.log("we navigated")
          });
        }
      })
    })
  }

  ngOnDestory() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
