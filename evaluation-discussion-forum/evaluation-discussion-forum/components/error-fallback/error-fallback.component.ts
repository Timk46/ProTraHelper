import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-error-fallback',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="error-fallback">
      <div class="error-content">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <button mat-raised-button color="primary" (click)="onRetry()" *ngIf="showRetry">
          <mat-icon>refresh</mat-icon>
          Erneut versuchen
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      background-color: #fff3e0;
      border: 1px solid #ffcc02;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .error-content {
      max-width: 400px;
    }

    .error-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: #ff9800;
      margin-bottom: 1rem;
    }

    h3 {
      color: #e65100;
      margin: 0 0 1rem 0;
    }

    p {
      color: #bf360c;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    button {
      margin-top: 1rem;
    }
  `]
})
export class ErrorFallbackComponent {
  @Input() title: string = 'Ein Fehler ist aufgetreten';
  @Input() message: string = 'Bitte versuchen Sie es später erneut oder laden Sie die Seite neu.';
  @Input() showRetry: boolean = true;

  onRetry(): void {
    // Emit retry event or reload page
    window.location.reload();
  }
}