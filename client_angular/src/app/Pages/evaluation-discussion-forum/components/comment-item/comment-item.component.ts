import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

// Angular Material Imports (reduced set for chat bubbles)
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// DTOs
import { EvaluationCommentDTO, AnonymousEvaluationUserDTO, VoteType } from '@DTOs/index';

// Utils

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [CommonModule, DatePipe, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './comment-item.component.html',
  styleUrl: './comment-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentItemComponent implements OnInit {
  // =============================================================================
  // INPUTS - DATA FROM PARENT COMPONENT
  // =============================================================================

  @Input() comment!: EvaluationCommentDTO;
  @Input() anonymousUser: AnonymousEvaluationUserDTO | null = null;
  @Input() canVote: boolean = true;
  @Input() canVoteUp: boolean = true;
  @Input() canVoteDown: boolean = true;
  @Input() availableUpvotes: number = 3;
  @Input() availableDownvotes: number = 3;
  @Input() isVoting: boolean = false;
  @Input() depth: number = 0;
  @Input() isReadOnly: boolean = false;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT COMPONENT
  // =============================================================================

  @Output() voted = new EventEmitter<{ commentId: string; voteType: VoteType }>();
  @Output() replyRequested = new EventEmitter<string>();

  // =============================================================================
  // COMPONENT STATE
  // =============================================================================

  formattedTime: string = '';
  isContentExpanded: boolean = false;
  readonly maxContentLength = 300;

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    this.formatCommentTime();
    console.log('💬 Comment item initialized:', {
      commentId: this.comment.id,
      authorId: this.comment.author.id,
      authorType: this.comment.author.type,
      authorDisplayName: this.comment.author.displayName,
      anonymousUserId: this.anonymousUser?.id,
      isCurrentUser: this.isCurrentUser(),
    });
  }

  // =============================================================================
  // TIME FORMATTING
  // =============================================================================

  private formatCommentTime(): void {
    const now = new Date();
    const commentDate = new Date(this.comment.createdAt);
    const diffMs = now.getTime() - commentDate.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMinutes < 1) {
      this.formattedTime = 'gerade eben';
    } else if (diffMinutes < 60) {
      this.formattedTime = `vor ${diffMinutes} Minute${diffMinutes !== 1 ? 'n' : ''}`;
    } else if (diffHours < 24) {
      this.formattedTime = `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
    } else if (diffDays < 7) {
      this.formattedTime = `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
    } else if (diffWeeks < 4) {
      this.formattedTime = `vor ${diffWeeks} Woche${diffWeeks !== 1 ? 'n' : ''}`;
    } else if (diffMonths < 12) {
      this.formattedTime = `vor ${diffMonths} Monat${diffMonths !== 1 ? 'en' : ''}`;
    } else {
      // Fallback to date format for very old comments
      this.formattedTime = commentDate.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  onVote(voteType: VoteType): void {
    if (!this.canVote || this.isVoting) {
      return;
    }

    this.voted.emit({
      commentId: this.comment.id,
      voteType: voteType,
    });
  }

  onReply(): void {
    this.replyRequested.emit(this.comment.id);
  }

  onToggleContent(): void {
    this.isContentExpanded = !this.isContentExpanded;
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================

  /**
   * Gets the display name for the comment author
   */
  getAuthorDisplayName(): string {
    if (this.comment.author.type === 'anonymous') {
      return this.comment.author.displayName;
    } else {
      // For registered users (future enhancement)
      return `${this.comment.author.displayName}`;
    }
  }

  /**
   * Gets the color code for the author (for anonymous users)
   */
  getAuthorColorCode(): string {
    if (this.comment.author.type === 'anonymous' && this.comment.author.colorCode) {
      return this.comment.author.colorCode;
    }
    return '#666'; // Default color for registered users
  }

  /**
   * Checks if the comment author is the current user
   * Includes graceful error handling for missing anonymous user data
   */
  isCurrentUser(): boolean {
    // Graceful handling of missing data
    if (!this.anonymousUser || !this.comment?.author || this.comment.author.type !== 'anonymous') {
      return false;
    }

    try {
      // Robust type conversion for both IDs
      const commentAuthorId = this.comment.author.id;
      const anonymousUserId = this.anonymousUser.id;

      // Handle null/undefined values gracefully
      if (commentAuthorId == null || anonymousUserId == null) {
        console.warn('🔍 isCurrentUser() Missing ID values:', {
          commentAuthorId,
          anonymousUserId,
        });
        return false;
      }

      // Try multiple comparison strategies to handle potential type inconsistencies
      const numericComparison = Number(commentAuthorId) === Number(anonymousUserId);
      const stringComparison = String(commentAuthorId) === String(anonymousUserId);

      // Debug logging for development mode only
      const isMatch = numericComparison || stringComparison;
      console.log('🔍 isCurrentUser() Debug:', {
        commentAuthorId,
        commentAuthorIdType: typeof commentAuthorId,
        anonymousUserId,
        anonymousUserIdType: typeof anonymousUserId,
        numericComparison,
        stringComparison,
        finalResult: isMatch,
      });

      return isMatch;
    } catch (error) {
      console.error('❌ Error in isCurrentUser():', error);
      return false; // Fail safe - assume not current user on error
    }
  }

  /**
   * Gets the comment content (potentially truncated)
   */
  getDisplayContent(): string {
    if (this.isContentExpanded || this.comment.content.length <= this.maxContentLength) {
      return this.comment.content;
    }
    return this.comment.content.substring(0, this.maxContentLength) + '...';
  }

  /**
   * Checks if content should show expand/collapse button
   */
  shouldShowToggleButton(): boolean {
    return this.comment.content.length > this.maxContentLength;
  }

  /**
   * Gets the toggle button text
   */
  getToggleButtonText(): string {
    return this.isContentExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen';
  }

  /**
   * Gets the vote score (net votes)
   */
  getVoteScore(): number {
    return this.comment.voteStats.upVotes - this.comment.voteStats.downVotes;
  }

  /**
   * Gets the vote score color class
   */
  getVoteScoreClass(): string {
    const score = this.getVoteScore();
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Gets tooltip text for the author chip
   */
  getAuthorTooltip(): string {
    if (this.isCurrentUser()) {
      return 'Ihr Kommentar';
    }
    return `Kommentar von ${this.getAuthorDisplayName()}`;
  }

  /**
   * Gets tooltip text for the vote score
   */
  getVoteScoreTooltip(): string {
    const upvotes = this.comment.voteStats.upVotes;
    const downvotes = this.comment.voteStats.downVotes;
    return `${upvotes} positive, ${downvotes} negative Bewertungen`;
  }

  /**
   * Gets the reply count display text
   */
  getReplyCountText(): string {
    const count = this.comment.replyCount;
    if (count === 0) return '';
    if (count === 1) return '1 Antwort';
    return `${count} Antworten`;
  }

  /**
   * Checks if comment has replies
   */
  hasReplies(): boolean {
    return this.comment.replyCount > 0;
  }

  /**
   * Gets the depth-based styling
   */
  getDepthClass(): string {
    if (this.depth <= 0) return 'depth-0';
    if (this.depth === 1) return 'depth-1';
    if (this.depth === 2) return 'depth-2';
    return 'depth-max';
  }

  /**
   * Formats content with line breaks
   */
  formatContent(content: string): string {
    return content.replace(/\n/g, '<br>');
  }

  /**
   * Gets the user vote from the votes array
   * @returns VoteType The user's vote type or null if no vote exists
   */
  getUserVote(): VoteType {
    if (!this.anonymousUser) return null;

    // Fix: vote.userId is number, anonymousUser.id is number
    // Ensure both are compared as numbers
    const userVote = this.comment.votes.find(
      (vote: any) => vote.userId === Number(this.anonymousUser!.id),
    );

    return userVote ? userVote.voteType : null;
  }

  /**
   * Gets the user vote icon
   * @returns string The icon name for the user's vote
   */
  getUserVoteIcon(): string {
    const userVote = this.getUserVote();
    if (!userVote) return '';

    switch (userVote) {
      case 'UP':
        return 'thumb_up';
      case 'DOWN':
        return 'thumb_down';
      default:
        return '';
    }
  }

  /**
   * Gets the user vote color
   * @returns string The color code for the user's vote
   */
  getUserVoteColor(): string {
    const userVote = this.getUserVote();
    if (!userVote) return '#666';

    switch (userVote) {
      case 'UP':
        return '#4caf50';
      case 'DOWN':
        return '#f44336';
      default:
        return '#666';
    }
  }

  /**
   * Checks if user has voted
   * @returns boolean True if the user has voted, false otherwise
   */
  hasUserVoted(): boolean {
    const userVote = this.getUserVote();
    return userVote !== null;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Gets tooltip text for upvote button
   * @returns string The tooltip text
   */
  getUpvoteTooltip(): string {
    if (this.getUserVote() === 'UP') return 'Positive Bewertung entfernen';
    if (!this.canVoteUp) return 'Keine positiven Bewertungen mehr verfügbar';
    return 'Positiv bewerten';
  }

  /**
   * Gets tooltip text for downvote button
   * @returns string The tooltip text
   */
  getDownvoteTooltip(): string {
    if (this.getUserVote() === 'DOWN') return 'Negative Bewertung entfernen';
    if (!this.canVoteDown) return 'Keine negativen Bewertungen mehr verfügbar';
    return 'Negativ bewerten';
  }

  /**
   * Sanitizes HTML content for safe display
   */
  sanitizeContent(content: string): string {
    // Basic HTML sanitization - in production, use a proper sanitizer
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
