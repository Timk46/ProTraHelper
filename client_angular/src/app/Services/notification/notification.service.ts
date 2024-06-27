import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, catchError, map, Observable, of, Subject, tap } from 'rxjs';
import {NotificationType} from '@DTOs/notificationType.enum';
import { UserService } from '../auth/user.service';

import { environment } from 'src/environments/environment';
import { NotificationDTO } from '@DTOs/notification.dto';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationComponent } from 'src/app/Pages/notification/notification.component';
import { HttpClient } from '@angular/common/http';
import { MatExpansionPanel } from '@angular/material/expansion';
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket!: Socket;
  private notificationsSubject = new BehaviorSubject<NotificationDTO[]>([]);
  private notifications: NotificationDTO[] = [];
  private userId: number | undefined;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private broadcastChannel: BroadcastChannel;
  private processedNotifications = new Set<string>();
  private closeNotificationPanelSubject = new BehaviorSubject<boolean>(false);
  closeNotificationPanel$ = this.closeNotificationPanelSubject.asObservable();
  private refreshDiscussionSubject = new BehaviorSubject<number | null>(null);
  refreshDiscussion$ = this.refreshDiscussionSubject.asObservable();
  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    ) {
      this.broadcastChannel = new BroadcastChannel('unreadCountChannel');
      this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
        // after checking authentication status we start listening to incoming messages thorough the socket, synchronize the UnreadCount and setup our broadcastChannel which synchronizes necessary values throughout opened tabs and windows
        if(isAuthenticated) {
          this.userId = Number(this.userService.getTokenID());
          this.startListening();
          this.syncUnreadCount();
          this.setupBroadcastChannel();
        } else {
          this.stopListening();
        }
      })
  }

  /**
   * Setup the broadcast channel to communicate with other tabs
   * currently havin 3 types to sync:
   * 1. new incoming notification,
   * 2. the unread Count of the notification Bell
   * 3. notificaitons being read
   * @returns {void}
   */
  private setupBroadcastChannel(): void {
    this.broadcastChannel.onmessage = (event) => {
      switch (event.data.type) {
        case 'newNotification':
          this.handleNewNotification(event.data.notification, false);
          break;
        case 'unreadCount':
          this.setUnreadCount(event.data.count, false);
          break;
        case 'notificationRead':
          this.updateNotificationReadStatus(event.data.notificationId);
          this.syncUnreadCount();
          break;
      }
    };
  }

  private updateNotificationReadStatus(notificationId: number): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.notificationsSubject.next([...this.notifications]);
    }
  }

  triggerDiscussionRefresh(discussionId: number) {
    this.refreshDiscussionSubject.next(discussionId);
  }

  /**
   * Start listening for notifications and establish a connection to the websocket
   */
  private startListening(): void {
    this.fetchInitialNotifications(20, 0);
    this.socket = io('http://localhost:3001/notifications', {
      query: { token: this.userService.getAccessToken() },
      withCredentials: true,
      transports: ['websocket']
    });
    this.socket.on('notification', (notification: NotificationDTO) => {
      this.handleNewNotification(notification, true);
    });
  }

  /**
   * Handle a new notification by creating UID out of the notification ID and timestamp and adding it to the panel if it is not already there
   * @param {NotificationDTO} notification
   * @param {boolean} isBroadcast
   * @returns {void}
   */
  private handleNewNotification(notification: NotificationDTO, isBroadcast: boolean): void {
    // creating unique id for the notification and checking processed notifications
    const notificationId = `${notification.id}-${notification.timestamp}`;
    if (!this.processedNotifications.has(notificationId)) {
      this.processedNotifications.add(notificationId);
      this.addNotification(notification);
      if (isBroadcast) {
        this.incrementUnreadCount();
        // Broadcast the new notification to other tabs
        this.broadcastChannel.postMessage({ type: 'newNotification', notification });
      }
      this.showNotification(notification.message, 'Anzeigen', () => this.handleNotificationClick(notification, 'view').subscribe());
    }
  }

  /**
   * Stop listening for notifications and disconnect from the websocket
   */
  private stopListening(): void {
    if(this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Fetch the initial notifications
   * @param {number} limit for pagination
   * @param {number} offset for pagination offset
   */
  private fetchInitialNotifications(limit: number, offset: number): void {
    this.http.get<NotificationDTO[]>(`${environment.server}/notifications/all`, {
      params: {
        userId: this.userId!.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      }
    }).pipe(
      catchError(error => {
        console.error('Error fetching initial notifications:', error);
        return of([]);
      })
    ).subscribe(notifications => {
      this.notifications = notifications
      this.notificationsSubject.next(this.notifications);
      this.syncUnreadCount();
    });
  }

  /**
   * Fetch more notifications when scrolling
   * @param {number} limit for pagination
   * @param {number} offset for pagination offset
   */
  fetchMoreNotifications(limit: number, offset: number): void {
    this.http.get<NotificationDTO[]>(`${environment.server}/notifications/all`, {
      params: {
        userId: this.userId!!.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      }
    }).pipe(
      catchError(error => {
        console.error('Error fetching more notifications:', error);
        return of([]);
      })
    ).subscribe(notifications => {
      this.notifications = [...this.notifications, ...notifications];
      this.notificationsSubject.next(this.notifications);
    });
  }

  /**
   * Get the notifications
   * @returns {Observable<NotificationDTO[]>} the notifications as observable
   */
  getNotifications(): Observable<NotificationDTO[]> {
    return this.notificationsSubject.asObservable();
  }

  /**
   *
   * @param {NotificationDTO} notification
   */
  addNotification(notification: NotificationDTO): void {
    this.notifications.unshift(notification);
    this.notificationsSubject.next(this.notifications);
  }

  /**
   * handle the click on a notification
   * @param {NotificationDTO} notification
   */
  handleNotificationClick(notification: NotificationDTO, action: string): Observable<NotificationDTO> {
    if (!notification.isRead) {
      console.log("typeof notification ID: ", typeof notification.id, " and the id: ", notification.id);
      return this.markNotificationAsRead(notification).pipe(
        tap((updatedNotification) => {
          this.updateLocalNotification(updatedNotification);
          this.broadcastChannel.postMessage({ type: 'notificationRead', notificationId: updatedNotification.id });

          if(action === 'view') {
            this.closeNotificationPanelSubject.next(true);
            this.navigate(updatedNotification)
          }
        })
      );
    } else if(action === 'view') {
      // If the notification is already read, just navigate
      this.closeNotificationPanelSubject.next(true);
      this.navigate(notification);
      return of(notification);
    } else {
      return of(notification)
    }
  }

  /**
   * Navigate to the discussion of the notification
   * @param {NotificationDTO} notification
   */
  private navigate(notification: NotificationDTO): void {
    switch(notification.type) {
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
   * Update a notification in the list to trigger change detection
   * @param {NotificationDTO} updatedNotification
   */
  private updateLocalNotification(updatedNotification: NotificationDTO): void {
    const index = this.notifications.findIndex(n => n.id === updatedNotification.id);
    if (index !== -1) {
      this.notifications[index] = updatedNotification;
      this.notificationsSubject.next([...this.notifications]); // Trigger change detection
    }
  }

  /** NOT BEING USED
   * Remove a notification from the list
   * @param {NotificationDTO} notification
   */
  removeNotification(notification: NotificationDTO): void {
    this.notifications = this.notifications.filter(notif => notif !== notification);
    this.notificationsSubject.next(this.notifications);
  }

  /** NOT USED YET:
   * emits a notification from the client to the user with the given id
   * @param {NotificationDTO} notification
   */
  sendNotification(notification: NotificationDTO) {
    this.socket.emit('notifications', { userId: notification.userId, message: notification.message});
  }

  /**
   * Shows a notification with links or action for certain events to trigger
   * @param message
   * @param actionText
   * @param action
   */
  showNotification(message: string, actionText?: string, action?: () => void) {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: { message, actionText, action },
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['notification-snackbar-container']
    });
  }

  /**
   * Mark a notification as read
   * @param {NotificationDTO} notification
   * @returns {Observable<NotificationDTO>} the updated notification
   */
  markNotificationAsRead(notification: NotificationDTO): Observable<NotificationDTO> {
    console.log("marking notification as read: ", notification.id);
    return this.http.patch<NotificationDTO>(`${environment.server}/notifications/${notification.id}/read`, {isRead: true}).pipe(
      map((response) => {
        this.updateNotificationReadStatus(notification.id!);
        this.broadcastChannel.postMessage({ type: 'notificationRead', notificationId: notification.id });
        this.syncUnreadCount();
        return response; // You must return the response to not alter the stream
      }),
    );
  }

  /**
   * Get the count of unread notifications for a user
   * @returns {Observable<number>} The count of unread notifications
   */
  getUnreadCountFromServer(): Observable<number> {
    return this.http.get<number>(`${environment.server}/notifications/${this.userId}/unread-count`)
      .pipe(
        tap(count => {
          this.setUnreadCount(count, true);
        }),
        catchError(error => {
          console.error('Error fetching unread notifications count:', error);
          return of(0); // Return an Observable that emits 0 in case of an error
        })
      );
  }

  /**
   * Increment the unread count in the local storage and notify subscribers
   */
  private incrementUnreadCount(): void {
    this.setUnreadCount(this.unreadCountSubject.value + 1, true);
  }


  /**
   * Synchronize the unread count with the local storage
   */
  private syncUnreadCount(): void {
    const storedCount = Number(localStorage.getItem('unreadCount')) || 0;
    this.setUnreadCount(storedCount, false);
    this.getUnreadCountFromServer().subscribe();
  }

  /**
   * Decrement the unread count in the local storage and notify subscribers
   */
  decrementUnreadCount(broadcast: boolean): void {
    this.setUnreadCount(Math.max(this.unreadCountSubject.value - 1, 0), broadcast);
  }

  /**
   *
   * @returns {Observable<number>} The count of unread notifications
   */
  getUnreadCount(): Observable<number> {
    return this.unreadCountSubject.asObservable();
  }

  /**
   * Set the unread count in the local storage and notify subscribers
   * @param {number} newCount
   */
  private setUnreadCount(newCount: number, broadcast: boolean): void {
    localStorage.setItem('unreadCount', newCount.toString());
    this.unreadCountSubject.next(newCount);
    if(broadcast) {
      this.broadcastChannel.postMessage({ type: 'unreadCount', count: newCount });
    }
  }
}
