import { Component, HostListener, OnInit, QueryList, ViewChildren } from '@angular/core';
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
  limit: number = 20;
  offset: number = 0;

  @ViewChildren(MatExpansionPanel) panels!: QueryList<MatExpansionPanel>

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.getNotifications().subscribe(notifications => {
      this.allNotifications = notifications
      this.unreadCount = notifications.filter(notification => !notification.isRead).length;
    });
  }

  loadMoreNotifications(): void {
    this.offset += this.limit;
    this.notificationService.fetchMoreNotifications(this.limit, this.offset);
  }

  @HostListener('scroll', ['$event'])
  onScroll(event: any): void {
    const element = event.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMoreNotifications();
    }
  }

  toggleNotifications() {
    if(this.allNotifications.length > 0) {
      this.showNotifications = !this.showNotifications;
    }
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
