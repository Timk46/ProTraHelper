import { discussionMessageDTO, discussionDTO } from '@DTOs/index';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DiscussionViewService } from 'src/app/Services/discussion/discussion-view.service';
import { UserService } from 'src/app/Services/auth/user.service';
import { DiscussionCreationService } from 'src/app/Services/discussion/discussion-creation.service';
import { Title } from '@angular/platform-browser';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { NotificationService } from 'src/app/Services/notification/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-discussion-view',
  templateUrl: './discussion-view.component.html',
  styleUrls: ['./discussion-view.component.scss']
})
export class DiscussionViewComponent implements OnInit, OnDestroy {
  conceptNodeName: string = 'dummy concept';
  messagesData: discussionMessageDTO[] = [];
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

  private destroy$ = new Subject<void>();
  @Input() discussionId: number = -1;

  constructor(
    public sSS: ScreenSizeService,
    private route: ActivatedRoute,
    private discussionViewService: DiscussionViewService,
    private discussionCreationService: DiscussionCreationService,
    private userService: UserService,
    private title: Title,
    private notificationService: NotificationService
  ) {
    this.userId = parseInt(this.userService.getTokenID());
  }

  ngOnInit(): void {
    this.title.setTitle('GOALS: Diskutieren');
    this.initializeSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initializes the subscriptions for the component.
   */
  private initializeSubscriptions() {
    this.handleRouteParams();
    this.handleToggleStatus();
    this.handleRefreshDiscussion();
    this.handleNotifications();
  }

  /**
   * Handles the route parameters and loads the discussion data.
   */
  private handleRouteParams() {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.discussionId = parseInt(params['discussionId']);
        this.loadAnonymousUser();
        this.loadDiscussionData();
      });
  }

  /**
   * Loads the anonymous user for the discussion.
   */
  private loadAnonymousUser() {
    this.discussionCreationService.getAnonymousUser(this.discussionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(anonymousUser => {
        if (anonymousUser) {
          this.userId = anonymousUser.id;
        }
      });
  }

  /**
   * Loads the discussion data and the messages of the discussion.
   */
  private loadDiscussionData() {
    if (this.discussionId != -1) {
      this.discussionViewService.getConceptNodeName(this.discussionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(conceptNodeName => this.conceptNodeName = conceptNodeName.name);

      this.discussionViewService.getDiscussion(this.discussionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(discussion => {
          this.discussionData = discussion;
          this.refreshMessages();
        });
    }
  }

  /**
   * Subscribes to the toggleStatus observable and updates the messagesData array accordingly.
   */
  private handleToggleStatus() {
    this.discussionViewService.toggleStatus
      .pipe(takeUntil(this.destroy$))
      .subscribe(toggleStatus => {
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
  }

  /**
   * Subscribes to the refreshDiscussion observable and refreshes the messagesData array.
   */
  private handleRefreshDiscussion() {
    this.notificationService.refreshDiscussion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshMessages();
      });
  }

  /**
   * Subscribes to the getNotifications observable and fetches the notifications.
   */
  private handleNotifications() {
    this.notificationService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
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
    this.discussionViewService.getMessages(discussionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messagesData = messages;
        this.initiatorMessage = this.getAndSeparateMessage(messageId);
        this.discussionData.commentCount = this.messagesData.length;
        this.onSort(this.sortingDirection);
      });
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
}
