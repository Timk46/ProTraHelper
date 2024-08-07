import { Component, ElementRef, HostListener, OnInit, QueryList, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { NotificationService } from 'src/app/Services/notification/notification.service';
import { NotificationDTO } from '@DTOs/notification.dto';
import { MatExpansionPanel } from '@angular/material/expansion';
import { NotificationType } from '@DTOs/notificationType.enum';
import { Observable, Subject, Subscription, takeUntil } from 'rxjs';

/**
 * Component that displays a notification bell icon and manages the display of notifications.
 * It handles loading, displaying, and interacting with notifications.
 */
@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit {
  /** Array to store all notifications */
  allNotifications: NotificationDTO[] = [];

  /** Observable for the count of unread notifications */
  unreadCount$: Observable<number>;

  /** Boolean to control the visibility of notifications panel */
  showNotifications: boolean = false;

  /** Number of notifications to load at a time with init value 10 */
  limit: number = 10;

  /** Offset for pagination of notifications */
  offset: number = 0;

  /** Subscription to handle closing of notification panel */
  private closeNotificationSubscription?: Subscription;

  /** QueryList of MatExpansionPanel elements in the template */
  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>

  /** Reference to the notification bell element in the template */
  @ViewChild('notificationBell') notificationBellRef!: ElementRef

  /** Subject to handle unsubscription from observables */
  private unsubscribe$ = new Subject<void>();

  /**
   * Creates an instance of NotificationBellComponent.
   * @param {NotificationService} notificationService - Service to handle notification-related operations
   * @param {Renderer2} renderer - Renderer2 for DOM manipulation
   */
  constructor(
    private notificationService: NotificationService,
    private renderer: Renderer2,
  ){
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   * It sets up subscriptions and event listeners.
   */
  ngOnInit(): void {
    this.loadUnreadCount();
    this.notificationService.getNotifications().pipe(takeUntil(this.unsubscribe$)).subscribe(notifications => {
      this.allNotifications = notifications;
    });
    this.notificationService.closeNotificationPanel$.pipe(takeUntil(this.unsubscribe$)).subscribe(shouldClose => {
      if (shouldClose) {
        this.showNotifications = false;
      }
    });
    this.renderer.listen('document', 'click', this.handleOutsideClick.bind(this));
  }

  /**
   * Lifecycle hook that is called when a directive, pipe, or service is destroyed.
   * It completes the unsubscribe Subject to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  /**
   * Handles clicks outside the notification bell to close the notification panel.
   * @param {MouseEvent} event - The mouse event
   */
  handleOutsideClick(event: MouseEvent): void {
    const clickedInside = this.notificationBellRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.showNotifications = false;
    }
  }

  /**
   * Loads the count of unread notifications from the server.
   */
  loadUnreadCount(): void {
    this.notificationService.getUnreadCountFromServer().pipe(takeUntil(this.unsubscribe$)).subscribe();
  }

  /**
   * Loads more notifications based on the current offset and limit.
   */
  loadMoreNotifications(): void {
    this.offset += this.limit;
    this.notificationService.fetchMoreNotifications(this.limit, this.offset).pipe(takeUntil(this.unsubscribe$)).subscribe(notifications => {
      this.allNotifications = [...this.allNotifications, ...notifications];
    });
  }

  /**
   * Handles scroll events on the notification panel for infinite scrolling.
   * @param {any} event - The scroll event
   */
  @HostListener('scroll', ['$event'])
  onScroll(event: any): void {
    const element = event.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMoreNotifications();
    }
  }

  /**
   * Handles click events on notifications.
   * @param {NotificationDTO} notification - The clicked notification
   * @param {MatExpansionPanel} panel - The expansion panel associated with the notification
   * @param {string} action - The action to perform ('view' or 'mark as read')
   */
  onClick(notification: NotificationDTO, panel: MatExpansionPanel, action: string) {
    this.notificationService.handleNotificationClick(notification, action).pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      panel.close();
    });
  }

  /**
   * Toggles the visibility of the notifications panel.
   */
  toggleNotifications() {
    if(this.allNotifications.length > 0) {
      this.showNotifications = !this.showNotifications;
    }
  }

  /**
   * Gets the display title for a notification based on its type.
   * @param {string} type - The type of the notification
   * @returns {string} The display title for the notification
   */
  getNotificationTitle(type: string): string {
    switch (type) {
      case NotificationType.COMMENT:
        return 'Kommentar';
      case NotificationType.SOLUTION:
        return 'Lösung';
      default:
        return type;
    }
  }

  /**
   * Formats a timestamp to a readable date string.
   * @param {Date | undefined} timestamp - The timestamp to format
   * @returns {string} A formatted date string
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
   * Formats a timestamp to a readable date string for the title.
   * @param {Date | undefined} timestamp - The timestamp to format
   * @returns {string} A formatted date string for the title
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
