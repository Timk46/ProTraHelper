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
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket: Socket;
  private notificationsSubject = new BehaviorSubject<NotificationDTO[]>([]);
  private notifications: NotificationDTO[] = [];

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router
    ) {

      this.socket = io('http://localhost:3001/notifications', {
        query: { token: this.userService.getAccessToken()},
        withCredentials: true,
        transports: ['websocket']
      });
      this.socket.on('notification', (notification: NotificationDTO) => {
        this.addNotification(notification);
        console.log("YOU DID IT")
        this.showNotification(notification.message, 'View', '/dashboard', () => this.handleNotificationClick(notification));
      });
  }

  /***
   * Get the notifications
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

  // EXAMPLE IMPLEMENTATION OF HOW TO HANDLE THE CLICK
  /** TODO: Implement this types
   * handle the click on a notification
   * @param notification
   */
  handleNotificationClick(notification: NotificationDTO): void {
    if(notification.type === 'comment') {
      console.log("COMMENT reached the frontendservice")
      this.router.navigate(['/discussion-view', notification.discussionId]);
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
   * Sends a notification to the user with the given id
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
  showNotification(message: string, actionText?: string, route?: string, action?: () => void) {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: { message, actionText, route, action },
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}
