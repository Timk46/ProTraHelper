import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import {NotificationType} from '@DTOs/notificationType.enum';
import { UserService } from '../auth/user.service';

import { environment } from 'src/environments/environment';
import { NotificationDTO } from '@DTOs/notification.dto';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationComponent } from 'src/app/Pages/notification/notification.component';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket!: Socket;
  private notificationsSubject = new BehaviorSubject<NotificationDTO[]>([]);
  private notifications: NotificationDTO[] = [];
  private userId: number | undefined;
  private unreadCountSubject = new BehaviorSubject<number>(0); // new subject for unread count
  //private receivedNotificationIds = new Set<number>(); // Track received notification IDs to avoid duplicates
  private broadcastChannel: BroadcastChannel;
  private processedNotifications = new Set<string>();

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    ) {
      this.broadcastChannel = new BroadcastChannel('unreadCountChannel');
      this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
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

  private setupBroadcastChannel(): void {
    this.broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'newNotification') {
        this.handleNewNotification(event.data.notification, false);
      } else if (event.data.type === 'unreadCount') {
        this.setUnreadCount(event.data.count, false);
      } else if (event.data.type === 'notificationRead') {
        this.syncUnreadCount();
      }
    };
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

  private handleNewNotification(notification: NotificationDTO, isBroadcast: boolean): void {
    const notificationId = `${notification.id}-${notification.timestamp}`;
    if (!this.processedNotifications.has(notificationId)) {
      console.log("not adding the notification in the panel")
      this.processedNotifications.add(notificationId);
      this.addNotification(notification);

      if (isBroadcast) {
        this.incrementUnreadCount();
        this.broadcastChannel.postMessage({ type: 'newNotification', notification });
      }

      this.showNotification(notification.message, 'View', () => this.handleNotificationClick(notification));
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
      this.notifications = notifications;
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
    // const exists = this.notifications.some(n => n.id === notification.id);
    // if (!exists) {
    //   this.notifications.unshift(notification);
    //   this.notificationsSubject.next(this.notifications);
    // }
  }

  /** TODO: Implement different actions for different types of notifications
   * handle the click on a notification
   * @param {NotificationDTO} notification
   */
  handleNotificationClick(notification: NotificationDTO): void {
    switch(notification.type) {
      case NotificationType.COMMENT:
        console.log("comment reached the frontend");
        this.markNotificationAsRead(notification).subscribe(() => {
          this.broadcastChannel.postMessage({ type: 'notificationRead' });
        });
        this.router.navigate(['/discussion-view/' + notification.discussionId]);
        break;
      default:
        console.log("Unknown notification type");
        break;
    }
    //this.removeNotification(notification);
  }

  /**
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
        this.syncUnreadCount();
        console.log("response in markNotificationsasRead: ", response)
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
          this.setUnreadCount(count, false);
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
    const newCount = this.unreadCountSubject.value + 1;
    this.setUnreadCount(newCount, true);
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
    const newCount = Math.max(this.unreadCountSubject.value - 1, 0);
    this.setUnreadCount(newCount, broadcast);
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
