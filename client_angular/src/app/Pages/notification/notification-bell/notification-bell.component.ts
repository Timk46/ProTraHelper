import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
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
  @ViewChild('notificationBell') notificationBellRef!: ElementRef

  constructor(
    private notificationService: NotificationService
  ){}

  ngOnInit(): void {
    this.loadUnreadCount();
    this.notificationService.getNotifications().subscribe(notifications => {
      this.allNotifications = notifications
      this.unreadCount = notifications.filter(notification => !notification.isRead).length;
    });
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  handleOutsideClick(event: MouseEvent): void {
    const clickedInside = this.notificationBellRef.nativeElement.contains(event.target);
    console.log("we clicked inside: ", clickedInside)
    if (!clickedInside) {
      this.showNotifications = false;
    }
  }


  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe(count => {
      this.unreadCount = count;
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

  onClick(notification: NotificationDTO) {
    this.notificationService.handleNotificationClick(notification);
  }

  onDelete(notification: NotificationDTO): void {
    this.notificationService.removeNotification(notification);
  }

  markAsRead(notification: NotificationDTO): void {
  if (!notification.isRead) {
    this.notificationService.markNotificationAsRead(notification).subscribe(updatedNotification => {
      // Update the local state to reflect the notification is now read
      notification.isRead = true;
      // Optionally, update the unread count
      this.unreadCount = this.allNotifications.filter(n => !n.isRead).length;
    });
  }
}


  toggleNotifications() {
    if(this.allNotifications.length > 0) {
      this.showNotifications = !this.showNotifications;
    }
  }


}
