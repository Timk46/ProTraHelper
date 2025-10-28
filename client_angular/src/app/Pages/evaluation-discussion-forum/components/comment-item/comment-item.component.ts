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
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Inject,
} from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, takeUntil, Subject, filter, retry, catchError, of, timer, Observable } from 'rxjs';

// Angular Material Imports (reduced set for chat bubbles)
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

// Services (only UI-related services - business logic handled by parent)
import { CommentPanelStateService } from '../../../../Services/evaluation/comment-panel-state.service';
import { EvaluationStateService } from '../../../../Services/evaluation/evaluation-state.service';
import { VoteSessionService } from '../../../../Services/evaluation/vote-session.service';
import { CommentVoteManagerService } from '../../../../Services/evaluation/comment-vote-manager.service';
import { MatDialog } from '@angular/material/dialog';
import { VoteLimitDialogComponent, VoteLimitDialogData } from '../vote-limit-dialog/vote-limit-dialog.component';

// DTOs
import { EvaluationCommentDTO, AnonymousEvaluationUserDTO, VoteType, VoteLimitResponseDTO } from '@DTOs/index';

// Utils

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './comment-item.component.html',
  styleUrl: './comment-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentItemComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  // =============================================================================
  // INPUTS - DATA FROM PARENT COMPONENT
  // =============================================================================

  @Input() comment!: EvaluationCommentDTO;
  @Input() anonymousUser: AnonymousEvaluationUserDTO | null = null;
  @Input() canVote: boolean = true; // Simplified for ranking system
  @Input() availableVotes: number = 3; // Single vote counter for ranking
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

  // Cached computed properties for better template performance
  private _cachedUserVote: VoteType | null = null;
  private _cachedIsCurrentUser: boolean | null = null;
  private _cachedAuthorDisplayName: string = '';
  private _cachedDisplayContent: string = '';
  private _cachedFormattedContent: string = '';
  private _cachedUpvoteTooltip: string = '';

  private destroy$ = new Subject<void>();

  // Panel state
  isPanelExpanded: boolean = false;

  // Vote state from VoteManagerService
  userVoteStatus$!: Observable<VoteType | null>;
  userVoteLoading$!: Observable<boolean>;
  localVoteCount$!: Observable<number>;

  // Track actual number of votes given to this comment
  private localVoteCount: number = 0;

  // Track pending operations synchronously for canAddMoreVotes()
  private hasPendingOperations: boolean = false;

  // Public getters for templates (avoid function calls)
  get cachedUserVote(): VoteType | null { return this._cachedUserVote; }
  get cachedIsCurrentUser(): boolean | null { return this._cachedIsCurrentUser; }
  get cachedAuthorDisplayName(): string { return this._cachedAuthorDisplayName; }
  get cachedFormattedContent(): string { return this._cachedFormattedContent; }
  get cachedUpvoteTooltip(): string { return this._cachedUpvoteTooltip; }
  
  // 🚨 CRITICAL SECURITY: Block voting if ownership unknown or if user owns comment
  get canVoteOnComment(): boolean { 
    if (this._cachedIsCurrentUser === null) return false; // Block when unknown state
    return !this._cachedIsCurrentUser && this.canVote;
  }

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private cdr: ChangeDetectorRef,
    private commentPanelStateService: CommentPanelStateService,
    private evaluationStateService: EvaluationStateService,
    private voteSessionService: VoteSessionService,
    private voteManagerService: CommentVoteManagerService,
    private dialog: MatDialog,
  ) {}

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    // Only set cachedIsCurrentUser if anonymousUser is available
    if (this.anonymousUser && this.comment?.author) {
      this._cachedIsCurrentUser = this.isCurrentUser();
    } else {
      this._cachedIsCurrentUser = null; // Unknown state
    }

    this.formatCommentTime();
    this.updateCachedValues();

    // Initialize VoteManagerService
    this.voteManagerService.initializeComment(
      this.comment.id.toString(),
      this.comment,
      this.anonymousUser?.id
    );
    this.voteManagerService.incrementRefCount(this.comment.id.toString());

    // Get observables from service
    this.userVoteStatus$ = this.voteManagerService.getVoteStatus$(this.comment.id.toString());
    this.userVoteLoading$ = this.voteManagerService.getLoadingState$(this.comment.id.toString());
    this.localVoteCount$ = this.voteManagerService.getLocalVoteCount$(this.comment.id.toString());

    // Subscribe to localVoteCount$ for backward compatibility
    this.localVoteCount$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.localVoteCount = count;
      this.cdr.markForCheck();
    });

    // Subscribe to hasPendingOperations$ for synchronous access in canAddMoreVotes()
    this.voteManagerService.hasPendingOperations$(this.comment.id.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe(pending => {
        this.hasPendingOperations = pending;
        this.cdr.markForCheck();
      });

    // Initialize panel state
    this.initializePanelState();
  }

  ngAfterViewInit(): void {
    // ViewChild references are now available
  }

  ngOnDestroy(): void {
    this.voteManagerService.decrementRefCount(this.comment.id.toString());
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update cachedIsCurrentUser when anonymousUser changes
    if (changes['anonymousUser'] || changes['comment']) {
      const wasUnknown = this._cachedIsCurrentUser === null;

      if (this.anonymousUser && this.comment?.author) {
        this._cachedIsCurrentUser = this.isCurrentUser();

        if (wasUnknown) {
          this.cdr.detectChanges(); // Force UI update
        }
      } else {
        this._cachedIsCurrentUser = null;
      }
    }

    // Update cached values when inputs change
    if (changes['comment'] || changes['anonymousUser'] || changes['canVote'] || changes['availableVotes']) {
      this.updateCachedValues();
    }

    // Reset session votes when availableVotes changes from parent
    if (changes['availableVotes'] && !changes['availableVotes'].firstChange) {
      const currentValue = changes['availableVotes'].currentValue;
      const previousValue = changes['availableVotes'].previousValue;

      // Reset session votes when parent state updates (indicates backend sync)
      if (currentValue !== previousValue) {
        // Note: Session votes are now handled globally and don't reset per component
        this.cdr.detectChanges();
      }
    }

    // Aggressive change detection for immediate UI updates
    if (changes['comment'] || changes['isVoting'] || changes['canVote'] || changes['availableVotes']) {
      if (changes['isVoting'] && changes['isVoting'].currentValue !== changes['isVoting'].previousValue) {
        this.cdr.detectChanges();
      } else {
        this.cdr.detectChanges();
      }
    }

    // Also trigger on comment vote stats changes
    if (changes['comment'] && changes['comment'].currentValue && changes['comment'].previousValue) {
      const currentVoteStats = changes['comment'].currentValue.voteStats;
      const previousVoteStats = changes['comment'].previousValue.voteStats;

      if (currentVoteStats && previousVoteStats &&
          (currentVoteStats.upVotes !== previousVoteStats.upVotes)) {
        this.cdr.detectChanges();
      }
    }
  }

  // =============================================================================
  // CACHED VALUE MANAGEMENT
  // =============================================================================

  /**
   * Updates all cached values to avoid repeated function calls in templates.
   * Called on ngOnInit and when relevant inputs change.
   */
  private updateCachedValues(): void {
    this._cachedAuthorDisplayName = this.getAuthorDisplayName();
    this._cachedDisplayContent = this.getDisplayContent();
    this._cachedFormattedContent = this.formatContent(this.sanitizeContent(this._cachedDisplayContent));
    this._cachedUpvoteTooltip = this.getUpvoteTooltip();
  }

  // =============================================================================
  // PANEL STATE MANAGEMENT
  // =============================================================================

  /**
   * Initializes the panel expansion state from the service
   */
  private initializePanelState(): void {
    // Subscribe to panel state changes for this comment
    this.commentPanelStateService.getPanelState(this.comment.id.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe(isExpanded => {
        this.isPanelExpanded = isExpanded;
        this.cdr.detectChanges();
      });

    // Set initial state (default to collapsed for comments with replies)
    this.isPanelExpanded = this.commentPanelStateService.isPanelExpanded(this.comment.id.toString());
  }

  /**
   * Toggles the panel expansion state
   */
  onTogglePanel(): void {
    if (!this.hasReplies()) {
      return; // Don't toggle if no replies
    }

    this.triggerHapticFeedback('light');
    const newState = this.commentPanelStateService.togglePanelState(this.comment.id.toString());

    // The panel state will be updated via the subscription in initializePanelState
    // No need to manually update isPanelExpanded here
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

  /**
   * Adds a vote using VoteManagerService.
   * Service handles atomic locking, race prevention, and security checks.
   */
  async addVote(): Promise<void> {
    // Check ownership FIRST
    if (this._cachedIsCurrentUser === true) {
      console.error('🚨 SECURITY VIOLATION: Attempted self-vote blocked!', {
        commentId: this.comment.id,
        userId: this.anonymousUser?.id,
        authorId: this.comment.author?.id
      });
      return;
    }

    if (this._cachedIsCurrentUser === null) {
      console.warn('⏳ User ownership unknown, blocking vote until determined');
      return;
    }

    // Additional safety checks
    if (!this.canVoteOnComment || this.isVoting) {
      return;
    }

    // Check vote limits
    if (!this.canAddMoreVotes()) {
      this.showVoteLimitWarning();
      return;
    }

    this.triggerHapticFeedback('light');

    const result = await this.voteManagerService.addVote(
      this.comment.id.toString(),
      this.anonymousUser!.id,
      this.comment.submissionId,
      this.comment.categoryId || 0
    );

    if (!result.success) {
      console.error('❌ Vote operation failed:', result.error);
      // Show error to user
      return;
    }

    this.triggerVoteSuccessAnimation();
    this.triggerHapticFeedback('medium');
  }

  /**
   * Removes a vote using VoteManagerService.
   * Service handles atomic locking and race prevention.
   */
  async removeVote(): Promise<void> {
    // Check ownership FIRST (even for removal)
    if (this._cachedIsCurrentUser === true) {
      console.error('🚨 SECURITY VIOLATION: Attempted self-vote removal blocked!', {
        commentId: this.comment.id,
        userId: this.anonymousUser?.id,
        authorId: this.comment.author?.id
      });
      return;
    }

    if (this._cachedIsCurrentUser === null) {
      console.warn('⏳ User ownership unknown, blocking vote removal until determined');
      return;
    }

    // Check if user has votes to remove
    if (this.getUserVoteCount() === 0) {
      return;
    }

    // Additional safety checks (but allow removal even if voting is disabled)
    if (this.isVoting) {
      return;
    }

    this.triggerHapticFeedback('light');

    const result = await this.voteManagerService.removeVote(
      this.comment.id.toString(),
      this.anonymousUser!.id,
      this.comment.submissionId,
      this.comment.categoryId || 0
    );

    if (!result.success) {
      console.error('❌ Vote removal failed:', result.error);
      return;
    }

    this.triggerHapticFeedback('medium');
  }

  /**
   * Legacy method - kept for backward compatibility.
   * Now delegates to addVote() and removeVote() methods.
   */
  async onVote(voteType: VoteType): Promise<void> {
    if (voteType === 'UP') {
      await this.addVote();
    } else if (voteType === null) {
      await this.removeVote();
    } else {
    }
  }

  onReply(): void {
    this.triggerHapticFeedback('medium');
    this.replyRequested.emit(this.comment.id.toString());
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
   * Returns null if data is missing (unknown state)
   * ENHANCED: More robust comparison with detailed logging
   */
  isCurrentUser(): boolean | null {
    if (!this.anonymousUser || !this.comment) {
      return null; // 🚨 RETURN NULL INSTEAD OF FALSE FOR UNKNOWN STATE
    }

    // 🚨 ENHANCED: More robust comparison with fallback to comment.author.id
    const commentAuthorId = this.comment.authorId || this.comment.author?.id;
    const anonymousUserId = this.anonymousUser.id;
    
    // Ensure both values are compared as numbers
    const authorIdNum = Number(commentAuthorId);
    const userIdNum = Number(anonymousUserId);
    const isOwn = authorIdNum === userIdNum;


    // 🚨 BLOCKING VOTE: If this is the user's own comment, they cannot vote
    if (isOwn) {
      console.log('🚫 BLOCKING VOTE: User cannot vote on their own comment:', {
        commentId: this.comment.id,
        authorDisplayName: this.comment.author?.displayName
      });
    }

    return isOwn;
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
   * Gets the vote score (upvotes only for ranking system)
   */
  getVoteScore(): number {
    return this.comment.voteStats.upVotes;
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
   * Gets tooltip text for the vote score (ranking system)
   */
  getVoteScoreTooltip(): string {
    const upvotes = this.comment.voteStats.upVotes;
    return `${upvotes} positive Bewertungen`;
  }

  /**
   * Gets the total number of votes for this comment
   */
  getTotalVotes(): number {
    return this.comment.voteStats.upVotes || 0;
  }

  /**
   * Gets the number of votes the current user has given to this comment
   */
  getUserVotes(): number {
    return this.getUserVoteCount();
  }

  /**
   * Gets enhanced aria label for vote statistics
   */
  getVoteStatsAriaLabel(): string {
    const totalVotes = this.comment.voteStats.upVotes || 0;
    const userVotes = this.getUserVoteCount();

    if (userVotes > 0) {
      return `Vote statistics: ${totalVotes} positive votes total, including ${userVotes} from you`;
    }

    return `Vote statistics: ${totalVotes} positive votes`;
  }

  /**
   * Gets the number of votes the current user has given to this comment.
   * Enhanced with better race condition handling and stability during operations.
   */
  getUserVoteCount(): number {
    if (!this.anonymousUser) return 0;
    return this.localVoteCount;
  }

  /**
   * Enhanced vote limit check with session vote tracking.
   * Prevents unlimited voting by considering both available votes and session votes.
   * Now uses hasPendingOperations from VoteManagerService.
   */
  canAddMoreVotes(): boolean {
    const effectiveAvailableVotes = this.availableVotes - this.voteSessionService.getSessionVotes();

    // Handle pending operations - block voting if any operation is in progress
    if (this.hasPendingOperations) {
      return false;
    }

    // Check if we have any votes remaining after session votes
    const hasVotesRemaining = effectiveAvailableVotes > 0;
    return hasVotesRemaining;
  }

  /**
   * Gets enhanced tooltip for upvote button with multiple votes context
   */
  getEnhancedUpvoteTooltip(): string {
    if (this.isCurrentUser()) {
      return 'Sie können nicht für Ihren eigenen Kommentar stimmen.';
    }

    const userVotes = this.getUserVoteCount();

    if (this.availableVotes <= 0) {
      return 'Keine Votes mehr verfügbar in dieser Kategorie';
    }

    if (userVotes > 0) {
      return `Weiteren Vote hinzufügen (aktuell: ${userVotes} vergeben)`;
    }

    return 'Positiv bewerten - Sie können unbegrenzt viele Votes auf diesen Kommentar verteilen';
  }

  /**
   * Gets tooltip text for remove vote button
   */
  getRemoveVoteTooltip(): string {
    const currentVotes = this.getUserVoteCount();

    if (currentVotes === 0) {
      return 'Keine Votes zum Entfernen vorhanden';
    }

    if (this.cachedIsCurrentUser) {
      return 'Sie können nicht für Ihren eigenen Kommentar stimmen';
    }

    if (this.isVoting) {
      return 'Vote wird verarbeitet...';
    }

    return `Vote entfernen (aktuell: ${currentVotes} vergeben)`;
  }

  /**
   * Shows a user-friendly warning about vote limits.
   * Now considers session votes for accurate limit detection.
   */
  private showVoteLimitWarning(): void {
    const effectiveAvailableVotes = this.availableVotes - this.voteSessionService.getSessionVotes();

    if (effectiveAvailableVotes <= 0) {
      // Calculate total comment count for dialog
      const totalComments = this.getTotalCommentCount();
      const maxVotes = totalComments * 2;

      const dialogData: VoteLimitDialogData = {
        maxVotes: maxVotes,
        commentCount: totalComments,
        currentCategory: 'aktuelle Kategorie'
      };

      const dialogRef = this.dialog.open(VoteLimitDialogComponent, {
        width: '500px',
        data: dialogData,
        disableClose: false,
        autoFocus: true
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === 'reset') {
          console.log('User requested vote reset');
          // TODO: Implement vote reset functionality
          // this.resetAllVotes();
        }
      });
    }
  }

  /**
   * Gets the total number of comments in the current category for vote limit calculation
   */
  private getTotalCommentCount(): number {
    // Fallback calculation - this will be more accurate when integrated with parent data
    // For now, estimate based on availableVotes and total votes
    const maxVotes = 8; // Default assumption for 4 comments * 2 votes each
    return maxVotes / 2;
  }

  /**
   * Gets vote display text with session vote tracking.
   * Shows effective available votes after session votes.
   */
  getVoteDisplayText(): string {
    const currentVoteCount = this.getUserVoteCount();

    if (currentVoteCount > 0) {
      return `${currentVoteCount} vergeben`;
    }

    const effectiveAvailableVotes = Math.max(0, this.availableVotes - this.voteSessionService.getSessionVotes());

    if (effectiveAvailableVotes > 0) {
      return `${effectiveAvailableVotes} verfügbar`;
    }

    return 'Keine Votes verfügbar';
  }

  /**
   * Gets ARIA label with session vote consideration.
   */
  getVoteDisplayAriaLabel(): string {
    const currentVoteCount = this.getUserVoteCount();
    const effectiveAvailableVotes = Math.max(0, this.availableVotes - this.voteSessionService.getSessionVotes());

    if (currentVoteCount > 0) {
      return `Sie haben ${currentVoteCount} Votes für diesen Kommentar vergeben`;
    } else if (effectiveAvailableVotes > 0) {
      return `Sie haben noch ${effectiveAvailableVotes} Votes verfügbar für diesen Kommentar`;
    } else {
      return 'Keine weiteren Votes verfügbar - Limit erreicht';
    }
  }

  /**
   * Fallback method to show vote count when getUserVoteCount() fails.
   * Uses VoteManagerService for accurate count.
   */
  getFallbackVoteDisplay(): string {
    // Use localVoteCount which is synced with VoteManagerService
    if (this.localVoteCount > 0) {
      return `${this.localVoteCount} vergeben`;
    }

    // Try to derive from available votes if all were used
    if (this.availableVotes === 0) {
      return 'Votes vollständig vergeben';
    }

    // Check vote status for additional hint
    if (this._cachedUserVote === 'UP') {
      return 'Votes vergeben';
    }

    // Last resort fallback
    return 'Synchronisation ausstehend...';
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
   * Gets the user vote using cached value for performance.
   * @returns VoteType The user's vote type or null if no vote exists
   */
  getUserVote(): VoteType | null {
    return this._cachedUserVote;
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
   * Gets tooltip text for upvote button (ranking system)
   * @returns string The tooltip text
   */
  getUpvoteTooltip(): string {
    if (this.isCurrentUser()) {
      return 'Sie können nicht für Ihren eigenen Kommentar stimmen.';
    }
    const userVote = this.getUserVote();
    if (userVote === 'UP') {
      return 'Sie haben bereits positiv bewertet.';
    }
    if (!this.canVote) {
      return 'Keine Bewertungen mehr verfügbar';
    }
    return 'Positiv bewerten';
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

  // =============================================================================
  // HAPTIC FEEDBACK SUPPORT FOR MOBILE DEVICES
  // =============================================================================

  /**
   * Triggers haptic feedback on supported mobile devices.
   * @param intensity - The intensity of the haptic feedback ('light', 'medium', 'heavy')
   */
  private triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (typeof window === 'undefined') {
      return; // Don't trigger on server
    }

    // Check if the device supports haptic feedback
    if ('vibrate' in navigator) {
      let pattern: number | number[];

      switch (intensity) {
        case 'light':
          pattern = 50; // Short vibration
          break;
        case 'medium':
          pattern = [100, 50, 100]; // Medium pattern
          break;
        case 'heavy':
          pattern = [200, 100, 200]; // Heavy pattern
          break;
        default:
          pattern = 50;
      }

      navigator.vibrate(pattern);
    }

    // Check for modern iOS haptic feedback (iOS 10+)
    if ('hapticFeedback' in window && typeof (window as any).hapticFeedback !== 'undefined') {
      const hapticType = intensity === 'light' ? 'impactLight' :
                        intensity === 'medium' ? 'impactMedium' : 'impactHeavy';
      (window as any).hapticFeedback(hapticType);
    }

    // Fallback: Add CSS animation class for visual feedback
    this.addHapticFeedbackAnimation();
  }

  /**
   * Adds a visual haptic feedback animation class temporarily
   */
  private addHapticFeedbackAnimation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const element = document.querySelector(`[data-comment-id="${this.comment.id}"]`);
    if (element) {
      element.classList.add('haptic-feedback');

      // Remove the class after animation completes
      setTimeout(() => {
        element.classList.remove('haptic-feedback');
      }, 300);
    }
  }

  /**
   * Triggers a success animation after a vote is successfully processed
   */
  private triggerVoteSuccessAnimation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const element = document.querySelector(`[data-comment-id="${this.comment.id}"] .vote-btn.voted`);
    if (element) {
      element.classList.add('vote-success');

      // Remove the class after animation completes
      setTimeout(() => {
        element.classList.remove('vote-success');
      }, 400);
    }
  }

  /**
   * Extracts userVoteCount from complex response structures.
   * Last resort fallback method for edge cases.
   */
  private extractVoteCountFromResponse(voteResult: unknown): number | undefined {
    try {
      // Type-safe approach with proper type guards
      if (typeof voteResult === 'object' && voteResult !== null) {
        const result = voteResult as Record<string, unknown>;

        // Check deeply nested structures with bracket notation
        if (this.hasNestedUserVoteCount(result, 'fullResult')) {
          return (result['fullResult'] as Record<string, unknown>)['userVoteCount'] as number;
        }
        if (this.hasNestedUserVoteCount(result, 'data')) {
          return (result['data'] as Record<string, unknown>)['userVoteCount'] as number;
        }
        if (this.hasNestedUserVoteCount(result, 'response')) {
          return (result['response'] as Record<string, unknown>)['userVoteCount'] as number;
        }
      }
      return undefined;
    } catch (error) {
      console.error('❌ Error during userVoteCount extraction:', error);
      return undefined;
    }
  }

  /**
   * Type guard for VoteLimitResponseDTO.
   * @private
   */
  private isVoteLimitResponseDTO(value: unknown): value is VoteLimitResponseDTO {
    return (
      typeof value === 'object' &&
      value !== null &&
      'success' in value &&
      'voteLimitStatus' in value
    );
  }

  /**
   * Type guard helper for checking nested userVoteCount property.
   * @private
   */
  private hasNestedUserVoteCount(obj: Record<string, unknown>, property: string): boolean {
    return (
      obj[property] !== null &&
      typeof obj[property] === 'object' &&
      obj[property] !== undefined &&
      typeof (obj[property] as Record<string, unknown>)['userVoteCount'] === 'number'
    );
  }
}
