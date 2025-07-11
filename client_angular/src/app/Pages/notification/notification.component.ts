import type { OnInit } from '@angular/core';
import { Component, Inject } from '@angular/core';
import type { MatSnackBarRef } from '@angular/material/snack-bar';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import type { NotificationDTO } from '@DTOs//notification.dto';
import type { NotificationService } from 'src/app/Services/notification/notification.service';

/**
 * Component that represents an individual notification.
 * It is used within a MatSnackBar to display notification messages.
 */
@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit {
  /** Array to store notifications */
  notifications: NotificationDTO[] = [];

  /**
   * Creates an instance of NotificationComponent.
   * @param {any} data - Data passed to the component through MAT_SNACK_BAR_DATA
   * @param {MatSnackBarRef<NotificationComponent>} snackBarRef - Reference to the snackbar for closing it
   * @param {NotificationService} notificationService - Service to handle notification-related operations
   */
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: any,
    private readonly snackBarRef: MatSnackBarRef<NotificationComponent>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   * It subscribes to the notifications observable to update the notifications array.
   */
  ngOnInit(): void {
    this.notificationService.getNotifications().subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  /**
   * Closes the snackbar.
   */
  closeSnackBar(): void {
    this.snackBarRef.dismiss();
  }

  /**
   * Performs the action associated with the notification if one is provided.
   * After performing the action, it closes the snackbar.
   */
  performAction() {
    if (this.data.action) {
      this.data.action();
      this.closeSnackBar();
    }
  }
}
