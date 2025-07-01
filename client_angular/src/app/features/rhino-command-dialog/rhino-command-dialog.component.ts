import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface RhinoCommandDialogData {
  fileName: string;
  filePath: string;
  commandSequence: string;
  commandSteps: Array<{
    step: number;
    command: string;
    description: string;
  }>;
}

/**
 * Dialog component for displaying Rhino command sequence
 * Provides copy-to-clipboard functionality and step-by-step instructions
 */
@Component({
  selector: 'app-rhino-command-dialog',
  templateUrl: './rhino-command-dialog.component.html',
  styleUrls: ['./rhino-command-dialog.component.scss']
})
export class RhinoCommandDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<RhinoCommandDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RhinoCommandDialogData,
    private snackBar: MatSnackBar
  ) { }

  /**
   * Kopiert die komplette Befehlssequenz in die Zwischenablage
   */
  copyFullCommand(): void {
    this.copyToClipboard(this.data.commandSequence);
  }

  /**
   * Kopiert einen einzelnen Befehl in die Zwischenablage
   * @param command - Der zu kopierende Befehl
   */
  copyStepCommand(command: string): void {
    this.copyToClipboard(command);
  }

  /**
   * Kopiert den übergebenen Text in die Zwischenablage
   * @param text - Der zu kopierende Text
   */
  private copyToClipboard(text: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      // Moderne Clipboard API (HTTPS erforderlich)
      navigator.clipboard.writeText(text).then(() => {
        this.snackBar.open('In Zwischenablage kopiert!', 'OK', {
          duration: 2000,
          panelClass: 'success-snackbar'
        });
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      // Fallback für ältere Browser oder HTTP
      this.fallbackCopyToClipboard(text);
    }
  }

  /**
   * Fallback-Methode für das Kopieren in die Zwischenablage
   * @param text - Der zu kopierende Text
   */
  private fallbackCopyToClipboard(text: string): void {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        this.snackBar.open('In Zwischenablage kopiert!', 'OK', {
          duration: 2000,
          panelClass: 'success-snackbar'
        });
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      this.snackBar.open('Fehler beim Kopieren in die Zwischenablage', 'Schließen', {
        duration: 3000,
        panelClass: 'error-snackbar'
      });
      console.error('Failed to copy text: ', err);
    }
  }

  /**
   * Schließt den Dialog und markiert als abgeschlossen
   */
  onComplete(): void {
    this.dialogRef.close({ completed: true });
  }

  /**
   * Schließt den Dialog ohne Aktion
   */
  onCancel(): void {
    this.dialogRef.close({ completed: false });
  }

  /**
   * TrackBy-Funktion für *ngFor-Performance-Optimierung
   * @param index - Index des Elements
   * @param step - Step-Objekt
   * @returns Eindeutige Identifikation für das Element
   */
  trackByStep(index: number, step: any): number {
    return step.step || index;
  }
}
