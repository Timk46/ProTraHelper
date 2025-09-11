import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// DTOs
import { VoteType } from '@DTOs/index';

@Component({
  selector: 'app-vote-box',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatRippleModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './vote-box.component.html',
  styleUrl: './vote-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoteBoxComponent {

  // =============================================================================
  // TEMPLATE UTILITIES
  // =============================================================================

  protected readonly Math = Math;

  // =============================================================================
  // INPUTS - DATA FROM PARENT COMPONENT
  // =============================================================================

  @Input() upvotes: number = 0; // Ranking system: only positive votes
  @Input() userVote: VoteType | null = null;
  @Input() canVote: boolean = true;
  @Input() isVoting: boolean = false;
  @Input() compactMode: boolean = false;
  @Input() showCounts: boolean = true;
  @Input() orientation: 'vertical' | 'horizontal' = 'horizontal';

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT COMPONENT
  // =============================================================================

  @Output() voted = new EventEmitter<VoteType>();

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  onUpvote(): void {
    if (!this.canVote || this.isVoting) {
      return;
    }

    // Toggle upvote: if already upvoted, remove vote; otherwise upvote
    const newVote: VoteType = this.userVote === 'UP' ? null : 'UP';
    this.voted.emit(newVote);
  }


  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================

  /**
   * Gets the upvote button state class (HTML Template Style)
   */
  getUpvoteButtonClass(): string {
    if (this.userVote === 'UP') {
      return 'voted';
    }
    return '';
  }


  /**
   * Gets the upvote button color
   */
  getUpvoteButtonColor(): string {
    return this.userVote === 'UP' ? 'primary' : '';
  }


  /**
   * Gets the upvote icon name
   */
  getUpvoteIcon(): string {
    return this.userVote === 'UP' ? 'thumb_up' : 'thumb_up_off_alt';
  }


  /**
   * Gets the upvote tooltip text
   */
  getUpvoteTooltip(): string {
    if (!this.canVote) {
      return 'Bewertung nicht möglich';
    }
    if (this.userVote === 'UP') {
      return 'Positive Bewertung entfernen';
    }
    return 'Positiv bewerten';
  }


  /**
   * Gets the vote score (ranking system: upvotes only)
   */
  getNetScore(): number {
    return this.upvotes;
  }

  /**
   * Gets the total vote count (ranking system: upvotes only)
   */
  getTotalVotes(): number {
    return this.upvotes;
  }

  /**
   * Gets the vote ratio (ranking system: always 1 for positive votes)
   */
  getVoteRatio(): number {
    return this.upvotes > 0 ? 1 : 0;
  }

  /**
   * Checks if the comment has any votes
   */
  hasVotes(): boolean {
    return this.getTotalVotes() > 0;
  }

  /**
   * Gets the accessibility label for upvote button
   */
  getUpvoteAriaLabel(): string {
    const currentState = this.userVote === 'UP' ? 'Bereits bewertet' : 'Nicht bewertet';
    const action = this.userVote === 'UP' ? 'Bewertung entfernen' : 'Bewerten';
    return `${currentState}. ${action}. Aktuelle Bewertungen: ${this.upvotes}`;
  }


  /**
   * Gets the button size based on compact mode
   */
  getButtonSize(): string {
    return this.compactMode ? 'small' : 'medium';
  }

  /**
   * Gets the icon size based on compact mode
   */
  getIconSize(): string {
    return this.compactMode ? '18px' : '20px';
  }

  /**
   * Gets the count font size based on compact mode
   */
  getCountFontSize(): string {
    return this.compactMode ? '11px' : '12px';
  }

  /**
   * Checks if buttons should be disabled
   */
  isDisabled(): boolean {
    return !this.canVote || this.isVoting;
  }

  /**
   * Gets the container class (simplified for HTML template style)
   */
  getContainerClass(): string {
    const classes: string[] = [];

    if (this.isVoting) {
      classes.push('voting');
    }

    return classes.join(' ');
  }

  /**
   * Formats vote count for display
   */
  formatVoteCount(count: number): string {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  }

  /**
   * Gets the popularity indicator class
   */
  getPopularityClass(): string {
    const ratio = this.getVoteRatio();
    const total = this.getTotalVotes();

    if (total < 3) {
      return ''; // Not enough votes to determine popularity
    }

    if (ratio >= 0.8) {
      return 'very-popular';
    } else if (ratio >= 0.6) {
      return 'popular';
    } else if (ratio <= 0.2) {
      return 'unpopular';
    } else if (ratio <= 0.4) {
      return 'somewhat-unpopular';
    }

    return 'neutral';
  }
}
