import { OnDestroy } from '@angular/core';
import { Component, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TinymceComponent } from '../../tinymce/tinymce.component';
import { NotificationService } from '@UMLearnServices/notification.service';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-task-description-popup',
  templateUrl: './task-description-popup.component.html',
  styleUrls: ['./task-description-popup.component.scss'],
})
export class TaskDescriptionPopupComponent implements OnDestroy {
  private readonly subscriptions: Subscription[] = []; // Array to store subscriptions to unsubscribe later

  taskDescription: string;
  taskTitle: string;

  tinyMceConfig: any = {
    plugins: 'autoresize lists table link image code codesample',
    toolbar:
      'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
    min_height: window.innerHeight * 0.6,
    max_height: window.innerHeight * 0.6,
    menubar: false,
    statusbar: false,
    resize: false,
  };

  constructor(
    public dialogRef: MatDialogRef<TaskDescriptionPopupComponent>,
    private readonly notification: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data: { description: string; taskTitle: string },
  ) {
    this.taskDescription = data.description;
    this.taskTitle = data.taskTitle;
  }

  /**
   * Closes the dialog and passes the content of the Tinymce editor to the dialogRef.
   * @param tinymceEditor - The TinymceComponent instance.
   */
  onAccept(tinymceEditor: TinymceComponent): void {
    this.dialogRef.close(tinymceEditor.getContent());
  }

  /**
   * Logs the content of the TinymceComponent instance to the console.
   *
   * @param instance - The TinymceComponent instance.
   */
  onContent(instance: TinymceComponent): void {
    console.log(instance.getContent());
  }

  /**
   * Cancels the edit of the description.
   *
   * @remarks
   * This method displays a confirmation dialog to the user, asking if they want to cancel the edit of the description. If the user confirms, the dialog is closed.
   *
   * @returns void
   */
  onCancel(): void {
    const confirmSubscription = this.notification
      .confirm('Bearbeitung abbrechen?', 'Alle Änderungen gehen verloren.', 'Nein', 'Ja, abbrechen')
      .subscribe(confirmed => {
        if (confirmed) {
          this.dialogRef.close();
        }
      });
    this.subscriptions.push(confirmSubscription);
  }

  /**
   * Called when the component is about to be destroyed.
   * Unsubscribes from all subscriptions to prevent memory leaks.
   *
   * @memberof CourseEditComponent
   * @public
   * @returns {void}
   */
  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}
