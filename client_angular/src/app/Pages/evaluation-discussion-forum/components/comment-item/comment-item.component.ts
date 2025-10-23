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
import { BehaviorSubject, takeUntil, Subject, filter, retry, catchError, of, timer } from 'rxjs';

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
import { LegacyVoteAdapter } from '../../../../Services/evaluation/legacy-vote.adapter';
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
  private _cachedIsCurrentUser: boolean | null = null;
  private _cachedAuthorDisplayName: string = '';
  private _cachedDisplayContent: string = '';
  private _cachedFormattedContent: string = '';
  private _cachedUpvoteTooltip: string = '';

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

  // 🚀 LOCAL VOTE TRACKING: Track actual number of votes given to this comment
  private localVoteCount: number = 0;

  // 🚀 SMART SYNC: Track pending operations to prevent race conditions
  private pendingVoteOperations: number = 0;
  private expectedVoteCount: number = 0;

  // 🚨 ATOMIC LOCKS: Prevent race conditions from rapid clicking
  private voteOperationLock: boolean = false;
  private voteOperationTimeout: any = null;

  // 🚀 SESSION VOTE TRACKING: Now handled globally via VoteSessionService

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
    private legacyVoteAdapter: LegacyVoteAdapter,
    private dialog: MatDialog,
  ) {}

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    // 🚨 SECURITY FIX: Only set cachedIsCurrentUser if anonymousUser is available
    if (this.anonymousUser && this.comment?.author) {
      this._cachedIsCurrentUser = this.isCurrentUser();
    } else {
      this._cachedIsCurrentUser = null; // Unknown state
    }
    

    this.formatCommentTime();
    // 🚀 PHASE 2.3: Initialize cached values for performance
    this.updateCachedValues();

    // 🚀 PHASE 4: Initialize vote status with unified state management
    const initialVoteStatus = this.getUserVoteFromLocal();
    this.setVoteStatus(initialVoteStatus, 'initialization');

    // 🚀 PHASE 3: Initialize async vote status loading
    this.loadUserVoteStatus();

    // 🚀 LOCAL VOTE TRACKING: Initialize local vote count immediately
    this.initializeLocalVoteCount();

    // 🚀 PHASE 4: Listen to vote completion events for cache synchronization
    this.setupVoteEventListeners();

    // Initialize panel state
    this.initializePanelState();

  }

  ngAfterViewInit(): void {
    // ViewChild references are now available
  }

  ngOnDestroy(): void {
    // 🚨 CLEANUP: Clear atomic lock timeout
    if (this.voteOperationTimeout) {
      clearTimeout(this.voteOperationTimeout);
      this.voteOperationTimeout = null;
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 🚨 SECURITY FIX: Update cachedIsCurrentUser when anonymousUser changes
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

    // 🚀 PHASE 2.3 + PHASE 3: Update cached values when inputs change
    if (changes['comment'] || changes['anonymousUser'] || changes['canVote'] || changes['availableVotes']) {
      this.updateCachedValues();

      // 🚀 PHASE 3: Reload vote status if comment or anonymousUser changed
      if (changes['comment'] && !changes['comment'].firstChange) {
        this.loadUserVoteStatus();
      }
    }

    // 🚀 SESSION VOTE RESET: Reset session votes when availableVotes changes from parent
    if (changes['availableVotes'] && !changes['availableVotes'].firstChange) {
      const currentValue = changes['availableVotes'].currentValue;
      const previousValue = changes['availableVotes'].previousValue;
      
      // Reset session votes when parent state updates (indicates backend sync)
      if (currentValue !== previousValue) {
        // Note: Session votes are now handled globally and don't reset per component
        
        // 🚀 OPTIMISTIC UI UPDATE: Force UI update after session reset
        this.cdr.detectChanges();
      }
    }

    // 🚀 PHASE 1.3: Aggressive change detection for immediate UI updates
    if (changes['comment'] || changes['isVoting'] || changes['canVote'] || changes['availableVotes']) {

      // 🚀 PHASE 1: Use detectChanges() for immediate update when voting state changes
      if (changes['isVoting'] && changes['isVoting'].currentValue !== changes['isVoting'].previousValue) {
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
          (currentVoteStats.upVotes !== previousVoteStats.upVotes)) {
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
    // 🚨 REMOVED: _cachedIsCurrentUser is now handled separately in ngOnInit/ngOnChanges
    // Cache author display name
    this._cachedAuthorDisplayName = this.getAuthorDisplayName();

    // Cache display content and formatted content (complex chain)
    this._cachedDisplayContent = this.getDisplayContent();
    this._cachedFormattedContent = this.formatContent(this.sanitizeContent(this._cachedDisplayContent));

    // Cache upvote tooltip only (ranking system)
    this._cachedUpvoteTooltip = this.getUpvoteTooltip();
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
      this.setVoteStatus(localVote, 'local-data');
      return;
    }

    // Second attempt: Load from API if not found locally
    this._userVoteLoadingState.next(true);

    this.evaluationStateService
      .getUserVoteStatus(this.comment.id.toString())
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

    // Update the Observable (primary source of truth)
    this._userVoteStatusCache.next(voteStatus);

    // Update cached value for backward compatibility
    this._cachedUserVote = voteStatus;

    // Update upvote tooltip based on new vote status
    this._cachedUpvoteTooltip = this.getUpvoteTooltip();

    // Force immediate UI update
    this.cdr.detectChanges();
  }

  /**
   * Updates cached upvote tooltip when vote status changes (ranking system)
   */
  private updateCachedTooltips(): void {
    this._cachedUpvoteTooltip = this.getUpvoteTooltip();
  }

  /**
   * Initializes local vote count by loading from backend
   */
  private initializeLocalVoteCount(): void {
    if (!this.anonymousUser) {
      this.localVoteCount = 0;
      return;
    }

    // 🚀 FAST INIT: First try local extraction (fastest source)
    const localExtracted = this.extractVoteCountFromLocalData();
    if (localExtracted > 0) {
      this.localVoteCount = localExtracted;
      this.cdr.detectChanges(); // Immediate UI update!
      console.log('🚀 ✅ Fast initialization from local data:', {
        commentId: this.comment.id,
        voteCount: this.localVoteCount,
        source: 'local-extraction'
      });
      return;
    }

    // Fallback to backend call only if local extraction yields 0
    this.evaluationStateService
      .evaluationService
      .getUserVoteCountForComment(this.comment.id.toString())
      .pipe(
        catchError((error) => {
          return of(0);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((count: number) => {
        // 🚀 IMPROVED RACE-CONDITION PREVENTION
        if (this.pendingVoteOperations === 0 && this.localVoteCount === 0) {
          this.localVoteCount = count;
          this.cdr.detectChanges(); // Immediate UI update
        }
      });
  }

  /**
   * Extracts the actual vote count from local comment data
   * This is used as fallback when backend call fails
   */
  private extractVoteCountFromLocalData(): number {
    if (!this.anonymousUser || !this.comment) {
      return 0;
    }

    // 🚀 PRIORITY 1: Direct userVoteCount in comment (highest priority)
    if (typeof this.comment.userVoteCount === 'number') {
      return this.comment.userVoteCount;
    }

    // 🚀 PRIORITY 2: voteDetails.userVoteCounts (specific user vote count)
    try {
      const voteDetails = (this.comment as any).voteDetails;
      if (voteDetails?.userVoteCounts) {
        const userId = this.anonymousUser.id.toString();
        if (voteDetails.userVoteCounts[userId] !== undefined) {
          const count = voteDetails.userVoteCounts[userId];
          return count;
        }
      }
    } catch (error) {
    }

    // 🚀 PRIORITY 3: voteStats.userVoteCount (legacy support)
    if ((this.comment.voteStats as any)?.userVoteCount !== undefined) {
      const count = (this.comment.voteStats as any).userVoteCount;
      return count;
    }

    // 🚀 PRIORITY 4: Count votes array (last resort estimate)
    try {
      const userVotes = this.comment.votes.filter(vote =>
        vote.userId === this.anonymousUser!.id && vote.voteType === 'UP'
      );

      if (userVotes.length > 0) {
        return userVotes.length; // Minimum estimate
      }
    } catch (error) {
    }

    // Method 4: Legacy fallback (original logic)
    const legacyCount = this._cachedUserVote === 'UP' ? 1 : 0;
    return legacyCount;
  }

  /**
   * 🔧 LOCAL VOTE MANAGEMENT: Removed global vote event listeners
   * Local vote operations handle their own completion/error events
   * This prevents interference from global state updates
   */
  private setupVoteEventListeners(): void {

    // 🔧 Note: Global vote listeners removed to prevent cascade updates
    // Vote operations are now handled entirely locally in performLocalVoteOperation()

    // Only keep panel state listeners as they don't trigger re-rendering cascades
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
   * 🚨 SECURITY FIX: Adds a vote with atomic locking to prevent race conditions
   * Prevents self-voting and unlimited voting attacks
   */
  async addVote(): Promise<void> {
    // 🚨 ATOMIC LOCK: Check and set in one operation
    if (this.voteOperationLock) {
      console.warn('🔒 Vote operation already in progress, blocking duplicate');
      return;
    }

    // Immediately lock to prevent concurrent operations
    this.voteOperationLock = true;

    // Clear any existing timeout
    if (this.voteOperationTimeout) {
      clearTimeout(this.voteOperationTimeout);
      this.voteOperationTimeout = null;
    }

    try {
      // 🚨 CRITICAL SECURITY: Check ownership FIRST
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

      // Proceed with vote operation
      await this.performVoteOperation('UP');

    } finally {
      // Always release lock after short delay to prevent rapid re-clicks
      this.voteOperationTimeout = setTimeout(() => {
        this.voteOperationLock = false;
      }, 200);
    }
  }

  /**
   * 🚨 INTERNAL: Performs the actual vote operation with proper state management
   * ENHANCED: Uses VoteOperationsService for consistent session tracking and limits
   */
  private async performVoteOperation(voteType: 'UP' | null): Promise<void> {
    // Track operation
    this.pendingVoteOperations++;
    this.expectedVoteCount = voteType === 'UP' ? this.localVoteCount + 1 : Math.max(0, this.localVoteCount - 1);

    // Haptic feedback
    this.triggerHapticFeedback('light');


    // Optimistic update
    this.localVoteCount = this.expectedVoteCount;
    this.setVoteStatus(voteType === 'UP' ? 'UP' : null, 'atomic-vote-operation');
    this.cdr.detectChanges();

    // API call with session tracking handled by VoteOperationsService
    await this.performLocalVoteOperation(voteType);
  }

  /**
   * 🚨 SECURITY FIX: Removes a vote with atomic locking to prevent race conditions
   * Allows vote removal even when vote limit is reached (important for UX)
   */
  async removeVote(): Promise<void> {
    // 🚨 ATOMIC LOCK: Check and set in one operation
    if (this.voteOperationLock) {
      console.warn('🔒 Vote operation already in progress, blocking duplicate');
      return;
    }

    // Immediately lock
    this.voteOperationLock = true;

    // Clear any existing timeout
    if (this.voteOperationTimeout) {
      clearTimeout(this.voteOperationTimeout);
      this.voteOperationTimeout = null;
    }

    try {
      // 🚨 CRITICAL SECURITY: Check ownership FIRST (even for removal)
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

      // Proceed with vote removal operation
      await this.performVoteOperation(null);

    } finally {
      // Always release lock after short delay
      this.voteOperationTimeout = setTimeout(() => {
        this.voteOperationLock = false;
      }, 200);
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   * Now delegates to addVote() and removeVote() methods
   */
  async onVote(voteType: VoteType): Promise<void> {
    if (voteType === 'UP') {
      await this.addVote();
    } else if (voteType === null) {
      await this.removeVote();
    } else {
    }
  }


  /**
   * 🔧 LOCAL VOTE MANAGEMENT: Uses VoteOperationsService for consistent vote handling
   * Prevents the re-rendering cascade by handling votes locally with proper error handling
   */
  private async performLocalVoteOperation(voteType: VoteType | null): Promise<void> {

    try {
      // Use LegacyVoteAdapter for consistent vote handling with limits
      const result = await this.legacyVoteAdapter.performVoteOperation(
        this.comment,
        voteType,
        this.comment.submissionId,
        this.comment.categoryId || 0,
        this.anonymousUser?.id
      );


      this.onLocalVoteCompleted(result);

    } catch (error: any) {
      console.error('❌ Local vote operation failed via VoteOperationsService:', {
        commentId: this.comment.id,
        voteType,
        error: error
      });

      // Handle VoteOperationError with user-friendly messages
      if (error?.code === 'VOTE_LIMIT_EXCEEDED') {
        // Could show a toast or dialog here
      } else if (error?.code === 'SELF_VOTE_ATTEMPT') {
      }

      this.onLocalVoteError();
    }
  }

  /**
   * 🔧 LOCAL VOTE MANAGEMENT: Handles successful local vote completion
   * Updates local state without triggering parent re-render
   * Now handles VoteLimitResponseDTO from VoteOperationsService
   */
  private onLocalVoteCompleted(result: unknown): void {
    // Decrease pending operations counter
    this.pendingVoteOperations = Math.max(0, this.pendingVoteOperations - 1);

    // Extract vote count from VoteLimitResponseDTO or fallback extraction
    const backendVoteCount = this.legacyVoteAdapter.extractVoteCountFromResponse(result);

    if (backendVoteCount !== undefined) {

      this.localVoteCount = backendVoteCount;
      this.setVoteStatus(backendVoteCount > 0 ? 'UP' : null, 'local-api-completion');
    } else {

      // Use expected count if backend doesn't provide one
      this.localVoteCount = this.expectedVoteCount;
      this.setVoteStatus(this.expectedVoteCount > 0 ? 'UP' : null, 'local-api-expected');
    }

    // Update vote limit status if available
    if (result && typeof result === 'object' && 'voteLimitStatus' in result) {
      // Could update local vote limit displays here if needed
    }

    // Trigger success animation
    this.triggerVoteSuccessAnimation();
    this.triggerHapticFeedback('medium');

    // Perform final sync if all operations are complete
    if (this.pendingVoteOperations === 0) {
      setTimeout(() => this.performFinalSynchronization(), 100);
    }
  }

  /**
   * 🔧 LOCAL VOTE MANAGEMENT: Handles failed local vote operation
   * Reverts optimistic updates and provides user feedback
   */
  private onLocalVoteError(): void {

    // Decrease pending operations counter
    this.pendingVoteOperations = Math.max(0, this.pendingVoteOperations - 1);

    // Reload vote status from local data first (faster fallback)
    const localVote = this.getUserVoteFromLocal();
    const localCount = this.extractVoteCountFromLocalData();

    if (localCount > 0) {
      this.localVoteCount = localCount;
      this.setVoteStatus(localVote, 'error-revert-local');
    } else {
      // If no local data, reload from API to get correct state
      this.loadUserVoteStatus();
    }
  }

  /**
   * 🚀 PHASE 5: Called when vote operation fails - enhanced error handling
   * Reverts optimistic updates and provides user feedback
   */
  onVoteError(): void {

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
    this.replyRequested.emit(this.comment.id.toString());

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
   * 🛠️ IMPROVED: Gets the number of votes the current user has given to this comment
   * Enhanced with better race condition handling and stability during operations
   */
  getUserVoteCount(): number {
    if (!this.anonymousUser) return 0;
    
    // 🎯 SIMPLIFIED: Verwende immer localVoteCount als Single Source of Truth
    return this.localVoteCount;
  }

  /**
   * 🚨 SECURITY FIX: Enhanced vote limit check with session vote tracking
   * Prevents unlimited voting by considering both available votes and session votes
   */
  canAddMoreVotes(): boolean {
    // 🚀 CRITICAL FIX: Account for votes given in current session
    const effectiveAvailableVotes = this.availableVotes - this.voteSessionService.getSessionVotes();

    // Handle pending operations with projected votes
    if (this.pendingVoteOperations > 0) {
      const projectedAvailableVotes = effectiveAvailableVotes - this.pendingVoteOperations;
      return projectedAvailableVotes > 0;
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
   * Shows a user-friendly warning about vote limits
   * ENHANCED: Now considers session votes for accurate limit detection
   */
  private showVoteLimitWarning(): void {
    // 🚀 CRITICAL FIX: Use effective available votes that account for session votes
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
    } else {
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
   * 🛠️ ENHANCED: Vote-Display-Methode mit Session-Vote-Tracking
   * Zeigt effektive verfügbare Votes nach Session-Votes an
   */
  getVoteDisplayText(): string {
    const currentVoteCount = this.getUserVoteCount();
    
    // 🎯 SIMPLIFIED: Einfache, klare Logik ohne komplexe Fallbacks
    if (currentVoteCount > 0) {
      return `${currentVoteCount} vergeben`;
    }
    
    // 🚀 CRITICAL FIX: Show effective available votes considering session votes
    const effectiveAvailableVotes = Math.max(0, this.availableVotes - this.voteSessionService.getSessionVotes());
    
    if (effectiveAvailableVotes > 0) {
      return `${effectiveAvailableVotes} verfügbar`;
    }
    
    return 'Keine Votes verfügbar';
  }

  /**
   * 🛠️ ENHANCED: ARIA-Label mit Session-Vote-Berücksichtigung
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
   * 🚀 CRITICAL FIX: Fallback method to show vote count when getUserVoteCount() fails
   * Tries multiple methods to extract the actual vote count
   */
  getFallbackVoteDisplay(): string {
    // Try to extract actual vote count from various sources
    const extractedCount = this.extractVoteCountFromLocalData();

    if (extractedCount > 0) {
      return `${extractedCount} vergeben`;
    }

    // Try to derive from available votes if all were used
    if (this.availableVotes === 0) {
      // If no votes available, user might have used them all on this comment
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
   * 🚀 FINAL SYNC: Performs final synchronization after all vote operations complete
   * Ensures localVoteCount is accurate by checking all possible sources
   */
  private performFinalSynchronization(): void {
    if (this.pendingVoteOperations > 0) {
      return;
    }


    // Try to get accurate count from all sources
    const extractedCount = this.extractVoteCountFromLocalData();
    let finalCount = this.localVoteCount;
    let source = 'current-local';

    if (extractedCount > 0 && extractedCount !== this.localVoteCount) {
      finalCount = extractedCount;
      source = 'extracted-local-data';
    }

    // Last resort: try backend call if still uncertain
    if (finalCount === 0 && this._cachedUserVote === 'UP') {
      this.evaluationStateService
        .evaluationService
        .getUserVoteCountForComment(this.comment.id.toString())
        .pipe(
          catchError(() => of(0)),
          takeUntil(this.destroy$)
        )
        .subscribe((backendCount: number) => {
          if (backendCount > 0 && backendCount !== this.localVoteCount) {
            this.localVoteCount = backendCount;
            this.cdr.detectChanges();
          }
        });
      return;
    }

    // Update if we found a better value
    if (finalCount !== this.localVoteCount) {
      this.localVoteCount = finalCount;
      this.cdr.detectChanges();
    } else {
    }
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
  // 🚀 PHASE 4: HAPTIC FEEDBACK SUPPORT FOR MOBILE DEVICES
  // =============================================================================

  /**
   * Triggers haptic feedback on supported mobile devices
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
   * Handles vote completion with Smart Sync race condition prevention
   *
   * @description Processes backend vote response and synchronizes local state
   * using multiple fallback strategies for robust data extraction. Implements
   * Smart Sync logic to prevent race conditions from delayed backend responses
   * that could overwrite more recent optimistic updates.
   *
   * @param {VoteLimitResponseDTO | unknown} voteResult - Backend response containing vote data
   * Can be either a properly typed VoteLimitResponseDTO or unknown for edge cases
   *
   * @returns {void}
   *
   * @memberof CommentItemComponent
   *
   * @example
   * ```typescript
   * // Called automatically via vote completion event
   * this.onVoteCompleted({
   *   success: true,
   *   userVoteCount: 3,
   *   voteLimitStatus: { remainingVotes: 7, maxVotes: 10 }
   * });
   * ```
   *
   * @since 1.0.0
   * @see {@link https://docs.hefl.eti.uni-siegen.de/voting-system} HEFL Voting Documentation
   */
  /**
   * 🛠️ IMPROVED: Enhanced vote completion handler with better race condition management
   * Optimized synchronization logic and fallback strategies
   */
  onVoteCompleted(voteResult: VoteLimitResponseDTO | unknown): void {

    // 🛠️ SMART SYNC: Sicheres Decrement der pending operations
    this.pendingVoteOperations = Math.max(0, this.pendingVoteOperations - 1);

    // 🛠️ FINAL SYNC: Planen der finalen Synchronisation wenn alle Operationen abgeschlossen
    const wasLastOperation = this.pendingVoteOperations === 0;
    if (wasLastOperation) {
      // Leichte Verzögerung für bessere Stabilität
      setTimeout(() => this.performFinalSynchronization(), 150);
    }

    // 🛠️ ENHANCED EXTRACTION: Robuste userVoteCount Extraktion mit Priorisierung
    let backendVoteCount: number | undefined;

    // Methode 1: Direkte VoteLimitResponseDTO Zugriff (höchste Priorität)
    if (this.isVoteLimitResponseDTO(voteResult) && voteResult.userVoteCount !== undefined) {
      backendVoteCount = voteResult.userVoteCount;
    }

    // Methode 2: Verschachtelte Strukturen (mittlere Priorität)
    if (backendVoteCount === undefined && typeof voteResult === 'object' && voteResult !== null) {
      const result = voteResult as any;
      backendVoteCount = result.userVoteCount ||
                        result.data?.userVoteCount ||
                        result.fullResult?.userVoteCount;
      if (backendVoteCount !== undefined) {
      }
    }

    // Methode 3: Legacy Extraktion als letzter Ausweg
    if (backendVoteCount === undefined) {
      backendVoteCount = this.extractVoteCountFromResponse(voteResult);
      if (backendVoteCount !== undefined) {
      }
    }

    // 🛠️ ENHANCED SMART SYNC: Intelligente Synchronisation mit verbesserter Race-Condition-Erkennung
    if (backendVoteCount !== undefined) {
      this.handleBackendVoteCountUpdate(backendVoteCount);
    } else {
      this.handleVoteCountFallback(voteResult);
    }

    // 🛠️ IMPROVED: Bessere Vote Status Ableitung
    this.updateVoteStatusFromCount();

    // 🚀 PHASE 4: Trigger success animation and haptic feedback
    this.triggerVoteSuccessAnimation();
    this.triggerHapticFeedback('medium');
  }

  /**
   * 🛠️ NEU: Behandelt Backend Vote Count Updates mit verbesserter Logik
   */
  private handleBackendVoteCountUpdate(backendVoteCount: number): void {
    if (this.pendingVoteOperations === 0) {
      // Keine weiteren Operations - Backend-Antwort sicher akzeptieren
      this.localVoteCount = backendVoteCount;
      this.cdr.detectChanges();
    } else if (Math.abs(backendVoteCount - this.expectedVoteCount) <= 1) {
      // Backend-Antwort stimmt mit Erwartung überein (Toleranz: ±1)
      this.localVoteCount = backendVoteCount;
      this.cdr.detectChanges();
    } else {
      // Race Condition erkannt - optimistischen Wert beibehalten
    }
  }

  /**
   * 🛠️ NEU: Fallback-Behandlung wenn Backend Vote Count nicht extrahiert werden kann
   */
  private handleVoteCountFallback(voteResult: unknown): void {

    if (this.pendingVoteOperations === 0 && this.expectedVoteCount !== undefined) {
      this.localVoteCount = this.expectedVoteCount;
      this.cdr.detectChanges();
    } else {
      // Versuche lokale Extraktion als letzten Ausweg
      const localExtracted = this.extractVoteCountFromLocalData();
      if (localExtracted !== this.localVoteCount && (localExtracted > 0 || this.localVoteCount > 0)) {
        this.localVoteCount = localExtracted;
        this.cdr.detectChanges();
      }
    }
  }

  /**
   * 🛠️ NEU: Aktualisiert Vote Status basierend auf aktuellem Vote Count
   */
  private updateVoteStatusFromCount(): void {
    // Leite Vote Status vom aktuellen Vote Count ab
    const currentCount = this.localVoteCount;
    let userVote: VoteType | null = currentCount > 0 ? 'UP' : null;

    this.setVoteStatus(userVote, 'vote-completed');
  }

  /**
   * 🚀 NEW: Extract userVoteCount from complex response structures
   * Last resort fallback method for edge cases
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
   * Type guard for VoteLimitResponseDTO
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
   * Type guard helper for checking nested userVoteCount property
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
