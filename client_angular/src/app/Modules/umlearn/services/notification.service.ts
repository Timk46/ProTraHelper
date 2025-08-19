import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import { INotification } from '../pages/notification/notification.models';
import { NotificationType } from '../pages/notification/notification.models';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationComponent } from '../pages/confirmation/confirmation.component';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  /*
    USEFUL INFORMATION:
    If we want to show a notification in a component, we need to inject the NotificationService in its constructor.
    Then, we can call the notification service's methods to show a notification.
    Example: this.notificationService.success("Success message", 1000);
    This shows a success notification for 1 second, then it disappears. The default duration is 3 seconds so this parameter is optional.
  */

  constructor(private readonly dialog: MatDialog) {}

  private readonly notification$: Subject<INotification> = new BehaviorSubject<INotification>({
    message: '',
    type: NotificationType.Info,
    duration: 0,
  });
  private readonly defaultDuration: number = 3000;

  /**
   * Shows a success notification
   * @param message
   * @param duration
   */
  success(message: string, duration: number = this.defaultDuration) {
    this.notify(message, NotificationType.Success, duration);
  }

  /**
   * Shows a warning notification
   * @param message
   * @param duration
   */
  warning(message: string, duration: number = this.defaultDuration) {
    this.notify(message, NotificationType.Warning, duration);
  }

  /**
   * Shows an error notification
   * @param message
   * @param duration
   */
  error(message: string, duration: number = this.defaultDuration) {
    this.notify(message, NotificationType.Error, duration);
  }

  /**
   * Shows an info notification
   * @param message
   * @param duration
   */
  info(message: string, duration: number = this.defaultDuration) {
    this.notify(message, NotificationType.Info, duration);
  }

  /**
   * Shows a confirmation dialog
   * @param message
   */
  confirm(
    title: string = 'Achtung!',
    message: string = 'Sind Sie sicher, dass Sie diese Aktion durchführen möchten?',
    decline: string = 'Abbrechen',
    accept: string = 'Bestätigen',
  ): Observable<boolean> {
    const resultSubject = new Subject<boolean>();
    const dialogRef = this.dialog.open(ConfirmationComponent, {
      data: { title, message, decline, accept },
      autoFocus: false,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && typeof result === 'boolean') {
        resultSubject.next(result);
      } else {
        resultSubject.next(false);
      }
      resultSubject.complete();
    });
    return resultSubject.asObservable();
  }

  /**
   * Shows a notification by passing the message, type and duration
   * @param message
   * @param type
   * @param duration
   */
  private notify(message: string, type: NotificationType, duration: number) {
    this.notification$.next({ message, type, duration } as INotification);
  }

  /**
   * Returns the notification as an observable
   */
  get notification() {
    return this.notification$.asObservable();
  }
}
