import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TestResult } from '../../../models/code-submission.model';

@Component({
  selector: 'app-test-details-dialog',
  templateUrl: './test-details-dialog.component.html',
  styleUrls: ['./test-details-dialog.component.scss']
})
export class TestDetailsDialogComponent {
  showStack: boolean = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: TestResult) {}

  /**
   * Wechselt die Anzeige des Stacktraces
   */
  toggleStack(): void {
    this.showStack = !this.showStack;
  }

  /**
   * Prüft, ob ein Exception-Stacktrace vorhanden ist
   */
  hasException(): boolean {
    return !!this.data.exception && this.data.exception.trim().length > 0;
  }
}
