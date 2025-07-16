import { OnInit, OnDestroy } from '@angular/core';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { NotificationService } from '@UMLearnServices/notification.service';
import { INotification } from './notification.models';
import { Subscription } from 'rxjs';
import { trigger, transition, animate, style } from '@angular/animations';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [style({ opacity: 0 }), animate('0.1s', style({ opacity: 1 }))]),
      transition(':leave', [animate('0.1s', style({ opacity: 0 }))]),
    ]),
  ],
})
export class NotificationComponent implements OnInit, OnDestroy {
  private readonly subscription: Subscription = new Subscription();
  notifications: INotification[] = [];

  constructor(private readonly service: NotificationService) {}

  /**
   * When the component is initialized, subscribe to the notification service to get notified when a new notification is called
   * Then, save the notification in the notifications array
   * Also, if the notification has a duration (it should by default), remove it after the duration has passed
   */
  ngOnInit(): void {
    this.subscription.add(
      this.service.notification.subscribe(notification => {
        if (notification.message) {
          this.notifications.push(notification);
          if (notification.duration > 0) {
            setTimeout(() => {
              const index = this.notifications.indexOf(notification);
              this.notifications.splice(index, 1);
            }, notification.duration);
          }
        }
      }),
    );
  }

  /**
   * When the component is destroyed, unsubscribe from the notification service to prevent memory leaks
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
