import { OnChanges, SimpleChanges } from '@angular/core';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-terminal-output',
  templateUrl: './terminal-output.component.html',
  styleUrls: ['./terminal-output.component.scss'],
})
export class TerminalOutputComponent implements OnChanges {
  @Input() output: string | null = null;
  @Input() isLoading: boolean = false;

  // Schriftgröße für Terminal-Output
  fontSizePercent: number = 90; // Standardgröße (90%)
  readonly MIN_FONT_SIZE: number = 70; // Minimale Schriftgröße (70%)
  readonly MAX_FONT_SIZE: number = 150; // Maximale Schriftgröße (150%)
  readonly FONT_SIZE_STEP: number = 10; // Schrittgröße der Änderung (10%)

  formattedOutput: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['output'] && this.output) {
      this.parseOutput(this.output);
    }
  }

  /**
   * Parst die Terminal-Ausgabe und fügt CSS-Klassen für Farbmarkierungen hinzu
   */
  private parseOutput(output: string): void {
    if (!output) {
      this.formattedOutput = ['Keine Ausgabe'];
      return;
    }

    // Teile den Output an Zeilenumbrüchen
    const lines = output.split('\n');

    // Formatiere jede Zeile
    this.formattedOutput = lines.map(line => {
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fehler')) {
        return `<span class="error">${line}</span>`;
      } else if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('warnung')) {
        return `<span class="warning">${line}</span>`;
      } else if (line.toLowerCase().includes('success') || line.toLowerCase().includes('erfolg')) {
        return `<span class="success">${line}</span>`;
      } else {
        return line;
      }
    });
  }

  /**
   * Kopiert den Terminal-Output in die Zwischenablage
   */
  copyOutput(): void {
    if (this.output) {
      navigator.clipboard
        .writeText(this.output)
        .then(() => console.log('Output copied to clipboard'))
        .catch(err => console.error('Could not copy text: ', err));
    }
  }

  /**
   * Vergrößert die Schriftgröße des Terminal-Outputs
   */
  increaseFontSize(): void {
    if (this.fontSizePercent < this.MAX_FONT_SIZE) {
      this.fontSizePercent += this.FONT_SIZE_STEP;
    }
  }

  /**
   * Verkleinert die Schriftgröße des Terminal-Outputs
   */
  decreaseFontSize(): void {
    if (this.fontSizePercent > this.MIN_FONT_SIZE) {
      this.fontSizePercent -= this.FONT_SIZE_STEP;
    }
  }
}
