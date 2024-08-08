import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { catchError, filter, map, switchMap, take, tap } from 'rxjs/operators';
import { NotificationType } from '@DTOs/notificationType.enum';
import { UserService } from '../auth/user.service';
import { environment } from 'src/environments/environment';
import { NotificationDTO } from '@DTOs/notification.dto';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationComponent } from 'src/app/Pages/notification/notification.component';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from '../websocket/websocket.service';

/**
 * Service responsible for managing notifications in the frontend.
 * Handles real-time notifications via WebSocket, fetches notifications from the server,
 * and provides methods to interact with notifications.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private readonly NOTIFICATION_URL = 'http://localhost:3001';
  private readonly NOTIFICATION_NAMESPACE = 'notifications';
  private readonly NOTIFICATION_RECEIVEEVENT = 'notification';
  private readonly NOTIFICATION_SENDEVENT = 'notifications';
  private readonly BROADCAST_CHANNEL_NAME = 'unreadCountChannel';
  private readonly NOTIFICATION_TYPES = {
    NEW_NOTIFICATION: 'newNotification',
    UNREAD_COUNT: 'unreadCount',
    NOTIFICATION_READ: 'notificationRead'
  };
  private readonly NOTIFICATION_ACTIONS = {
    VIEW: 'view'
  };
  /** BehaviorSubject to store and emit notifications */
  private notificationsSubject = new BehaviorSubject<NotificationDTO[]>([]);
  /** Array to store notifications */
  private notifications: NotificationDTO[] = [];
  /** ID of the current user */
  private userId: number | undefined;
  /** BehaviorSubject to store and emit the count of unread notifications */
  private unreadCountSubject = new BehaviorSubject<number>(0);
  /** BroadcastChannel for cross-tab communication */
  private broadcastChannel: BroadcastChannel;
  /** Set to keep track of processed notifications to avoid duplicates */
  private processedNotifications = new Set<string>();
  /** BehaviorSubject to control closing of the notification panel */
  private closeNotificationPanelSubject = new BehaviorSubject<boolean>(false);
  /** Observable for closing the notification panel */
  closeNotificationPanel$ = this.closeNotificationPanelSubject.asObservable();
  /** BehaviorSubject to trigger refreshing of discussions */
  private refreshDiscussionSubject = new BehaviorSubject<number | null>(null);
  /** Observable for refreshing discussions */
  refreshDiscussion$ = this.refreshDiscussionSubject.asObservable();
  /** Subscription for WebSocket notifications */
  private notificationSubscription?: Subscription;


  /**
   * Creates an instance of NotificationService.
   * @param {UserService} userService - Service to handle user-related operations
   * @param {MatSnackBar} snackBar - Service to show snackbar notifications
   * @param {Router} router - Angular router for navigation
   * @param {HttpClient} http - HttpClient for making HTTP requests
   * @param {WebSocketService} webSocketService - Service for WebSocket communications
   */
  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.broadcastChannel = new BroadcastChannel(this.BROADCAST_CHANNEL_NAME);
    this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.userId = Number(this.userService.getTokenID());
        this.startListening();
        this.syncUnreadCount();
        this.setupBroadcastChannel();
      } else {
        this.stopListening();
      }
    });
  }

  /**
   * Lifecycle hook that performs cleanup on service destruction.
   */
  ngOnDestroy() {
    this.stopListening();
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  initializeWebSocket(): void {
    if (!this.webSocketService.isConnected(this.NOTIFICATION_URL, this.NOTIFICATION_NAMESPACE)) {
      this.startListening();
    }
  }

  /**
   * Sets up the broadcast channel to communicate with other tabs.
   * Handles three types of synchronization:
   * 1. New incoming notifications
   * 2. Unread count of the notification bell
   * 3. Notifications being read
   */
  private setupBroadcastChannel(): void {
    this.broadcastChannel.onmessage = (event) => {
      switch (event.data.type) {
        case this.NOTIFICATION_TYPES.NEW_NOTIFICATION:
          this.handleNewNotification(event.data.notification, false);
          break;
        case this.NOTIFICATION_TYPES.UNREAD_COUNT:
          this.setUnreadCount(event.data.count, false);
          break;
        case this.NOTIFICATION_TYPES.NOTIFICATION_READ:
          this.updateNotificationReadStatus(event.data.notificationId);
          this.syncUnreadCount();
          break;
      }
    };
  }

  /**
   * Updates the read status of a notification locally.
   * @param {number} notificationId - ID of the notification to update
   */
  private updateNotificationReadStatus(notificationId: number): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.notificationsSubject.next([...this.notifications]);
    }
  }

  /**
   * Triggers a refresh for a specific discussion.
   * @param {number} discussionId - ID of the discussion to refresh
   */
  triggerDiscussionRefresh(discussionId: number) {
    this.refreshDiscussionSubject.next(discussionId);
  }

  /**
   * Starts listening for notifications and establishes a connection to the WebSocket.
   */
  private startListening(): void {
    this.fetchInitialNotifications(20, 0).subscribe();
    this.webSocketService.connect(this.NOTIFICATION_URL, this.NOTIFICATION_NAMESPACE);

    this.notificationSubscription = this.webSocketService
      .onConnectionChange(this.NOTIFICATION_URL, this.NOTIFICATION_NAMESPACE)
      .pipe(
        filter((connected: boolean) => connected),
        switchMap(() =>
          this.webSocketService.on<Partial<NotificationDTO>>(
            this.NOTIFICATION_URL,
            this.NOTIFICATION_NAMESPACE,
            this.NOTIFICATION_RECEIVEEVENT
          )
        )
      )
      .subscribe({
        next: (notification: Partial<NotificationDTO>) => {
          console.log('WebSocket connected and received notification:', notification);
          this.handleNewNotification(notification, true);
        },
        error: (error) => console.error('WebSocket error:', error),
        complete: () => console.log('WebSocket connection closed')
      });
  }

  /**
   * Stops listening for notifications and disconnects from the WebSocket.
   */
  private stopListening(): void {
    this.webSocketService.disconnect(this.NOTIFICATION_URL, this.NOTIFICATION_NAMESPACE);
  }

    /**
   * Handles a new notification by creating a unique ID and adding it to the panel if it's not already there.
   * @param {Partial<NotificationDTO>} notification - The new notification
   * @param {boolean} isBroadcast - Whether the notification is from a broadcast
   */
  private handleNewNotification(notification: Partial<NotificationDTO>, isBroadcast: boolean): void {
    const notificationToSent = {
      id: notification.id,
      message: notification.message!,
      timestamp: notification.timestamp!,
      type: notification.type!,
    };
    const notificationId = `${notification.id}-${notification.timestamp}`;

    if (!this.processedNotifications.has(notificationId)) {
      this.processedNotifications.add(notificationId);
      this.addNotification(notificationToSent as NotificationDTO);
      if (isBroadcast) {
        this.incrementUnreadCount();
        this.broadcastChannel.postMessage({ type: 'newNotification', notificationToSent });
      }
      this.showNotification(notificationToSent.message!, 'Anzeigen', () => this.handleNotificationClick(notificationToSent as NotificationDTO, 'view').subscribe());
    }
  }

  /**
   * Creates a handler for HTTP errors.
   * @param operation - The name of the operation that failed
   * @param {T} result - The optional result to return as the observable result
   * @returns {Observable<T>} An observable of the result type
   */
  private handleError<T>(operation = 'operation', result?: T): (error: any) => Observable<T>  {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      // Optionally, we can even send a notification to the user here
      return new Observable<T>(subscriber => {
        subscriber.next(result as T);
        subscriber.complete();
      });
    };
  }

  /**
   * Fetches notifications from the server.
   * @param {number} limit - The maximum number of notifications to fetch.
   * @param {number} offset - The offset for pagination.
   * @param {boolean} isInitial - Whether this is the initial fetch or a subsequent one.
   * @returns {Observable<NotificationDTO[]>} An Observable of fetched notifications.
   */
  private fetchNotifications(limit: number, offset: number, isInitial: boolean): Observable<NotificationDTO[]> {
    return this.http.get<NotificationDTO[]>(`${environment.server}/notifications/all`, {
      params: {
        userId: this.userId!.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      }
    }).pipe(
      catchError(this.handleError<NotificationDTO[]>('fetchNotifications', [])),
      map(notifications => {
        if (isInitial) {
          this.notifications = notifications;
        } else {
          this.notifications = [...this.notifications, ...notifications];
        }
        this.notificationsSubject.next(this.notifications);
        if (isInitial) {
          this.syncUnreadCount();
        }
        return notifications;
      })
    );
  }

  /**
   * Fetches the initial notifications from the server.
   * @param {number} limit - The maximum number of notifications to fetch.
   * @param {number} offset - The offset for pagination.
   * @returns {Observable<NotificationDTO[]>} An Observable of fetched notifications.
   */
  private fetchInitialNotifications(limit: number, offset: number): Observable<NotificationDTO[]> {
    return this.fetchNotifications(limit, offset, true);
  }

  /**
   * Fetches more notifications from the server.
   * @param {number} limit - The maximum number of notifications to fetch
   * @param {number} offset - The offset for pagination
   * @returns {Observable<NotificationDTO[]>} An Observable of fetched notifications
   */
  fetchMoreNotifications(limit: number, offset: number): Observable<NotificationDTO[]> {
    return this.fetchNotifications(limit, offset, false);
  }

  /**
   * Gets the notifications as an Observable.
   * @returns {Observable<NotificationDTO[]>} Observable of notifications
   */
  getNotifications(): Observable<NotificationDTO[]> {
    return this.notificationsSubject.asObservable();
  }

  /**
   * Adds a new notification to the list.
   * @param {NotificationDTO} notification - The notification to add
   */
  addNotification(notification: Partial<NotificationDTO>): void {
    this.notifications.unshift(notification as NotificationDTO);
    this.notificationsSubject.next(this.notifications);
  }

  /**
   * Handles a click on a notification.
   * @param {NotificationDTO} notification - The clicked notification
   * @param {string} action - The action to perform ('view' or other)
   * @returns {Observable<NotificationDTO>} Observable of the updated notification
   */
  handleNotificationClick(notification: NotificationDTO, action: string): Observable<NotificationDTO> {
    if (!notification.isRead) {
      return this.markAndNavigate(notification, action);
    } else if (action === this.NOTIFICATION_ACTIONS.VIEW) {
      return this.viewNotification(notification);
    }
    return new Observable<NotificationDTO>(subscriber => {
      subscriber.next(notification);
      subscriber.complete();
    });
  }

  /**
   * Marks a notification as read and navigates to the appropriate page.
   * @param {NotificationDTO} notification - The notification to mark as read
   * @param {string} action - The action to perform ('view' or other)
   * @returns {Observable<NotificationDTO>} Observable of the updated notification
   */
  private markAndNavigate(notification: NotificationDTO, action: string): Observable<NotificationDTO> {
    return this.markNotificationAsRead(notification).pipe(
      map((updatedNotification) => {
        this.updateLocalNotification(updatedNotification);
        this.broadcastChannel.postMessage({ type: this.NOTIFICATION_TYPES.NOTIFICATION_READ, notificationId: updatedNotification.id });
        if (action === this.NOTIFICATION_ACTIONS.VIEW) {
          this.viewNotification(updatedNotification);
        }
        return updatedNotification;
      })
    );
  }

  /**
   *
   * @param {NotificationDTO} notification - The notification to view
   * @returns {Observable<NotificationDTO>} Observable of the viewed notification
   */
  private viewNotification(notification: NotificationDTO): Observable<NotificationDTO> {
    this.closeNotificationPanelSubject.next(true);
    this.navigate(notification);
    return new Observable<NotificationDTO>(subscriber => {
      subscriber.next(notification);
      subscriber.complete();
    });
  }

  /**
   * Navigates to the appropriate page based on the notification type.
   * @param {NotificationDTO} notification - The notification to navigate to
   */
  private navigate(notification: NotificationDTO): void {
    switch (notification.type) {
      case NotificationType.COMMENT:
      case NotificationType.SOLUTION:
        this.router.navigate(['/discussion-view/' + notification.discussionId]);
        this.triggerDiscussionRefresh(notification.discussionId!);
        break;
      default:
        console.log("Unknown notification type");
    }
  }

  /**
   * Updates a notification in the local list to trigger change detection.
   * @param {NotificationDTO} updatedNotification - The updated notification
   */
  private updateLocalNotification(updatedNotification: NotificationDTO): void {
    const index = this.notifications.findIndex(n => n.id === updatedNotification.id);
    if (index !== -1) {
      this.notifications[index] = updatedNotification;
      this.notificationsSubject.next([...this.notifications]);
    }
  }

  /**
   * Removes a notification from the list (currently not in use).
   * @param {NotificationDTO} notification - The notification to remove
   */
  removeNotification(notification: NotificationDTO): void {
    this.notifications = this.notifications.filter(notif => notif !== notification);
    this.notificationsSubject.next(this.notifications);
  }

  /**
   * Emits a notification from the client to the user with the given id (currently not in use).
   * @param {NotificationDTO} notification - The notification to send
   */
  sendNotification(notification: NotificationDTO) {
    this.webSocketService.emit(
      this.NOTIFICATION_URL,
      this.NOTIFICATION_NAMESPACE,
      this.NOTIFICATION_SENDEVENT,
      { userId: notification.userId, message: notification.message });
  }

  /**
   * Shows a notification using a snackbar.
   * @param {string} message - The message to display
   * @param {string} actionText - The text for the action button
   * @param {() => void} action - The function to call when the action button is clicked
   */
  showNotification(message: string, actionText?: string, action?: () => void) {
    console.log("showing notification: ", message);
    if (this.userService.isUserLoggedIn()) {
      console.log("showing notification: ", message);
      this.snackBar.openFromComponent(NotificationComponent, {
        data: { message, actionText, action },
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['notification-snackbar-container']
      });
    }
  }

  /**
   * Marks a notification as read.
   * @param {NotificationDTO} notification - The notification to mark as read
   * @returns {Observable<NotificationDTO>} Observable of the updated notification
   */
  markNotificationAsRead(notification: NotificationDTO): Observable<NotificationDTO> {
    console.log("marking notification as read: ", notification.id);
    return this.http.patch<NotificationDTO>(`${environment.server}/notifications/${notification.id}/read`, { isRead: true }).pipe(
      map((response) => {
        this.updateNotificationReadStatus(notification.id!);
        this.broadcastChannel.postMessage({ type: 'notificationRead', notificationId: notification.id });
        this.syncUnreadCount();
        return response;
      }),
      catchError(this.handleError<NotificationDTO>('markNotificationAsRead', notification))
    );
  }

  /**
   * Gets the count of unread notifications from the server.
   * @returns {Observable<number>} Observable of the unread count
   */
  getUnreadCountFromServer(): Observable<number> {
    return this.http.get<number>(`${environment.server}/notifications/${this.userId}/unread-count`)
      .pipe(
        map(count => {
          this.setUnreadCount(count, true);
          return count;
        }),
        catchError(error => {
          console.error('Error fetching unread notifications count:', error);
          return of(0);
        })
      );
  }

  /**
   * Increments the unread count in local storage and notifies subscribers.
   */
  private incrementUnreadCount(): void {
    this.setUnreadCount(this.unreadCountSubject.value + 1, true);
  }

  /**
   * Synchronizes the unread count with local storage.
   */
  private syncUnreadCount(): void {
    const storedCount = Number(localStorage.getItem('unreadCount')) || 0;
    this.setUnreadCount(storedCount, false);
    this.getUnreadCountFromServer().subscribe();
  }

/**
   * Decrements the unread count in local storage and notifies subscribers.
   * @param {boolean} broadcast - Whether to broadcast the change to other tabs
   */
  decrementUnreadCount(broadcast: boolean): void {
    this.setUnreadCount(Math.max(this.unreadCountSubject.value - 1, 0), broadcast);
  }

  /**
   * Gets the unread count as an Observable.
   * @returns {Observable<number>} Observable of the unread count
   */
  getUnreadCount(): Observable<number> {
    return this.unreadCountSubject.asObservable();
  }

  /**
   * Sets the unread count in local storage and notifies subscribers.
   * @param {number} newCount - The new unread count
   * @param {boolean} broadcast - Whether to broadcast the change to other tabs
   */
  private setUnreadCount(newCount: number, broadcast: boolean): void {
    try {
      localStorage.setItem('unreadCount', newCount.toString());
      this.unreadCountSubject.next(newCount);
      if (broadcast) {
        this.broadcastChannel.postMessage({ type: 'unreadCount', count: newCount });
      }
    } catch (error) {
      console.error('Error setting unread count:', error);
      // Fallback behavior or error notification
    }
  }

}
