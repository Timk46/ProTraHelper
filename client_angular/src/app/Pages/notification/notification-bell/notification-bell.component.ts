import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { NotificationService } from 'src/app/Services/notification/notification.service';
import { NotificationDTO } from '@DTOs/notification.dto';
import { MatExpansionPanel } from '@angular/material/expansion';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit {
  allNotifications: NotificationDTO[] = [];
  unreadCount: number = 0;
  showNotifications: boolean = false;

  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.getNotifications().subscribe(notifications => {
      this.allNotifications = notifications
      this.unreadCount = notifications.filter(notification => !notification.isRead).length;
    });
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(notification: NotificationDTO, panel: MatExpansionPanel) {
    notification.isRead = true;
    this.notificationService.markNotificationAsRead(notification).subscribe(() => {
       this.unreadCount--;
       panel.close();
    });

    // Optionally, update the notification list to reflect the read status immediately
    this.allNotifications = this.allNotifications.map(notification =>
      notification.id === notification.id ? { ...notification, isRead: true } : notification
    );
  }
}
