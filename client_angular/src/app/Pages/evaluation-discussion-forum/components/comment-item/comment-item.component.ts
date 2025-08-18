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
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, takeUntil, Subject, filter, retry, catchError, of, timer } from 'rxjs';

// Angular Material Imports (reduced set for chat bubbles)
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

// Services
import { EvaluationStateService } from '../../../../Services/evaluation/evaluation-state.service';
import { CommentPanelStateService } from '../../../../Services/evaluation/comment-panel-state.service';

// DTOs
import { EvaluationCommentDTO, AnonymousEvaluationUserDTO, VoteType } from '@DTOs/index';

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
    MatButtonModule
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
  @Input() canVote: boolean = true;
  @Input() canVoteUp: boolean = true;
  @Input() canVoteDown: boolean = true;
  @Input() availableUpvotes: number = 3;
  @Input() availableDownvotes: number = 3;
  @Input() isVoting: boolean = false;
  @Input() depth: number = 0;
  @Input() isReadOnly: boolean = false;

  // =============================================================================
  // VIEW REFERENCES - 🚀 PHASE 5: Cleaned up - inline reply removed
  // =============================================================================

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
  
  // 🚀 PHASE 3: Vote status cache and loading state
  private _userVoteLoadingState = new BehaviorSubject<boolean>(false);
  private _userVoteStatusCache = new BehaviorSubject<VoteType | null>(null);
  private destroy$ = new Subject<void>();
  
  // 🚀 PHASE 5: Reply state removed - now handled by separate reply-input items
  
  // Panel state
  isPanelExpanded: boolean = false;
  
  // 🚀 PHASE 2: Public observables for reactive programming with template
  userVoteStatus$ = this._userVoteStatusCache.asObservable();
  userVoteLoading$ = this._userVoteLoadingState.asObservable();
  
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

  constructor(
    private cdr: ChangeDetectorRef,
    private evaluationStateService: EvaluationStateService,
    private commentPanelStateService: CommentPanelStateService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    this.formatCommentTime();
    // 🚀 PHASE 2.3: Initialize cached values for performance
    this.updateCachedValues();
    
    // 🚀 PHASE 4: Initialize vote status with unified state management
    const initialVoteStatus = this.getUserVoteFromLocal();
    this.setVoteStatus(initialVoteStatus, 'initialization');
    
    // 🚀 PHASE 3: Initialize async vote status loading
    this.loadUserVoteStatus();
    
    // 🚀 PHASE 4: Listen to vote completion events for cache synchronization
    this.setupVoteEventListeners();
    
    // Initialize panel state
    this.initializePanelState();
    
    console.log('💬 Comment item initialized:', {
      commentId: this.comment.id,
      authorId: this.comment.author.id,
      authorType: this.comment.author.type,
      authorDisplayName: this.comment.author.displayName,
      anonymousUserId: this.anonymousUser?.id,
      isCurrentUser: this._cachedIsCurrentUser, // Use cached value
      isPanelExpanded: this.isPanelExpanded,
    });
  }

  ngAfterViewInit(): void {
    // ViewChild references are now available
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 🚀 PHASE 2.3 + PHASE 3: Update cached values when inputs change
    if (changes['comment'] || changes['anonymousUser'] || changes['canVoteUp'] || changes['canVoteDown']) {
      this.updateCachedValues();
      
      // 🚀 PHASE 3: Reload vote status if comment or anonymousUser changed
      if (changes['comment'] && !changes['comment'].firstChange) {
        console.log('🔄 Comment changed, reloading vote status');
        this.loadUserVoteStatus();
      }
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
      
      // 🚀 PHASE 1: Use detectChanges() for immediate update when voting state changes
      if (changes['isVoting'] && changes['isVoting'].currentValue !== changes['isVoting'].previousValue) {
        console.log('⚡ Voting state changed - forcing immediate detection');
        this.cdr.detectChanges();
      } else {
        // 🚀 PHASE 1: Use detectChanges() for consistent immediate UI updates
        this.cdr.detectChanges();
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
  // CACHED VALUE MANAGEMENT - 🚀 PHASE 2.3 + PHASE 3
  // =============================================================================

  /**
   * Updates all cached values to avoid repeated function calls in templates
   * Called on ngOnInit and when relevant inputs change
   * 🚀 PHASE 4: Removed vote caching - now handled by Observable
   */
  private updateCachedValues(): void {
    // Cache current user status (called multiple times)
    this._cachedIsCurrentUser = this.isCurrentUser();
    
    // Cache author display name
    this._cachedAuthorDisplayName = this.getAuthorDisplayName();
    
    // Cache display content and formatted content (complex chain)
    this._cachedDisplayContent = this.getDisplayContent();
    this._cachedFormattedContent = this.formatContent(this.sanitizeContent(this._cachedDisplayContent));
    
    // Cache tooltips (computed based on current Observable value)
    this.updateCachedTooltips();
    
    console.log('🚀 Cached values updated for performance:', {
      commentId: this.comment?.id,
      isCurrentUser: this._cachedIsCurrentUser,
      authorDisplayName: this._cachedAuthorDisplayName,
    });
  }

  /**
   * 🚀 PHASE 4: Load user vote status with fallback system - unified state management
   * First try local comment.votes array, then API call if needed
   */
  private loadUserVoteStatus(): void {
    // First attempt: Try to get vote from local data
    const localVote = this.getUserVoteFromLocal();
    
    if (localVote !== null) {
      // Found vote in local data
      console.log('✅ User vote found in local data:', {
        commentId: this.comment.id,
        localVote,
      });
      this.setVoteStatus(localVote, 'local-data');
      return;
    }

    // Second attempt: Load from API if not found locally
    console.log('🔄 Loading user vote status from API for comment:', this.comment.id);
    this._userVoteLoadingState.next(true);

    this.evaluationStateService
      .getUserVoteStatus(this.comment.id)
      .pipe(
        // 🚀 PHASE 5: Add retry mechanism with exponential backoff
        retry({ count: 2, delay: (error, retryCount) => timer(Math.pow(2, retryCount) * 1000) }),
        // 🚀 PHASE 5: Handle errors gracefully with enhanced logging
        catchError((error: any) => {
          console.error('❌ Failed to load user vote status after retries:', {
            commentId: this.comment.id,
            error: error,
            errorMessage: error?.message,
            errorStatus: error?.status,
            errorUrl: error?.url,
            errorDetails: error?.error
          });
          this._userVoteLoadingState.next(false);
          // Return null to indicate no vote status available
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (voteType: VoteType | null) => {
          console.log('✅ User vote status loaded from API:', {
            commentId: this.comment.id,
            voteType,
          });
          
          this._userVoteLoadingState.next(false);
          this.setVoteStatus(voteType, 'api-fallback');
        },
      });
  }

  /**
   * 🚀 PHASE 3: Gets user vote from local comment.votes array (fallback system)
   * This is the local fallback before API call
   */
  private getUserVoteFromLocal(): VoteType | null {
    if (!this.anonymousUser) return null;

    // Fix: vote.userId is number, anonymousUser.id is number
    // Ensure both are compared as numbers
    const userVote = this.comment.votes.find(
      (vote: any) => vote.userId === Number(this.anonymousUser!.id),
    );

    return userVote ? userVote.voteType : null;
  }

  /**
   * 🚀 PHASE 4: Unified method for updating vote status - single source of truth
   * @param voteStatus The new vote status to set
   * @param source Optional source description for logging
   */
  private setVoteStatus(voteStatus: VoteType | null, source: string = 'unknown'): void {
    console.log('🔄 Setting vote status:', {
      commentId: this.comment.id,
      voteStatus,
      source,
    });

    // Update the Observable (primary source of truth)
    this._userVoteStatusCache.next(voteStatus);
    
    // Update cached value for backward compatibility
    this._cachedUserVote = voteStatus;
    
    // Update tooltips based on new vote status
    this.updateCachedTooltips();
    
    // Force immediate UI update
    this.cdr.detectChanges();
  }

  /**
   * Updates cached tooltips when vote status changes
   */
  private updateCachedTooltips(): void {
    this._cachedUpvoteTooltip = this.getUpvoteTooltip();
    this._cachedDownvoteTooltip = this.getDownvoteTooltip();
  }

  /**
   * 🚀 PHASE 4: Setup vote event listeners for cache synchronization
   */
  private setupVoteEventListeners(): void {
    // Listen to vote completion events
    this.evaluationStateService.voteCompletion$
      .pipe(
        takeUntil(this.destroy$),
        filter((event: any) => event !== null && event.commentId === this.comment.id),
      )
      .subscribe((event: any) => {
        if (event) {
          console.log('🔄 Received vote completion event:', event);
          this.onVoteCompleted(event.voteResult);
        }
      });

    // Listen to vote error events
    this.evaluationStateService.voteError$
      .pipe(
        takeUntil(this.destroy$),
        filter((event: any) => event !== null && event.commentId === this.comment.id),
      )
      .subscribe((event: any) => {
        if (event) {
          console.log('❌ Received vote error event:', event);
          this.onVoteError();
        }
      });
  }

  // =============================================================================
  // PANEL STATE MANAGEMENT
  // =============================================================================

  /**
   * Initializes the panel expansion state from the service
   */
  private initializePanelState(): void {
    // Subscribe to panel state changes for this comment
    this.commentPanelStateService.getPanelState(this.comment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isExpanded => {
        this.isPanelExpanded = isExpanded;
        this.cdr.detectChanges();
      });

    // Set initial state (default to collapsed for comments with replies)
    this.isPanelExpanded = this.commentPanelStateService.isPanelExpanded(this.comment.id);
  }

  // 🚀 PHASE 5: Old reply textarea helper methods removed - handled by separate reply-input component

  /**
   * Toggles the panel expansion state
   */
  onTogglePanel(): void {
    if (!this.hasReplies()) {
      return; // Don't toggle if no replies
    }

    // 🚀 PHASE 4: Trigger haptic feedback for mobile devices
    this.triggerHapticFeedback('light');

    const newState = this.commentPanelStateService.togglePanelState(this.comment.id);
    
    console.log('🔄 Panel toggled:', {
      commentId: this.comment.id,
      newState,
      replyCount: this.comment.replyCount,
    });

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

  onVote(voteType: VoteType): void {
    if (!this.canVote || this.isVoting) {
      return;
    }

    // 🚀 PHASE 4: Trigger haptic feedback for mobile devices
    this.triggerHapticFeedback('light');

    // 🚀 PHASE 4: Optimistic UI update with unified state management
    const currentVote = this._cachedUserVote;
    const newVote = currentVote === voteType ? null : voteType; // Toggle logic
    
    console.log('🗳️ Vote initiated:', {
      commentId: this.comment.id,
      currentVote,
      voteType,
      newVote,
    });

    // Optimistic update for immediate UI feedback using unified method
    this.setVoteStatus(newVote, 'optimistic-update');

    this.voted.emit({
      commentId: this.comment.id,
      voteType: voteType,
    });
  }

  /**
   * 🚀 PHASE 4: Called when vote operation completes successfully
   * Synchronizes the local cache with the actual result using unified state management
   */
  onVoteCompleted(voteResult: VoteType | null): void {
    console.log('✅ Vote completed, updating cache:', {
      commentId: this.comment.id,
      voteResult,
    });

    // Use unified method for consistent state management
    this.setVoteStatus(voteResult, 'vote-completed');
  }

  /**
   * 🚀 PHASE 5: Called when vote operation fails - enhanced error handling
   * Reverts optimistic updates and provides user feedback
   */
  onVoteError(): void {
    console.log('❌ Vote failed, reverting optimistic update');
    
    // Reload vote status from local data first (faster fallback)
    const localVote = this.getUserVoteFromLocal();
    if (localVote !== null) {
      this.setVoteStatus(localVote, 'error-revert-local');
    } else {
      // If no local data, reload from API to get correct state
      this.loadUserVoteStatus();
    }
  }

  onReply(): void {
    // 🚀 PHASE 4: Trigger haptic feedback for mobile devices
    this.triggerHapticFeedback('medium');
    
    // 🚀 PHASE 5: Simplified - only emit event, reply input handled by parent
    this.replyRequested.emit(this.comment.id);
    
    console.log('🎯 Reply requested:', {
      commentId: this.comment.id,
    });
  }

  // 🚀 PHASE 5: Old reply submission methods removed - handled by separate reply-input component

  // 🚀 PHASE 5: Old reply keyboard handler removed - handled by separate reply-input component

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
   * 🚀 PHASE 3: Gets the user vote - now uses cached value for performance
   * @returns VoteType The user's vote type or null if no vote exists
   */
  getUserVote(): VoteType | null {
    // Return cached value for immediate access
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

  // =============================================================================
  // 🚀 PHASE 4: HAPTIC FEEDBACK SUPPORT FOR MOBILE DEVICES
  // =============================================================================

  /**
   * Triggers haptic feedback on supported mobile devices
   * @param intensity - The intensity of the haptic feedback ('light', 'medium', 'heavy')
   */
  private triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!isPlatformBrowser(this.platformId)) {
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
    if (!isPlatformBrowser(this.platformId)) {
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
    if (!isPlatformBrowser(this.platformId)) {
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
   * Enhanced vote completion handler with success animation
   */
  onVoteCompleted(voteResult: VoteType | null): void {
    console.log('✅ Vote completed, updating cache:', {
      commentId: this.comment.id,
      voteResult,
    });

    // Use unified method for consistent state management
    this.setVoteStatus(voteResult, 'vote-completed');
    
    // 🚀 PHASE 4: Trigger success animation and haptic feedback
    this.triggerVoteSuccessAnimation();
    this.triggerHapticFeedback('medium');
  }
}