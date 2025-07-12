import { Component, ViewChild, ViewChildren, ElementRef, OnInit, QueryList, OnDestroy } from '@angular/core';
import { NotificationService } from 'src/app/Services/notification/notification.service';
import type { NotificationDTO } from '@DTOs/notification.dto';
import { MatExpansionPanel } from '@angular/material/expansion';
import { NotificationType } from '@DTOs/notificationType.enum';
import { Observable } from 'rxjs';
import { Subject, merge } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

/**
 * NotificationBellComponent is responsible for displaying and managing notifications.
 * It provides a notification bell icon that shows the number of unread notifications
 * and a panel that displays all notifications when clicked.
 */
@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  /** Stores all notifications */
  allNotifications: NotificationDTO[] = [];

  /** Observable for the count of unread notifications */
  unreadCount$: Observable<number>;

  /** Controls the visibility of the notifications panel */
  showNotifications = false;

  /** Initial number of notifications to load */
  readonly INITIAL_LIMIT = 10;

  /** Number of additional notifications to load when scrolling */
  readonly LOAD_MORE_LIMIT = 10;

  /** Offset for pagination when loading more notifications */
  private offset = 0;

  /** Subject used for unsubscribing from observables */
  private readonly unsubscribe$ = new Subject<void>();

  /** Titles for different types of notifications */
  private readonly notificationTitles: Record<NotificationType, string> = {
    [NotificationType.COMMENT]: 'Kommentar',
    [NotificationType.SOLUTION]: 'Lösung',
    [NotificationType.INFO]: 'Information',
  } as const;

  /** Formatter for displaying timestamps with date and time */
  private readonly dateFormatter = new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  /** Formatter for displaying timestamps with date only */
  private readonly dateOnlyFormatter = new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  /** Reference to all MatExpansionPanel elements in the template */
  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>;

  /** Reference to the notification bell element in the template */
  @ViewChild('notificationBell', { static: true }) notificationBellRef!: ElementRef;

  /**
   * Creates an instance of NotificationBellComponent.
   * @param {NotificationService} notificationService Service for handling notification-related operations
   */
  constructor(private readonly notificationService: NotificationService) {
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  /**
   * Initializes the component, sets up listeners, and loads initial notifications.
   */
  ngOnInit(): void {
    this.initializeNotifications();
    this.setupCloseNotificationListener();
    this.setupOutsideClickListener();
  }

  /**
   * Cleans up subscriptions when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  /**
   * Initializes notifications by fetching initial data and setting up streams.
   */
  private initializeNotifications(): void {
    const initialNotifications$ = this.notificationService.fetchMoreNotifications(
      this.INITIAL_LIMIT,
      0,
    );
    const updatedNotifications$ = this.notificationService.getNotifications();

    merge(initialNotifications$, updatedNotifications$)
      .pipe(
        takeUntil(this.unsubscribe$),
        map(notifications =>
          notifications.map(notification => ({
            ...notification,
            formattedTimestamp: this.safeFormatTimeStamp(notification.timestamp, true),
            formattedTimestampTitle: this.safeFormatTimeStampTitle(notification.timestamp),
            title: this.getNotificationTitle(notification.type || NotificationType.INFO),
          })),
        ),
      )
      .subscribe(notifications => {
        this.allNotifications = notifications;
      });

    this.notificationService
      .getUnreadCountFromServer()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe();
  }

  /**
   * Sets up a listener for closing the notification panel.
   */
  private setupCloseNotificationListener(): void {
    this.notificationService.closeNotificationPanel$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(shouldClose => {
        if (shouldClose) {
          this.showNotifications = false;
        }
      });
  }

  /**
   * Sets up a listener for clicks outside the notification panel to close it.
   */
  private setupOutsideClickListener(): void {
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  /**
   * Handles clicks outside the notification bell to close the panel.
   * @param {MouseEvent} event The mouse event
   */
  handleOutsideClick(event: MouseEvent): void {
    if (!this.notificationBellRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
    }
  }

  /**
   * Loads more notifications when the user scrolls to the bottom of the panel.
   */
  loadMoreNotifications(): void {
    this.offset += this.LOAD_MORE_LIMIT;
    this.notificationService
      .fetchMoreNotifications(this.LOAD_MORE_LIMIT, this.offset)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(newNotifications => {
        // Append new notifications to the existing list
        this.allNotifications = [...this.allNotifications, ...newNotifications];
      });
  }

  /**
   * Handles scroll events on the notification panel.
   * @param {Event} event The scroll event
   */
  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    // Check if the user has scrolled to the bottom
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMoreNotifications();
    }
  }

  /**
   * Handles clicks on individual notifications.
   * @param {NotificationDTO} notification The clicked notification
   * @param {MatExpansionPanel} panel The expansion panel containing the notification
   * @param {string} action The action to perform ('view' or 'mark as read')
   */
  onClick(notification: NotificationDTO, panel: MatExpansionPanel, action: string): void {
    this.notificationService
      .handleNotificationClick(notification, action)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => panel.close());
  }

  /**
   * Toggles the visibility of the notifications panel.
   */
  toggleNotifications(): void {
    this.showNotifications = this.allNotifications.length > 0 ? !this.showNotifications : false;
  }

  /**
   * Formats a timestamp into a human-readable string.
   * @param {Date | string | undefined} timestamp - timestamp to format
   * @param {true} includeTime - whether to include the time in the formatted timestamp
   * @returns {string} formatted timestamp
   */
  private safeFormatTimeStamp(timestamp: Date | string | undefined, includeTime: boolean): string {
    if (!timestamp) return 'Unbekannte Zeit';

    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = timestamp;
    }

    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }

    try {
      return includeTime ? this.dateFormatter.format(date) : this.dateOnlyFormatter.format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Formatierungsfehler';
    }
  }

  /**
   * Formats a timestamp into a human-readable string for the title attribute.
   * @param {Date | string | undefined} timestamp - timestamp to format
   * @returns {string} formatted timestamp
   */
  private safeFormatTimeStampTitle(timestamp: Date | string | undefined): string {
    return this.safeFormatTimeStamp(timestamp, false);
  }

  /**
   * Returns the title of a notification based on its type.
   * @param {NotificationType} type - the type of the notification
   * @returns {string} the title of the notification
   */
  private getNotificationTitle(type: NotificationType): string {
    return this.notificationTitles[type] || 'Unbekannt';
  }
}
