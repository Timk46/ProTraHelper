import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface VoteLimitDialogData {
  maxVotes: number;
  commentCount: number;
  currentCategory?: string;
}

@Component({
  selector: 'app-vote-limit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="vote-limit-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">how_to_vote</mat-icon>
        Vote-Limit erreicht
      </h2>
      
      <mat-dialog-content class="dialog-content">
        <div class="limit-info">
          <p class="main-message">
            Sie haben alle <strong>{{ data.maxVotes }} verfügbaren Votes</strong> 
            für diese Kategorie vergeben.
          </p>
          
          <div class="calculation-explanation">
            <div class="calculation-row">
              <span class="label">Anzahl Kommentare:</span>
              <span class="value">{{ data.commentCount }}</span>
            </div>
            <div class="calculation-row">
              <span class="label">Votes pro Kommentar:</span>
              <span class="value">2</span>
            </div>
            <div class="calculation-row total">
              <span class="label">Gesamt verfügbare Votes:</span>
              <span class="value">{{ data.maxVotes }}</span>
            </div>
          </div>
          
          <p class="explanation">
            Das Voting-System gibt Ihnen <strong>2 Votes pro Kommentar</strong>, 
            um eine faire Bewertung aller Beiträge zu ermöglichen.
          </p>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button 
                (click)="onReset()" 
                class="reset-button">
          <mat-icon>refresh</mat-icon>
          Votes zurücksetzen
        </button>
        <button mat-raised-button 
                color="primary" 
                mat-dialog-close 
                class="ok-button">
          <mat-icon>check</mat-icon>
          Verstanden
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .vote-limit-dialog {
      padding: 8px;
      max-width: 500px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #1976d2;
      margin-bottom: 16px;
      
      .title-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .dialog-content {
      padding: 0 0 16px 0;
    }

    .limit-info {
      .main-message {
        font-size: 16px;
        margin-bottom: 20px;
        line-height: 1.5;
        
        strong {
          color: #1976d2;
        }
      }

      .calculation-explanation {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        border-left: 4px solid #1976d2;

        .calculation-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          
          &.total {
            border-top: 1px solid #ddd;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: 600;
            color: #1976d2;
          }
          
          .label {
            color: #666;
          }
          
          .value {
            font-weight: 500;
            color: #333;
          }
        }
      }

      .explanation {
        color: #666;
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
        
        strong {
          color: #1976d2;
        }
      }
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 0 8px 0;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .reset-button {
        color: #f57c00;
        border-color: #f57c00;
        
        &:hover {
          background-color: #fff3e0;
        }
      }

      .ok-button {
        background-color: #1976d2;
        
        &:hover {
          background-color: #1565c0;
        }
      }
    }
  `]
})
export class VoteLimitDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: VoteLimitDialogData,
    private dialogRef: MatDialogRef<VoteLimitDialogComponent>
  ) {}

  onReset(): void {
    this.dialogRef.close('reset');
  }
}