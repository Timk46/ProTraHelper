import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
  DoCheck,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChildren,
  QueryList,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, fromEvent, debounceTime } from 'rxjs';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

// DTOs
import {
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  AnonymousEvaluationUserDTO,
} from '@DTOs/index';

// Child Components
import { CommentItemComponent } from '../comment-item/comment-item.component';
import { CommentInputComponent } from '../comment-input/comment-input.component';

// Services
import { CommentPanelStateService } from '../../../../Services/evaluation/comment-panel-state.service';
import { EvaluationPerformanceService } from '../../services/evaluation-performance.service';

// Directives
import { PerformanceProfilingDirective } from '../../directives/performance-profiling.directive';

@Component({
  selector: 'app-discussion-thread',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ScrollingModule,
    CommentItemComponent,
    CommentInputComponent,
    PerformanceProfilingDirective,
  ],
  templateUrl: './discussion-thread.component.html',
  styleUrl: './discussion-thread.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscussionThreadComponent implements OnInit, OnChanges, AfterViewInit, DoCheck, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  @ViewChild('scrollContainer', { read: ElementRef }) scrollContainer!: ElementRef;
  @ViewChildren('commentElement', { read: ElementRef }) commentElements!: QueryList<ElementRef>;

  private destroy$ = new Subject<void>();

  // Keyboard navigation state
  private focusedCommentIndex = -1;
  private keyboardNavigationEnabled = false;

  // Performance optimization
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private visibleItems = new Set<number>();

  // Memoization cache
  private memoizedComments = new Map<string, FlattenedComment>();
  private lastProcessedDiscussionsHash = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private commentPanelStateService: CommentPanelStateService,
    private performanceService: EvaluationPerformanceService,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  // =============================================================================
  // INPUTS - DATA FROM PARENT (SMART COMPONENT)
  // =============================================================================

  @Input() discussions: EvaluationDiscussionDTO[] = [];
  @Input() anonymousUser: AnonymousEvaluationUserDTO | null = null;
  @Input() canComment: boolean = true;
  @Input() canVote: boolean = true;
  @Input() availableUpvotes: number = 0;
  @Input() availableDownvotes: number = 0;
  @Input() isReadOnly: boolean = false;
  @Input() isSubmittingComment: boolean = false;
  @Input() trackByFn: ((index: number, item: EvaluationDiscussionDTO) => string) | null = null;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT (SMART COMPONENT)
  // =============================================================================

  @Output() commentSubmitted = new EventEmitter<string>();
  @Output() commentVoted = new EventEmitter<{
    commentId: string;
    voteType: 'UP' | 'DOWN' | null;
  }>();
  @Output() replyRequested = new EventEmitter<{
    parentCommentId: string;
    parentComment: EvaluationCommentDTO;
  }>();

  // 🚀 PHASE 1: Neue Reply-Input Events
  @Output() replySubmitted = new EventEmitter<{
    parentCommentId: string;
    content: string;
  }>();

  // =============================================================================
  // COMPONENT STATE
  // =============================================================================

  // Flattened comment list for virtual scrolling
  flattenedComments: FlattenedComment[] = [];

  @Input() isVotingComment: Map<string, boolean> = new Map();

  // UI state
  showCommentInput: boolean = true;
  sortOrder: 'newest' | 'oldest' | 'mostVoted' = 'newest';

  // Chat input state
  currentInputText: string = '';

  // 🚀 PHASE 1: Reply-Input State Management
  private activeReplyInputs = new Map<string, boolean>(); // commentId -> isActive

  // OnPush Change Detection tracking
  private lastDiscussionsLength: number = 0;
  private lastCommentsCount: number = 0;

  // Virtual scrolling configuration
  readonly itemSize = 120; // Approximate height of each comment
  readonly minBufferPx = 200;
  readonly maxBufferPx = 400;

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnInit(): void {
    // Start performance profiling
    this.performanceService.startComponentProfiling('discussion-thread', {
      trackMemory: true,
      trackChangeDetection: true,
      sampleRate: 0.5 // Sample 50% of render cycles
    });
    this.performanceService.markComponentInit('discussion-thread');

    console.log('this discussions:', this.discussions);
    this.processFlattenedComments();
    this.setupPanelStateSubscription();
    this.setupPerformanceOptimizations();
    this.setupKeyboardNavigation();
  }

  ngOnDestroy(): void {
    // Stop performance profiling
    this.performanceService.stopComponentProfiling('discussion-thread');
    
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupPerformanceObservers();
  }

  ngAfterViewInit(): void {
    // Scroll to bottom on init if messages exist
    this.scrollToBottom();
    this.setupIntersectionObserver();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['discussions'] || changes['sortOrder']) {
      console.log('🔧 ngOnChanges triggered - processing flattened comments');
      this.performanceService.markRenderStart('discussion-thread');
      
      this.processFlattenedComments();
      this.cdr.markForCheck();

      // Auto-scroll to bottom when new messages are added
      if (changes['discussions'] && !changes['discussions'].firstChange) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
      
      this.performanceService.markRenderEnd('discussion-thread');
    }
  }

  ngDoCheck(): void {
    // Track change detection cycles
    this.performanceService.markChangeDetection('discussion-thread');
  }

  // =============================================================================
  // KEYBOARD NAVIGATION
  // =============================================================================

  /**
   * Handles keyboard navigation for accessibility
   */
  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.keyboardNavigationEnabled) return;

    const preventDefault = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    switch (event.key) {
      case 'j': // Next comment
      case 'ArrowDown':
        preventDefault();
        this.navigateToNext();
        break;
      
      case 'k': // Previous comment  
      case 'ArrowUp':
        preventDefault();
        this.navigateToPrevious();
        break;
      
      case 'Enter': // Expand/collapse or vote
      case ' ': // Space for voting
        if (this.focusedCommentIndex >= 0) {
          preventDefault();
          if (event.shiftKey) {
            this.voteOnFocusedComment('DOWN');
          } else {
            event.key === 'Enter' ? this.expandFocusedComment() : this.voteOnFocusedComment('UP');
          }
        }
        break;
      
      case 'r': // Reply to comment
        if (this.focusedCommentIndex >= 0) {
          preventDefault();
          this.replyToFocusedComment();
        }
        break;
      
      case 'Escape': // Clear focus
        preventDefault();
        this.clearFocus();
        break;
      
      case 'Home': // Go to first comment
        preventDefault();
        this.focusedCommentIndex = 0;
        this.scrollToFocused();
        break;
      
      case 'End': // Go to last comment
        preventDefault();
        this.focusedCommentIndex = this.flattenedComments.length - 1;
        this.scrollToFocused();
        break;
    }
  }

  /**
   * Enables keyboard navigation when component gains focus
   */
  @HostListener('focusin')
  onFocusIn(): void {
    this.keyboardNavigationEnabled = true;
  }

  /**
   * Disables keyboard navigation when component loses focus
   */
  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    // Only disable if focus is leaving the component entirely
    if (!this.elementRef.nativeElement.contains(event.relatedTarget as Node)) {
      this.keyboardNavigationEnabled = false;
      this.clearFocus();
    }
  }

  private navigateToNext(): void {
    const commentItems = this.flattenedComments.filter(item => item.type === 'comment');
    if (commentItems.length === 0) return;

    this.focusedCommentIndex = Math.min(this.focusedCommentIndex + 1, commentItems.length - 1);
    this.scrollToFocused();
    this.announceCurrentComment();
  }

  private navigateToPrevious(): void {
    const commentItems = this.flattenedComments.filter(item => item.type === 'comment');
    if (commentItems.length === 0) return;

    this.focusedCommentIndex = Math.max(this.focusedCommentIndex - 1, 0);
    this.scrollToFocused();
    this.announceCurrentComment();
  }

  private expandFocusedComment(): void {
    const focusedComment = this.getFocusedComment();
    if (focusedComment?.comment) {
      const currentState = this.commentPanelStateService.isPanelExpanded(focusedComment.comment.id);
      this.commentPanelStateService.setPanelState(focusedComment.comment.id, !currentState);
    }
  }

  private voteOnFocusedComment(voteType: 'UP' | 'DOWN'): void {
    const focusedComment = this.getFocusedComment();
    if (focusedComment?.comment) {
      this.onCommentVoted({
        commentId: focusedComment.comment.id,
        voteType: voteType
      });
    }
  }

  private replyToFocusedComment(): void {
    const focusedComment = this.getFocusedComment();
    if (focusedComment?.comment) {
      this.onReplyRequested(focusedComment.comment.id);
    }
  }

  private clearFocus(): void {
    this.focusedCommentIndex = -1;
    this.cdr.markForCheck();
  }

  private scrollToFocused(): void {
    if (this.focusedCommentIndex >= 0 && this.viewport) {
      this.viewport.scrollToIndex(this.focusedCommentIndex, 'smooth');
      this.cdr.markForCheck();
    }
  }

  private getFocusedComment(): FlattenedComment | null {
    const commentItems = this.flattenedComments.filter(item => item.type === 'comment');
    return commentItems[this.focusedCommentIndex] || null;
  }

  private announceCurrentComment(): void {
    // Screen reader announcement for accessibility
    const focusedComment = this.getFocusedComment();
    if (focusedComment?.comment) {
      const announcement = `Comment ${this.focusedCommentIndex + 1} of ${this.flattenedComments.filter(item => item.type === 'comment').length}. ${focusedComment.comment.content.substring(0, 100)}...`;
      this.announceToScreenReader(announcement);
    }
  }

  private announceToScreenReader(message: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Create temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }

  // =============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // =============================================================================

  private setupPerformanceOptimizations(): void {
    // Debounced window resize handler
    if (isPlatformBrowser(this.platformId)) {
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(250),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.handleWindowResize();
        });
    }
  }

  private setupKeyboardNavigation(): void {
    // Make the component focusable for keyboard navigation
    if (isPlatformBrowser(this.platformId)) {
      this.elementRef.nativeElement.tabIndex = 0;
      this.elementRef.nativeElement.setAttribute('role', 'feed');
      this.elementRef.nativeElement.setAttribute('aria-label', 'Discussion thread with keyboard navigation');
    }
  }

  private setupIntersectionObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const index = parseInt(entry.target.getAttribute('data-index') || '-1');
          if (entry.isIntersecting) {
            this.visibleItems.add(index);
          } else {
            this.visibleItems.delete(index);
          }
        });
      },
      {
        root: this.viewport?.elementRef?.nativeElement,
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  }

  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.resizeObserver = new ResizeObserver(entries => {
      // Update virtual scrolling viewport on resize
      if (this.viewport) {
        this.viewport.checkViewportSize();
      }
    });

    if (this.elementRef?.nativeElement) {
      this.resizeObserver.observe(this.elementRef.nativeElement);
    }
  }

  private handleWindowResize(): void {
    // Recalculate virtual scrolling dimensions
    if (this.viewport) {
      this.viewport.checkViewportSize();
    }
    this.cdr.markForCheck();
  }

  private cleanupPerformanceObservers(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  // =============================================================================
  // PANEL STATE MANAGEMENT
  // =============================================================================

  /**
   * Sets up subscription to panel state changes to refresh view when panels are toggled
   */
  private setupPanelStateSubscription(): void {
    this.commentPanelStateService.panelStates$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      console.log('🔄 Panel states changed, refreshing flattened comments');
      this.processFlattenedComments();
      this.cdr.markForCheck();
    });
  }

  // =============================================================================
  // COMMENT PROCESSING AND THREADING
  // =============================================================================

  private processFlattenedComments(): void {
    // Performance optimization: Check if discussions have changed
    const discussionsHash = this.generateDiscussionsHash();
    if (discussionsHash === this.lastProcessedDiscussionsHash) {
      console.log('🚀 Skipping comment processing - no changes detected');
      return;
    }

    this.flattenedComments = [];
    this.lastProcessedDiscussionsHash = discussionsHash;

    console.log('🔧 processFlattenedComments: Processing', this.discussions.length, 'discussions');

    // Process each discussion with memoization
    this.discussions.forEach(discussion => {
      // Defensive programming: ensure comments array exists
      const comments = discussion.comments || [];
      console.log('🔧 Processing discussion:', discussion.id, 'with', comments.length, 'comments');

      // Add discussion header (always create new for state changes)
      this.flattenedComments.push({
        type: 'discussion-header',
        discussion,
        depth: 0,
        comment: null,
      });

      // Sort and flatten comments with memoization
      const sortedComments = this.sortComments(comments);
      const topLevelComments = sortedComments.filter(c => !c.parentId);

      const flattenedComments = this.flattenCommentsFromBackendMemoized(topLevelComments, 0, discussion.id);
      this.flattenedComments.push(...flattenedComments);
    });

    console.log('🔧 flattenedComments:', this.flattenedComments);
    console.log('🔧 Final flattenedComments count:', this.flattenedComments.length);
  }

  /**
   * Generates a hash of the current discussions state for change detection
   */
  private generateDiscussionsHash(): string {
    const hashData = {
      discussionsLength: this.discussions.length,
      sortOrder: this.sortOrder,
      commentCounts: this.discussions.map(d => ({
        id: d.id,
        commentCount: d.comments?.length || 0,
        commentsHash: d.comments?.map(c => `${c.id}-${c.voteStats.upVotes}-${c.voteStats.downVotes}`).join(',') || ''
      })),
      panelStates: Array.from(this.commentPanelStateService.panelStates$.value.entries()),
      replyStates: Array.from(this.activeReplyInputs.entries())
    };

    return JSON.stringify(hashData);
  }

  /**
   * Memoized version of flattenCommentsFromBackend for performance
   */
  private flattenCommentsFromBackendMemoized(
    comments: EvaluationCommentDTO[],
    depth: number,
    discussionId: string
  ): FlattenedComment[] {
    const cacheKey = `${discussionId}-${depth}-${comments.map(c => c.id).join(',')}-${this.sortOrder}`;
    
    // Check if we have a cached result that's still valid
    if (this.memoizedComments.has(cacheKey)) {
      const cached = this.memoizedComments.get(cacheKey);
      if (cached && this.isCacheValid(cached, comments)) {
        console.log('🚀 Using memoized comments for:', cacheKey);
        return [cached];
      }
    }

    // Generate new flattened comments
    const flattened = this.flattenCommentsFromBackend(comments, depth);
    
    // Cache the result (limit cache size to prevent memory leaks)
    if (this.memoizedComments.size > 100) {
      // Clear old entries (simple LRU implementation)
      const keys = Array.from(this.memoizedComments.keys());
      keys.slice(0, 50).forEach(key => this.memoizedComments.delete(key));
    }

    // Don't cache individual comments, cache at the discussion level
    return flattened;
  }

  /**
   * Checks if a cached comment is still valid
   */
  private isCacheValid(cached: FlattenedComment, currentComments: EvaluationCommentDTO[]): boolean {
    // Simple validation - check if comment count matches
    return cached.comment?.id === currentComments[0]?.id;
  }

  /**
   * Optimized comment visibility check for virtual scrolling
   */
  isCommentVisible(index: number): boolean {
    return this.visibleItems.has(index);
  }

  /**
   * Dynamic item size calculation for better virtual scrolling
   */
  getItemSize(index: number): number {
    const item = this.flattenedComments[index];
    if (!item) return this.itemSize;

    switch (item.type) {
      case 'discussion-header':
        return 80; // Headers are smaller
      case 'comment':
        // Estimate size based on content and depth
        const contentLength = item.comment?.content?.length || 0;
        const baseSize = 120;
        const contentBonus = Math.min(Math.floor(contentLength / 100) * 20, 100);
        const depthPenalty = item.depth * 10; // Nested comments slightly larger
        return baseSize + contentBonus + depthPenalty;
      case 'comment-input':
        return 150; // Input forms are larger
      default:
        return this.itemSize;
    }
  }

  private sortComments(comments: EvaluationCommentDTO[]): EvaluationCommentDTO[] {
    // Defensive programming: handle undefined/null comments array
    if (!comments || !Array.isArray(comments)) {
      console.warn('⚠️ sortComments: Received invalid comments array:', comments);
      return [];
    }

    const commentsCopy = [...comments];

    switch (this.sortOrder) {
      case 'newest':
        return commentsCopy.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      case 'oldest':
        return commentsCopy.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      case 'mostVoted':
        return commentsCopy.sort(
          (a, b) =>
            b.voteStats.upVotes -
            b.voteStats.downVotes -
            (a.voteStats.upVotes - a.voteStats.downVotes),
        );
      default:
        return commentsCopy;
    }
  }

  /**
   * Builds an efficient lookup map of replies grouped by parent comment ID
   * @param comments All comments including replies
   * @returns Map where key is parentId and value is array of reply comments
   */
  private buildRepliesMap(comments: EvaluationCommentDTO[]): Map<string, EvaluationCommentDTO[]> {
    const repliesMap = new Map<string, EvaluationCommentDTO[]>();

    comments.forEach(comment => {
      if (comment.parentId) {
        if (!repliesMap.has(comment.parentId)) {
          repliesMap.set(comment.parentId, []);
        }
        repliesMap.get(comment.parentId)!.push(comment);
      }
    });

    // Sort replies within each parent to maintain consistent ordering
    repliesMap.forEach(replies => {
      replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return repliesMap;
  }

  /**
   * Flattens comments using the Backend-provided nested replies[] structure
   * This method respects the panel expand/collapse state for each comment
   */
  private flattenCommentsFromBackend(
    comments: EvaluationCommentDTO[],
    depth: number,
  ): FlattenedComment[] {
    const flattened: FlattenedComment[] = [];

    comments.forEach(comment => {
      // Add the comment itself
      flattened.push({
        type: 'comment',
        discussion: null,
        depth,
        comment,
      });
      console.log('🔧 Added comment to flattened:', {
        type: 'comment',
        commentId: comment.id,
        content: comment.content?.substring(0, 50) + '...',
        replyCount: comment.replyCount,
        hasBackendReplies: comment.replies?.length || 0,
      });

      // Add replies if they exist AND the panel is expanded (using Backend replies[])
      const backendReplies = comment.replies || [];
      if (backendReplies.length > 0) {
        // Check if the panel for this comment is expanded
        const isPanelExpanded = this.commentPanelStateService.isPanelExpanded(comment.id);

        if (isPanelExpanded) {
          const flattenedReplies = this.flattenCommentsFromBackend(backendReplies, depth + 1);
          flattened.push(...flattenedReplies);
        }

        console.log('🔧 Panel state for comment:', {
          commentId: comment.id,
          isPanelExpanded,
          backendReplyCount: comment.replyCount,
          actualRepliesLength: backendReplies.length,
          repliesShown: isPanelExpanded ? backendReplies.length : 0,
        });
      }

      // 🚀 PHASE 2: Add reply-input item if active for this comment
      const isReplyActive = this.isReplyInputActive(comment.id);
      if (isReplyActive) {
        flattened.push({
          type: 'comment-input',
          discussion: null,
          depth: depth + 1, // Same depth as replies would be
          comment: null,
          parentCommentId: comment.id,
          isReplyInputActive: true,
        });

        console.log('🔧 Added reply-input for comment:', {
          commentId: comment.id,
          depth: depth + 1,
          isReplyActive,
        });
      }
    });

    return flattened;
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  onCommentSubmitted(content: string): void {
    if (!content.trim() || this.isSubmittingComment || !this.canComment) {
      return;
    }

    this.commentSubmitted.emit(content.trim());
  }

  onCommentVoted(data: { commentId: string; voteType: 'UP' | 'DOWN' | null }): void {
    if (!this.canVote || this.isVotingComment.get(data.commentId)) {
      return;
    }
    this.commentVoted.emit(data);
  }

  onReplyRequested(commentId: string): void {
    console.log('🔄 Reply requested for comment:', commentId);

    // 🚀 PHASE 2: Aktiviere Reply-Input für diesen Kommentar
    this.setReplyInputActive(commentId, true);

    // Find the comment in the flattened list for legacy event
    const commentItem = this.flattenedComments.find(
      item => item.type === 'comment' && item.comment?.id === commentId,
    );

    if (commentItem?.comment) {
      this.replyRequested.emit({
        parentCommentId: commentId,
        parentComment: commentItem.comment,
      });
    } else {
      console.warn('⚠️ Could not find comment for reply:', commentId);
    }
  }

  // 🚀 PHASE 2: Neue Reply-Input Event Handler
  onReplyInputCancelled(commentId: string): void {
    console.log('❌ Reply input cancelled for comment:', commentId);
    this.setReplyInputActive(commentId, false);
  }

  onReplyInputSubmitted(data: { commentId: string; content: string }): void {
    console.log('✅ Reply input submitted for comment:', data.commentId);

    // Emit to parent for actual submission
    this.replySubmitted.emit({
      parentCommentId: data.commentId,
      content: data.content,
    });

    // Deactivate reply input
    this.setReplyInputActive(data.commentId, false);
  }

  onSortOrderChanged(newOrder: 'newest' | 'oldest' | 'mostVoted'): void {
    this.sortOrder = newOrder;
    this.processFlattenedComments();
    this.cdr.markForCheck();
  }

  /**
   * Handles chat input submission
   */
  onChatSubmit(): void {
    const text = this.currentInputText?.trim();
    if (text && !this.isSubmittingComment) {
      this.onCommentSubmitted(text);
      this.currentInputText = '';

      // Auto-scroll to bottom after comment submission
      setTimeout(() => this.scrollToBottom(), 200);
    }
  }

  /**
   * Handles keyboard events in chat input
   */
  onInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onChatSubmit();
    }
  }

  // =============================================================================
  // 🚀 PHASE 1: REPLY-INPUT STATE MANAGEMENT
  // =============================================================================

  /**
   * Sets the reply input active state for a comment
   */
  setReplyInputActive(commentId: string, isActive: boolean): void {
    this.activeReplyInputs.set(commentId, isActive);
    this.processFlattenedComments(); // Refresh view
    this.cdr.markForCheck();

    console.log('🔄 Reply input state changed:', {
      commentId,
      isActive,
      totalActiveInputs: Array.from(this.activeReplyInputs.values()).filter(Boolean).length,
    });
  }

  /**
   * Checks if reply input is active for a comment
   */
  isReplyInputActive(commentId: string): boolean {
    return this.activeReplyInputs.get(commentId) || false;
  }

  // =============================================================================
  // SCROLL MANAGEMENT
  // =============================================================================

  private scrollToBottom(): void {
    if (this.viewport && this.flattenedComments.length > 0) {
      // Scroll to the last item
      const lastIndex = this.flattenedComments.length - 1;
      this.viewport.scrollToIndex(lastIndex, 'smooth');
    }
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================

  /**
   * Gets the discussion header text for a category
   */
  getDiscussionHeaderText(discussion: EvaluationDiscussionDTO): string {
    // Use the category information if available
    if (discussion.category) {
      return `Diskussion: ${discussion.category.displayName}`;
    }

    // Fallback to category ID
    const categoryNames: { [key: number]: string } = {
      1: 'Vollständigkeit',
      2: 'Grafische Darstellungsqualität',
      3: 'Vergleichbarkeit',
      4: 'Komplexität',
    };

    const categoryName =
      categoryNames[discussion.categoryId] || `Kategorie ${discussion.categoryId}`;
    return `Diskussion: ${categoryName}`;
  }

  /**
   * Gets the total comment count for a discussion
   */
  getTotalCommentCount(discussion: EvaluationDiscussionDTO): number {
    // Defensive programming: handle undefined comments array
    return discussion.comments?.length || 0;
  }

  /**
   * Gets the available comments text for a discussion
   */
  getAvailableCommentsText(discussion: EvaluationDiscussionDTO): string {
    const available = discussion.availableComments - discussion.usedComments;
    return `${available}/${discussion.availableComments} verfügbar`;
  }

  /**
   * Checks if a comment is currently being voted on
   */
  isCommentBeingVoted(commentId: string): boolean {
    return this.isVotingComment.get(commentId) || false;
  }

  /**
   * Gets the depth-based indentation for a comment
   */
  getCommentIndentation(depth: number): number {
    return Math.min(depth * 24, 120); // Max 5 levels deep
  }

  /**
   * Checks if there are any discussions to display
   */
  hasDiscussions(): boolean {
    return this.discussions.length > 0;
  }

  /**
   * Checks if there are any comments in any discussion
   */
  hasAnyComments(): boolean {
    // Defensive programming: handle undefined comments array
    return this.discussions.some(d => (d.comments?.length || 0) > 0);
  }

  /**
   * Gets the message for read-only mode
   */
  getReadOnlyMessage(): string {
    return 'In der Bewertungsphase können keine neuen Kommentare erstellt werden.';
  }

  /**
   * Gets the message when no discussions exist
   */
  getNoDiscussionsMessage(): string {
    return 'Keine Diskussionen verfügbar. Wählen Sie eine Kategorie aus.';
  }

  /**
   * Gets the message when no comments exist
   */
  getNoCommentsMessage(): string {
    return 'Noch keine Kommentare in dieser Diskussion. Seien Sie der Erste!';
  }

  // =============================================================================
  // TRACK BY FUNCTIONS FOR PERFORMANCE
  // =============================================================================

  trackByFlattenedComment(index: number, item: FlattenedComment): string {
    if (item.type === 'comment' && item.comment) {
      return item.comment.id;
    } else if (item.type === 'discussion-header' && item.discussion) {
      return `header-${item.discussion.id}`;
    } else if (item.type === 'comment-input' && item.discussion) {
      return `input-${item.discussion.id}`;
    }
    return `item-${index}`;
  }

  trackByDiscussion(index: number, discussion: EvaluationDiscussionDTO): string {
    return discussion.id;
  }
}

// =============================================================================
// INTERFACES FOR COMPONENT
// =============================================================================

interface FlattenedComment {
  type: 'discussion-header' | 'comment' | 'comment-input';
  discussion: EvaluationDiscussionDTO | null;
  depth: number;
  comment: EvaluationCommentDTO | null;

  // 🚀 PHASE 1: Reply-spezifische Properties
  parentCommentId?: string; // Für reply-input: ID des Parent-Kommentars
  isReplyInputActive?: boolean; // Ob der Reply-Input aktiv ist
}
