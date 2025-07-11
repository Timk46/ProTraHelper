import { Component } from '@angular/core';
import type { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-privacy-consent-dialog',
  templateUrl: './privacy-consent-dialog.component.html',
  styleUrls: ['./privacy-consent-dialog.component.scss'],
  standalone: true, // Assuming standalone components are used, adjust if not
  imports: [MatDialogModule, MatButtonModule], // Import necessary Angular Material modules
})
export class PrivacyConsentDialogComponent {
  constructor(public dialogRef: MatDialogRef<PrivacyConsentDialogComponent>) {}

  /**
   * Called when the user clicks the "Ich stimme zu" button.
   * Closes the dialog and returns true to indicate agreement.
   */
  onAgree(): void {
    this.dialogRef.close(true); // Return true when agreed
  }

  /**
   * Called when the user clicks the "Abbrechen" or closes the dialog.
   * Closes the dialog and returns false (or undefined).
   */
  onCancel(): void {
    this.dialogRef.close(false); // Return false or simply close without value
  }
}
