import { Injectable } from '@angular/core';
import type { MatDialog } from '@angular/material/dialog';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { ConfirmationBoxComponent } from 'src/app/Pages/confirmation-box/confirmation-box.component';

interface ConfirmOptions {
  title?: string;
  message?: string;
  acceptLabel?: string;
  declineLabel?: string;
  swapButtons?: boolean;
  swapColors?: boolean;
  accept?: () => void;
  decline?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService {
  constructor(private readonly dialog: MatDialog) {}

  /**
   * Shows a confirmation dialog
   *
   * @example this.confirm({ title: "Attention!", message: "Are you sure?", accept: () => { console.log("confirmed"); }, decline: () => { console.log("declined"); } });
   * @param options
   */
  confirm(options: ConfirmOptions): Observable<boolean> {
    const resultSubject = new Subject<boolean>();
    const dialogRef = this.dialog.open(ConfirmationBoxComponent, {
      data: {
        title: options.title || 'Achtung!',
        message: options.message || 'Sind Sie sicher, dass Sie diese Aktion durchführen möchten?',
        decline: options.declineLabel || 'Abbrechen',
        accept: options.acceptLabel || 'Bestätigen',
        swapButtons: options.swapButtons || false,
        swapColors: options.swapColors || false,
      },
      autoFocus: false,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && typeof result === 'boolean') {
        resultSubject.next(result);
        if (result && options.accept) {
          options.accept();
        } else if (!result && options.decline) {
          options.decline();
        }
      } else {
        resultSubject.next(false);
        if (options.decline) {
          options.decline();
        }
      }
      resultSubject.complete();
    });
    return resultSubject.asObservable();
  }
}
