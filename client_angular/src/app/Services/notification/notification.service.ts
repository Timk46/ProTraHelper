import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../auth/user.service';
import { SwPush } from '@angular/service-worker';
import { environment } from 'src/environments/environment';
import { NotificationDTO } from '@DTOs/notification.dto';
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket: Socket;
  private swPushPayload: any;
  constructor(
    private toastr: ToastrService,
    private userService: UserService,
    private swPush: SwPush) {
      const userId = this.userService.getTokenID();
      this.socket = io('http://localhost:3001/notifications', {
        query: {
          userId: userId
        },
        withCredentials: true,
        transports: ['websocket']
      });
      this.socket.on('notification', (message: string) => {
        // this opens green notification popup (could be exchanged with a seperate component for example)
        this.toastr.success(message, 'Neue Benachrichtigung');
      });
  }


  /**
   *
   * @returns an observable that emits the notification message
   */
  getNotifications(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('notification', (message: string) => {
        observer.next(message);
      });
      return () => this.socket.off('notification');
    });
  }

  /**
   * Subscribe to pushmessages sent by the server
   */
  subscribeMessage(): void {
    this.swPush.messages.subscribe((res: any) => {
      console.log('Received push notification', res);
    });
  }


  /**
   * Sends a notification to the user with the given id
   * @param notification
   */
  sendNotification(notification: NotificationDTO) {
    this.socket.emit('notifications', { userId: notification.userId, message: notification.message});
  }
}
