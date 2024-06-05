import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
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

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    ) {
      this.userService.isAuthenticated$.subscribe((isAuthenticated) => {
        if(isAuthenticated) {
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
   * Get the notifications
   * @returns {Observable<NotificationDTO[]>} the notifications as observable
   */
  getNotifications(): Observable<NotificationDTO[]> {
    return this.notificationsSubject.asObservable();
  }

  /**
   *
   * @param notification
   */
  addNotification(notification: NotificationDTO): void {
    this.notifications.push(notification);
    this.notificationsSubject.next(this.notifications);
  }

  /** TODO: Implement different actions for different types of notifications???
   * handle the click on a notification
   * @param notification
   */
  handleNotificationClick(notification: NotificationDTO): void {
    if(notification.type === 'comment') {
      console.log("COMMENT reached the frontendservice")
      this.router.navigate(['/discussion-view/'+ Number(notification.discussionId)]);
    }

    this.removeNotification(notification);
  }

  /**
   * Remove a notification from the list
   * @param notification
   */
  private removeNotification(notification: NotificationDTO): void {
    this.notifications = this.notifications.filter(notif => notif !== notification);
    this.notificationsSubject.next(this.notifications);
  }

  /**
   * Sends a notification from the client to the user with the given id
   * @param notification
   */
  sendNotification(notification: NotificationDTO) {
    this.socket.emit('notifications', { userId: notification.userId, message: notification.message});
  }

  /**
   * Shows a notification with links or action for certain events to trigger
   * @param message
   * @param actionText
   * @param route
   * @param action
   */
  showNotification(message: string, actionText?: string, action?: () => void) {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: { message, actionText, action },
      duration: 50000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['notification-snackbar-container']
    });
  }

  /**
   * Mark a notification as read
   * @returns {Observable<NotificationDTO>} the updated notification
   */
  markNotificationAsRead(notification: NotificationDTO): Observable<NotificationDTO> {
    console.log("marking notification as read: ", notification.id)
    return this.http.put<NotificationDTO>(`${environment.server}/notifications/${notification.id}/read`, notification);
  }

}
