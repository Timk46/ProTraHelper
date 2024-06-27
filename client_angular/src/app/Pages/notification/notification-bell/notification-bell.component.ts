import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { NotificationService } from 'src/app/Services/notification/notification.service';
import { NotificationDTO } from '@DTOs/notification.dto';
import { MatExpansionPanel } from '@angular/material/expansion';
import { NotificationType } from '@DTOs/notificationType.enum';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit {
  allNotifications: NotificationDTO[] = [];
  unreadCount$: Observable<number>;
  showNotifications: boolean = false;
  limit: number = 10;
  offset: number = 0;
  private closeNotificationSubscription?: Subscription;
  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>
  @ViewChild('notificationBell') notificationBellRef!: ElementRef

  constructor(
    private notificationService: NotificationService
  ){
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  ngOnInit(): void {
    this.loadUnreadCount();
    this.notificationService.getNotifications().subscribe(notifications => {
      this.allNotifications = notifications
    });
    this.closeNotificationSubscription = this.notificationService.closeNotificationPanel$.subscribe(shouldClose => {
      if (shouldClose) {
        this.showNotifications = false;
      }
    });
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    if (this.closeNotificationSubscription) {
      this.closeNotificationSubscription.unsubscribe();
    }
  }

  /**
   * Handle clicks outside the notification bell to close it
   */
  handleOutsideClick(event: MouseEvent): void {
    const clickedInside = this.notificationBellRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.showNotifications = false;
    }
  }


  /**
   * Load the unread count of notifications
   */
  loadUnreadCount(): void {
    this.notificationService.getUnreadCountFromServer().subscribe()
  }

  /**
   * Load more notifications based on previous offset and limit
   */
  loadMoreNotifications(): void {
    this.offset += this.limit;
    this.notificationService.fetchMoreNotifications(this.limit, this.offset);
  }

  /**
   * Listen for scroll events on the notification bell to paginate the notifications
   */
  @HostListener('scroll', ['$event'])
  onScroll(event: any): void {
    const element = event.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMoreNotifications();
    }
  }

  /**
   * Handle the click event on a notification
   * @param {NotificationDTO} notification
   */
  onClick(notification: NotificationDTO, panel: MatExpansionPanel, action: string) {
    this.notificationService.handleNotificationClick(notification, action).subscribe(() => {
      panel.close()
    });
  }

  /**
   * Mark all notifications as read
   */
  toggleNotifications() {
    if(this.allNotifications.length > 0) {
      this.showNotifications = !this.showNotifications;
    }
  }

  /**
   * Get the display title for a notification type
   * @param {string} type
   * @returns {string} The title of the notification
   */
  getNotificationTitle(type: string): string {
    switch (type) {
      case NotificationType.COMMENT:
        return 'Kommentar';

      case NotificationType.SOLUTION:
        return 'Lösung';

      // Add more cases for other notification types if needed
      default:
        return type;
    }
  }

  /**
   * Format a timestamp to a readable date
   * @param {string} timestamp
   * @returns {string} The formatted date
   */
  formatTimeStamp(timestamp: Date | undefined): string {
    if(!timestamp) {
      return 'Unknown Time';
    }
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format a timestamp to a readable date for the title
   * @param {string} timestamp
   * @returns {string} The formatted date
   */
  formatTimeStampTitle(timestamp: Date | undefined): string {
    if(!timestamp) {
      return 'Unknown Time';
    }
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
}
