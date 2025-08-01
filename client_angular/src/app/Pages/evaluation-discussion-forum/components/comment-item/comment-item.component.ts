import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnChanges,
  SimpleChanges,
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
export class CommentItemComponent implements OnInit, OnChanges {
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

  // 🚀 PHASE 2.3: Cached computed properties for better template performance
  private _cachedUserVote: VoteType | null = null;
  private _cachedIsCurrentUser: boolean = false;
  private _cachedAuthorDisplayName: string = '';
  private _cachedDisplayContent: string = '';
  private _cachedFormattedContent: string = '';
  private _cachedUpvoteTooltip: string = '';
  private _cachedDownvoteTooltip: string = '';
  
  // Public getters for templates (avoid function calls)
  get cachedUserVote(): VoteType | null { return this._cachedUserVote; }
  get cachedIsCurrentUser(): boolean { return this._cachedIsCurrentUser; }
  get cachedAuthorDisplayName(): string { return this._cachedAuthorDisplayName; }
  get cachedFormattedContent(): string { return this._cachedFormattedContent; }
  get cachedUpvoteTooltip(): string { return this._cachedUpvoteTooltip; }
  get cachedDownvoteTooltip(): string { return this._cachedDownvoteTooltip; }

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(private cdr: ChangeDetectorRef) {}

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    this.formatCommentTime();
    // 🚀 PHASE 2.3: Initialize cached values for performance
    this.updateCachedValues();
    
    console.log('💬 Comment item initialized:', {
      commentId: this.comment.id,
      authorId: this.comment.author.id,
      authorType: this.comment.author.type,
      authorDisplayName: this.comment.author.displayName,
      anonymousUserId: this.anonymousUser?.id,
      isCurrentUser: this._cachedIsCurrentUser, // Use cached value
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 🚀 PHASE 2.3: Update cached values when inputs change
    if (changes['comment'] || changes['anonymousUser'] || changes['canVoteUp'] || changes['canVoteDown']) {
      this.updateCachedValues();
    }
    
    // 🚀 PHASE 1.3: Aggressive change detection for immediate UI updates
    if (changes['comment'] || changes['isVoting'] || changes['canVoteUp'] || changes['canVoteDown'] || changes['availableUpvotes'] || changes['availableDownvotes']) {
      console.log('🔄 Vote-related inputs changed, triggering change detection:', {
        commentId: this.comment?.id,
        hasCommentChanged: !!changes['comment'],
        hasVotingStateChanged: !!changes['isVoting'],
        hasVoteLimitsChanged: !!(changes['canVoteUp'] || changes['canVoteDown']),
        hasVoteCountsChanged: !!(changes['availableUpvotes'] || changes['availableDownvotes']),
        newVotingState: changes['isVoting']?.currentValue,
        previousVotingState: changes['isVoting']?.previousValue,
      });
      
      // 🚀 PHASE 1.3: Use detectChanges() for immediate update when voting state changes
      if (changes['isVoting'] && changes['isVoting'].currentValue !== changes['isVoting'].previousValue) {
        console.log('⚡ Voting state changed - forcing immediate detection');
        this.cdr.detectChanges();
      } else {
        // Trigger change detection for OnPush strategy
        this.cdr.markForCheck();
      }
    }
    
    // 🚀 PHASE 1.3: Also trigger on comment vote stats changes
    if (changes['comment'] && changes['comment'].currentValue && changes['comment'].previousValue) {
      const currentVoteStats = changes['comment'].currentValue.voteStats;
      const previousVoteStats = changes['comment'].previousValue.voteStats;
      
      if (currentVoteStats && previousVoteStats && 
          (currentVoteStats.upVotes !== previousVoteStats.upVotes || 
           currentVoteStats.downVotes !== previousVoteStats.downVotes)) {
        console.log('📊 Vote stats changed - forcing immediate update:', {
          commentId: this.comment.id,
          previousUpVotes: previousVoteStats.upVotes,
          currentUpVotes: currentVoteStats.upVotes,
          previousDownVotes: previousVoteStats.downVotes,
          currentDownVotes: currentVoteStats.downVotes,
        });
        this.cdr.detectChanges();
      }
    }
  }

  // =============================================================================
  // CACHED VALUE MANAGEMENT - 🚀 PHASE 2.3
  // =============================================================================

  /**
   * Updates all cached values to avoid repeated function calls in templates
   * Called on ngOnInit and when relevant inputs change
   */
  private updateCachedValues(): void {
    // Cache user vote (called multiple times in template)
    this._cachedUserVote = this.getUserVote();
    
    // Cache current user status (called multiple times)
    this._cachedIsCurrentUser = this.isCurrentUser();
    
    // Cache author display name
    this._cachedAuthorDisplayName = this.getAuthorDisplayName();
    
    // Cache display content and formatted content (complex chain)
    this._cachedDisplayContent = this.getDisplayContent();
    this._cachedFormattedContent = this.formatContent(this.sanitizeContent(this._cachedDisplayContent));
    
    // Cache tooltips (computed based on state)
    this._cachedUpvoteTooltip = this.getUpvoteTooltip();
    this._cachedDownvoteTooltip = this.getDownvoteTooltip();
    
    console.log('🚀 Cached values updated for performance:', {
      commentId: this.comment?.id,
      userVote: this._cachedUserVote,
      isCurrentUser: this._cachedIsCurrentUser,
      authorDisplayName: this._cachedAuthorDisplayName,
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
    if (!this.anonymousUser || !this.comment?.author) {
      return false;
    }

    // Simple numeric comparison - convert both to numbers for consistency
    const commentAuthorId = Number(this.comment.author.id);
    const anonymousUserId = Number(this.anonymousUser.id);

    return commentAuthorId === anonymousUserId;
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
    if (this.isCurrentUser()) {
      return 'Sie können nicht für Ihren eigenen Kommentar stimmen.';
    }
    if (this.getUserVote() === 'UP') {
      return 'Positive Bewertung entfernen';
    }
    if (!this.canVoteUp) {
      return 'Keine positiven Bewertungen mehr verfügbar';
    }
    return 'Positiv bewerten';
  }

  /**
   * Gets tooltip text for downvote button
   * @returns string The tooltip text
   */
  getDownvoteTooltip(): string {
    if (this.isCurrentUser()) {
      return 'Sie können nicht für Ihren eigenen Kommentar stimmen.';
    }
    if (this.getUserVote() === 'DOWN') {
      return 'Negative Bewertung entfernen';
    }
    if (!this.canVoteDown) {
      return 'Keine negativen Bewertungen mehr verfügbar';
    }
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
