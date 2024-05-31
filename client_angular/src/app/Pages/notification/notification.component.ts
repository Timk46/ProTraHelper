import { Component, Inject, OnInit } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { NotificationDTO } from '@DTOs//notification.dto';
import { NotificationService } from 'src/app/Services/notification/notification.service';


@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  notifications: NotificationDTO[] = [];

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: any,
    private snackBarRef: MatSnackBarRef<NotificationComponent>,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.notificationService.getNotifications().subscribe((notifications) => {
      this.notifications = notifications;
    });
  }

  handleClick(notification: NotificationDTO): void {
     this.notificationService.handleNotificationClick(notification);
  }

  closeSnackBar(): void {
    this.snackBarRef.dismiss();
  }

  performAction() {
    if (this.data.route) {
      this.router.navigate([this.data.route]);
      this.closeSnackBar();
    } else if (this.data.action) {
      this.data.action();
      this.closeSnackBar();
    }
  }
}
