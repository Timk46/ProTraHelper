import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  MAT_DIALOG_DATA, 
  MatDialogModule, 
  MatDialogRef 
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/**
 * Dialog component that explains the voting mechanism to users
 * 
 * @description This component displays an informative dialog explaining how the 
 * voting system works, how points are calculated, and provides tips for effective voting.
 * It shows the user's current voting status and available actions.
 * 
 * @example
 * ```typescript
 * this.dialog.open(VotingMechanismDialogComponent, {
 *   width: '600px',
 *   maxWidth: '90vw',
 *   data: { currentVotes: 2, maxVotes: 5 }
 * });
 * ```
 */
@Component({
  selector: 'app-voting-mechanism-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatCardModule,
    MatProgressBarModule
  ],
  template: `
    <!-- Message Mode - Simple notification -->
    <div *ngIf="isMessageMode(); else explanationMode">
      <div class="dialog-header">
        <h1 mat-dialog-title>
          <mat-icon class="header-icon" [color]="getMessageIcon().color">{{ getMessageIcon().icon }}</mat-icon>
          {{ data.title }}
        </h1>
        <button mat-icon-button 
                mat-dialog-close
                class="close-button"
                aria-label="Dialog schließen">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content message-content">
        <p class="message-text">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-raised-button 
                mat-dialog-close
                color="primary">
          <mat-icon>check</mat-icon>
          OK
        </button>
      </mat-dialog-actions>
    </div>

    <!-- Explanation Mode - Full voting system explanation -->
    <ng-template #explanationMode>
      <div class="dialog-header">
        <h1 mat-dialog-title>
          <mat-icon class="header-icon">how_to_vote</mat-icon>
          Bewertungssystem erklärt
        </h1>
        <button mat-icon-button 
                mat-dialog-close
                class="close-button"
                aria-label="Dialog schließen">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <!-- Current Status Card -->
        <mat-card class="status-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>assignment_turned_in</mat-icon>
              Ihre aktuelle Situation
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="vote-status">
              <div class="vote-display">
                <span class="vote-count">{{ data.currentVotes }}/{{ data.maxVotes }}</span>
                <span class="vote-label">verfügbare Bewertungen</span>
              </div>
              <mat-progress-bar 
                mode="determinate" 
                [value]="getProgressPercentage()"
                class="progress-bar">
              </mat-progress-bar>
              <p class="status-text">
                Sie können noch <strong>{{ data.currentVotes }}</strong> 
                {{ data.currentVotes === 1 ? 'Kommentar bewerten' : 'Kommentare bewerten' }}.
              </p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- How it Works Section -->
        <div class="section">
          <h2>
            <mat-icon>help_outline</mat-icon>
            Wie funktioniert das Bewertungssystem?
          </h2>
          <mat-list class="explanation-list">
            <mat-list-item>
              <mat-icon matListItemIcon>thumb_up</mat-icon>
              <div matListItemTitle>Kommentare bewerten</div>
              <div matListItemLine>Sie können Kommentare anderer Teilnehmer mit einem Upvote bewerten</div>
            </mat-list-item>
            <mat-divider></mat-divider>
            <mat-list-item>
              <mat-icon matListItemIcon>numbers</mat-icon>
              <div matListItemTitle>Begrenztes Kontingent</div>
              <div matListItemLine>Die Anzahl Ihrer Bewertungen entspricht der Gesamtzahl der Kommentare</div>
            </mat-list-item>
            <mat-divider></mat-divider>
            <mat-list-item>
              <mat-icon matListItemIcon>lock</mat-icon>
              <div matListItemTitle>Endgültige Entscheidung</div>
              <div matListItemLine>Jeder Kommentar kann nur einmal bewertet werden - die Bewertung ist endgültig</div>
            </mat-list-item>
          </mat-list>
        </div>

        <mat-divider class="section-divider"></mat-divider>

        <!-- Point Calculation Section -->
        <div class="section">
          <h2>
            <mat-icon>calculate</mat-icon>
            Punkteberechnung
          </h2>
          <div class="point-explanation">
            <div class="point-item">
              <mat-icon class="point-icon upvote">thumb_up</mat-icon>
              <div class="point-details">
                <div class="point-action">Upvote vergeben</div>
                <div class="point-value">+1 Punkt für den Kommentar</div>
              </div>
            </div>
            <div class="point-item">
              <mat-icon class="point-icon neutral">remove</mat-icon>
              <div class="point-details">
                <div class="point-action">Keine Bewertung</div>
                <div class="point-value">0 Punkte</div>
              </div>
            </div>
          </div>
        </div>

        <mat-divider class="section-divider"></mat-divider>

        <!-- Why Limits Section -->
        <div class="section">
          <h2>
            <mat-icon>info</mat-icon>
            Warum gibt es ein Bewertungslimit?
          </h2>
          <mat-list class="benefits-list">
            <mat-list-item>
              <mat-icon matListItemIcon class="benefit-icon">psychology</mat-icon>
              <div matListItemTitle>Durchdachte Bewertungen</div>
              <div matListItemLine>Das Limit fördert sorgfältige Überlegung bei jeder Bewertung</div>
            </mat-list-item>
            <mat-divider></mat-divider>
            <mat-list-item>
              <mat-icon matListItemIcon class="benefit-icon">shield</mat-icon>
              <div matListItemTitle>Spam-Schutz</div>
              <div matListItemLine>Verhindert wahllose Bewertungen ohne Bezug zum Inhalt</div>
            </mat-list-item>
            <mat-divider></mat-divider>
            <mat-list-item>
              <mat-icon matListItemIcon class="benefit-icon">balance</mat-icon>
              <div matListItemTitle>Faire Punkteverteilung</div>
              <div matListItemLine>Sorgt für eine ausgewogene Bewertung aller Beiträge</div>
            </mat-list-item>
          </mat-list>
        </div>

        <mat-divider class="section-divider"></mat-divider>

        <!-- Tips Section -->
        <div class="section">
          <h2>
            <mat-icon>lightbulb</mat-icon>
            Tipps für effektive Bewertungen
          </h2>
          <div class="tips-container">
            <div class="tip-card">
              <mat-icon>visibility</mat-icon>
              <h3>Aufmerksam lesen</h3>
              <p>Lesen Sie Kommentare vollständig, bevor Sie bewerten</p>
            </div>
            <div class="tip-card">
              <mat-icon>star</mat-icon>
              <h3>Qualität bewerten</h3>
              <p>Bewerten Sie hilfreiche, konstruktive und gut begründete Beiträge</p>
            </div>
            <div class="tip-card">
              <mat-icon>refresh</mat-icon>
              <h3>Automatische Aktualisierung</h3>
              <p>Neue Kommentare erhöhen Ihr Bewertungslimit automatisch</p>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-raised-button 
                mat-dialog-close
                color="primary"
                class="understand-button">
          <mat-icon>check</mat-icon>
          Verstanden
        </button>
      </mat-dialog-actions>
    </ng-template>
  `,
  styleUrl: './voting-mechanism-dialog.component.scss'
})
export class VotingMechanismDialogComponent {
  /**
   * Creates an instance of VotingMechanismDialogComponent
   * 
   * @param dialogRef - Reference to the dialog instance
   * @param data - Data passed to the dialog containing current and max votes
   */
  constructor(
    public dialogRef: MatDialogRef<VotingMechanismDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      currentVotes?: number; 
      maxVotes?: number; 
      title?: string; 
      message?: string; 
      showCloseButton?: boolean 
    }
  ) {}

  /**
   * Determines if the dialog should show in message mode
   * 
   * @returns True if title and message are provided
   */
  isMessageMode(): boolean {
    return !!(this.data.title && this.data.message);
  }

  /**
   * Gets the appropriate icon and color for message mode
   * 
   * @returns Icon object with icon name and color
   */
  getMessageIcon(): { icon: string; color: string } {
    if (this.data.title?.includes('zurückgesetzt')) {
      return { icon: 'check_circle', color: 'primary' };
    } else if (this.data.title?.includes('Fehler')) {
      return { icon: 'error', color: 'warn' };
    }
    return { icon: 'info', color: 'primary' };
  }

  /**
   * Calculates the progress percentage for the progress bar
   * 
   * @returns Progress percentage (0-100)
   */
  getProgressPercentage(): number {
    if (!this.data.maxVotes || this.data.maxVotes === 0) return 0;
    const usedVotes = this.data.maxVotes - (this.data.currentVotes || 0);
    return (usedVotes / this.data.maxVotes) * 100;
  }
}