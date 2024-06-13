import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';
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
  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    ) {

      this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
        if(isAuthenticated) {
          this.userId = Number(this.userService.getTokenID());
          this.startListening();
        } else {
          this.stopListening();
        }
      })
  }

  /**
   * Start listening for notifications and establish a connection to the websocket
   */
  private startListening(): void {
    // fetching initial Notifications and add more while scrolling
    this.fetchInitialNotifications(20, 0);
    this.socket = io('http://localhost:3001/notifications', {
      query: { token: this.userService.getAccessToken()},
      withCredentials: true,
      transports: ['websocket']
    });
    this.socket.on('notification', (notification: NotificationDTO) => {
      console.log("Received notification from websocket: ", notification)
      this.addNotification(notification);
      console.log("notification added, showing notification")
      this.showNotification(notification.message, 'View', () => this.handleNotificationClick(notification));
    });
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

  /** TODO: Implement different actions for different types of notifications
   * handle the click on a notification
   * @param {NotificationDTO} notification
   */
  handleNotificationClick(notification: NotificationDTO): void {
    switch(notification.type) {
      case NotificationType.COMMENT:
        console.log("comment reached the frontend");
        this.markNotificationAsRead(notification).subscribe();
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
    console.log("marking notification as read: ", notification.id)
    return this.http.patch<NotificationDTO>(`${environment.server}/notifications/${notification.id}/read`, {isRead: true});
  }

  /**
   * Get the count of unread notifications for a user
   * @returns {Observable<number>} The count of unread notifications
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${environment.server}/notifications/${this.userId}/unread-count`)
    .pipe(
        catchError(error => {
          // Log the error or handle it as needed
          console.error('Error fetching unread notifications count:', error);
          // Return an Observable that emits 0 as the default unread count
          return of(0);
        })
      );;
  }

}
