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
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// Angular Material Imports (only essential ones)
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Services (only UI-related services)
import { CommentPanelStateService } from '../../../../Services/evaluation/comment-panel-state.service';
import { VoteDebounceService } from '../../../../Services/evaluation/vote-debouncer.service';

// DTOs (type definitions - explicit for strict mode)
export type VoteType = 'UP' | null;

// DTOs (interfaces - would normally come from @DTOs but defined here for strict mode)
export interface EvaluationCommentDTO {
  id: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    type: 'anonymous' | 'regular';
    colorCode?: string;
  };
  createdAt: Date | string;
  voteStats: {
    upVotes: number;
    downVotes: number;
    netVotes: number;
  };
  votes: Array<{
    id: string;
    userId: string;
    commentId: string;
    voteType: VoteType;
    createdAt: Date;
  }>;
  replyCount: number;
}

export interface AnonymousEvaluationUserDTO {
  id: string;
  displayName: string;
  colorCode: string;
}

/**
 * 🔧 HEFL Comment Item Component (Clean Architecture)
 * 
 * This is a DUMB/PRESENTATIONAL component that:
 * - Receives all data via @Input() properties
 * - Emits all user interactions via @Output() events
 * - Contains NO business logic or service calls
 * - Focuses purely on presentation and user interaction
 * 
 * Business logic is handled by parent components via VoteQueueService
 * 
 * @example
 * ```html
 * <app-comment-item-clean
 *   [comment]="comment"
 *   [anonymousUser]="user"
 *   [userVoteCount]="voteCount$ | async"
 *   [isVoting]="isVoting$ | async"
 *   [canVote]="canVote"
 *   [availableVotes]="availableVotes"
 *   [error]="error$ | async"
 *   (voted)="onCommentVoted($event)"
 *   (replyRequested)="onReplyRequested($event)">
 * </app-comment-item-clean>
 * ```
 */
@Component({
  selector: 'app-comment-item-clean',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './comment-item-clean.component.html',
  styleUrls: ['./comment-item.component.scss'], // Reuse existing styles
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentItemCleanComponent implements OnInit, OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();

  // =============================================================================
  // INPUTS - ALL DATA FROM PARENT
  // =============================================================================

  @Input({ required: true }) comment!: EvaluationCommentDTO;
  @Input() anonymousUser: AnonymousEvaluationUserDTO | null = null;
  @Input() canVote: boolean = true;
  @Input() availableVotes: number = 3;
  @Input() isReadOnly: boolean = false;
  @Input() depth: number = 0;

  // 🔧 ARCHITECTURE: Vote data comes from parent via VoteQueueService
  @Input() userVoteCount: number = 0; // From VoteQueueService.getLocalVoteCount$()
  @Input() isVoting: boolean = false;  // From VoteQueueService.getLoadingState$()
  @Input() error: string | null = null; // From VoteQueueService.getError$()

  // =============================================================================
  // OUTPUTS - ALL EVENTS TO PARENT
  // =============================================================================

  @Output() voted = new EventEmitter<{ commentId: string; voteType: VoteType }>();
  @Output() replyRequested = new EventEmitter<string>();

  // =============================================================================
  // COMPONENT STATE (UI-ONLY)
  // =============================================================================

  formattedTime: string = '';
  isContentExpanded: boolean = false;
  isPanelExpanded: boolean = false;
  readonly maxContentLength = 300;

  // Cached display values (performance optimization)
  private _cachedIsCurrentUser: boolean = false;
  private _cachedAuthorDisplayName: string = '';
  private _cachedDisplayContent: string = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private commentPanelStateService: CommentPanelStateService,
    private voteDebouncer: VoteDebounceService
  ) {}

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    console.log('🔧 CommentItemClean initialized:', {
      commentId: this.comment?.id,
      userVoteCount: this.userVoteCount,
      isVoting: this.isVoting
    });
    
    this.formatCommentTime();
    this.updateCachedValues();
    this.initializePanelState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update cached values when inputs change
    if (changes['comment'] || changes['anonymousUser']) {
      this.updateCachedValues();
    }
    
    // Force change detection for vote-related updates
    if (changes['userVoteCount'] || changes['isVoting'] || changes['error']) {
      console.log('🔧 Vote state changed:', {
        commentId: this.comment?.id,
        userVoteCount: this.userVoteCount,
        isVoting: this.isVoting,
        error: this.error
      });
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // 🔧 CLEANUP: Reset vote debouncer state
    this.voteDebouncer.resetCommentState(this.comment.id);
  }

  // =============================================================================
  // CACHED VALUE MANAGEMENT (PERFORMANCE)
  // =============================================================================

  private updateCachedValues(): void {
    this._cachedIsCurrentUser = this.isCurrentUser();
    this._cachedAuthorDisplayName = this.getAuthorDisplayName();
    this._cachedDisplayContent = this.getDisplayContent();
  }

  // =============================================================================
  // EVENT HANDLERS (EMIT EVENTS TO PARENT)
  // =============================================================================

  /**
   * 🔧 RACE CONDITION SAFE: Add vote with debouncing and state management
   */
  addVote(): void {
    // 🔧 RACE PREVENTION: Check debouncing first
    if (!this.voteDebouncer.shouldAllowClick(this.comment.id)) {
      console.log('🚫 Vote blocked by debouncer');
      return;
    }

    if (!this.canVote || this.isVoting || this._cachedIsCurrentUser) {
      return;
    }

    if (!this.canAddMoreVotes()) {
      console.log('❌ Cannot add vote - limit exceeded');
      return;
    }

    // 🔧 RACE PREVENTION: Try to start operation
    if (!this.voteDebouncer.startOperation(this.comment.id)) {
      console.log('🚫 Vote blocked - operation already pending');
      return;
    }

    // 🚀 Haptic feedback for mobile
    this.triggerHapticFeedback('light');
    
    console.log('🔧 SAFE: Emitting vote event (ADD):', this.comment.id);
    
    // 🔧 ARCHITECTURE: Pure event emission - no business logic
    this.voted.emit({
      commentId: this.comment.id,
      voteType: 'UP',
    });
  }

  /**
   * 🔧 RACE CONDITION SAFE: Remove vote with debouncing and state management
   */
  removeVote(): void {
    // 🔧 RACE PREVENTION: Check debouncing first
    if (!this.voteDebouncer.shouldAllowClick(this.comment.id)) {
      console.log('🚫 Vote removal blocked by debouncer');
      return;
    }

    if (this.isVoting || this._cachedIsCurrentUser) {
      return;
    }

    if (this.userVoteCount === 0) {
      console.log('❌ Cannot remove vote - user has no votes on this comment');
      return;
    }

    // 🔧 RACE PREVENTION: Try to start operation
    if (!this.voteDebouncer.startOperation(this.comment.id)) {
      console.log('🚫 Vote removal blocked - operation already pending');
      return;
    }

    // 🚀 Haptic feedback for mobile
    this.triggerHapticFeedback('light');
    
    console.log('🔧 SAFE: Emitting vote event (REMOVE):', this.comment.id);
    
    // 🔧 ARCHITECTURE: Pure event emission - no business logic
    this.voted.emit({
      commentId: this.comment.id,
      voteType: null, // null = remove vote
    });
  }

  /**
   * 🔧 DUMB COMPONENT: Request reply - emit event to parent
   */
  onReply(): void {
    // 🚀 Haptic feedback for mobile
    this.triggerHapticFeedback('medium');
    
    console.log('🔧 DUMB: Emitting reply request:', this.comment.id);
    
    // 🔧 ARCHITECTURE: Pure event emission - no business logic
    this.replyRequested.emit(this.comment.id);
  }

  /**
   * Toggle content expansion (local UI state only)
   */
  onToggleContent(): void {
    this.isContentExpanded = !this.isContentExpanded;
  }

  /**
   * Toggle panel expansion (delegated to panel state service)
   */
  onTogglePanel(): void {
    if (!this.hasReplies()) {
      return;
    }

    this.triggerHapticFeedback('light');
    this.commentPanelStateService.togglePanelState(this.comment.id);
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS (PURE FUNCTIONS)
  // =============================================================================

  /**
   * Get vote display text based on current vote count
   */
  getVoteDisplayText(): string {
    if (this.userVoteCount > 0) {
      return `${this.userVoteCount} vergeben`;
    }
    
    if (this.canAddMoreVotes()) {
      return 'Unbegrenzt möglich';
    }
    
    return 'Keine Votes verfügbar';
  }

  /**
   * Get vote display ARIA label for accessibility
   */
  getVoteDisplayAriaLabel(): string {
    if (this.userVoteCount > 0) {
      return `Sie haben ${this.userVoteCount} Votes für diesen Kommentar vergeben`;
    } else if (this.canAddMoreVotes()) {
      return 'Sie können unbegrenzt viele Votes für diesen Kommentar vergeben';
    } else {
      return 'Keine weiteren Votes verfügbar';
    }
  }

  /**
   * Check if user can add more votes
   */
  canAddMoreVotes(): boolean {
    return this.availableVotes > 0;
  }

  /**
   * 🔧 RACE PREVENTION: Check if vote button should be disabled
   */
  isVoteButtonDisabled(): boolean {
    return this.voteDebouncer.isButtonDisabled(this.comment.id) || 
           this.isVoting || 
           !this.canVote || 
           this._cachedIsCurrentUser;
  }

  /**
   * 🔧 RACE PREVENTION: Check if remove vote button should be disabled
   */
  isRemoveVoteButtonDisabled(): boolean {
    return this.voteDebouncer.isButtonDisabled(this.comment.id) || 
           this.isVoting || 
           this.userVoteCount === 0 || 
           this._cachedIsCurrentUser;
  }

  /**
   * Get upvote tooltip text
   */
  getUpvoteTooltip(): string {
    if (this._cachedIsCurrentUser) {
      return 'Sie können nicht für Ihren eigenen Kommentar stimmen.';
    }

    if (!this.canVote) {
      return 'Bewertung nicht möglich';
    }

    if (this.availableVotes <= 0) {
      return 'Keine Votes mehr verfügbar in dieser Kategorie';
    }

    if (this.userVoteCount > 0) {
      return `Weiteren Vote hinzufügen (aktuell: ${this.userVoteCount} vergeben)`;
    }

    return 'Positiv bewerten - Sie können mehrere Votes auf diesen Kommentar verteilen';
  }

  /**
   * Get remove vote tooltip text
   */
  getRemoveVoteTooltip(): string {
    if (this.userVoteCount === 0) {
      return 'Keine Votes zum Entfernen vorhanden';
    }
    
    if (this._cachedIsCurrentUser) {
      return 'Sie können nicht für Ihren eigenen Kommentar stimmen';
    }
    
    if (this.isVoting) {
      return 'Vote wird verarbeitet...';
    }
    
    return `Vote entfernen (aktuell: ${this.userVoteCount} vergeben)`;
  }

  /**
   * Get author display name
   */
  getAuthorDisplayName(): string {
    if (this.comment.author.type === 'anonymous') {
      return this.comment.author.displayName;
    }
    return this.comment.author.displayName;
  }

  /**
   * Get author color code
   */
  getAuthorColorCode(): string {
    if (this.comment.author.type === 'anonymous' && this.comment.author.colorCode) {
      return this.comment.author.colorCode;
    }
    return '#666';
  }

  /**
   * Check if comment author is current user
   */
  isCurrentUser(): boolean {
    if (!this.anonymousUser || !this.comment?.author) {
      return false;
    }
    return Number(this.comment.author.id) === Number(this.anonymousUser.id);
  }

  /**
   * Get display content (potentially truncated)
   */
  getDisplayContent(): string {
    if (this.isContentExpanded || this.comment.content.length <= this.maxContentLength) {
      return this.comment.content;
    }
    return this.comment.content.substring(0, this.maxContentLength) + '...';
  }

  /**
   * Check if content should show expand/collapse button
   */
  shouldShowToggleButton(): boolean {
    return this.comment.content.length > this.maxContentLength;
  }

  /**
   * Get toggle button text
   */
  getToggleButtonText(): string {
    return this.isContentExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen';
  }

  /**
   * Get vote score (upvotes only)
   */
  getVoteScore(): number {
    return this.comment.voteStats.upVotes;
  }

  /**
   * Get vote score tooltip
   */
  getVoteScoreTooltip(): string {
    const upvotes = this.comment.voteStats.upVotes;
    return `${upvotes} positive Bewertungen`;
  }

  /**
   * Get author tooltip
   */
  getAuthorTooltip(): string {
    if (this._cachedIsCurrentUser) {
      return 'Ihr Kommentar';
    }
    return `Kommentar von ${this._cachedAuthorDisplayName}`;
  }

  /**
   * Check if comment has replies
   */
  hasReplies(): boolean {
    return this.comment.replyCount > 0;
  }

  /**
   * Get reply count text
   */
  getReplyCountText(): string {
    const count = this.comment.replyCount;
    if (count === 0) return '';
    if (count === 1) return '1 Antwort';
    return `${count} Antworten`;
  }

  /**
   * Get depth-based CSS class
   */
  getDepthClass(): string {
    if (this.depth <= 0) return 'depth-0';
    if (this.depth === 1) return 'depth-1';
    if (this.depth === 2) return 'depth-2';
    return 'depth-max';
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private formatCommentTime(): void {
    const now = new Date();
    const commentDate = new Date(this.comment.createdAt);
    const diffMs = now.getTime() - commentDate.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      this.formattedTime = 'gerade eben';
    } else if (diffMinutes < 60) {
      this.formattedTime = `vor ${diffMinutes} Minute${diffMinutes !== 1 ? 'n' : ''}`;
    } else if (diffHours < 24) {
      this.formattedTime = `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
    } else if (diffDays < 7) {
      this.formattedTime = `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
    } else {
      this.formattedTime = commentDate.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  }

  private initializePanelState(): void {
    // Subscribe to panel state changes
    this.commentPanelStateService.getPanelState(this.comment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isExpanded => {
        this.isPanelExpanded = isExpanded;
        this.cdr.markForCheck();
      });

    // Set initial state
    this.isPanelExpanded = this.commentPanelStateService.isPanelExpanded(this.comment.id);
  }

  /**
   * Trigger haptic feedback on mobile devices
   */
  private triggerHapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
    // 🔧 SIMPLIFIED: Browser detection without PLATFORM_ID for strict mode compliance
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    if ('vibrate' in navigator) {
      let pattern: number;
      
      switch (intensity) {
        case 'light': pattern = 50; break;
        case 'medium': pattern = 100; break;
        case 'heavy': pattern = 200; break;
        default: pattern = 50;
      }
      
      navigator.vibrate(pattern);
    }
  }

  // =============================================================================
  // CACHED GETTERS (PERFORMANCE OPTIMIZATION)
  // =============================================================================

  get cachedIsCurrentUser(): boolean { return this._cachedIsCurrentUser; }
  get cachedAuthorDisplayName(): string { return this._cachedAuthorDisplayName; }
  get cachedDisplayContent(): string { return this._cachedDisplayContent; }
}