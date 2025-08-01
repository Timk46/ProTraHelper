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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  ],
  templateUrl: './discussion-thread.component.html',
  styleUrl: './discussion-thread.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscussionThreadComponent implements OnInit, OnChanges, AfterViewInit, DoCheck {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  constructor(private cdr: ChangeDetectorRef) {}

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
    this.processFlattenedComments();
  }

  ngAfterViewInit(): void {
    // Scroll to bottom on init if messages exist
    this.scrollToBottom();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['discussions'] || changes['sortOrder']) {
      console.log('🔧 ngOnChanges triggered - processing flattened comments');
      this.processFlattenedComments();
      this.cdr.markForCheck();

      // Auto-scroll to bottom when new messages are added
      if (changes['discussions'] && !changes['discussions'].firstChange) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    }
  }

  // =============================================================================
  // COMMENT PROCESSING AND THREADING
  // =============================================================================

  private processFlattenedComments(): void {
    this.flattenedComments = [];

    console.log('🔧 processFlattenedComments: Processing', this.discussions.length, 'discussions');

    // Process each discussion
    this.discussions.forEach(discussion => {
      // Defensive programming: ensure comments array exists
      const comments = discussion.comments || [];
      console.log('🔧 Processing discussion:', discussion.id, 'with', comments.length, 'comments');

      // Add discussion header
      this.flattenedComments.push({
        type: 'discussion-header',
        discussion,
        depth: 0,
        comment: null,
      });

      // Sort and flatten comments (with defensive check)
      const sortedComments = this.sortComments(comments);
      const flattenedComments = this.flattenCommentsRecursive(sortedComments, 0);
      this.flattenedComments.push(...flattenedComments);

      // Note: Comment input is now fixed at the bottom, not part of virtual scrolling
    });
    console.log('🔧 flattenedComments:', this.flattenedComments);
    console.log('🔧 Final flattenedComments count:', this.flattenedComments.length);
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

  private flattenCommentsRecursive(
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
      });

      // Add replies if they exist
      const replies = comments.filter(c => c.parentId === comment.id);
      if (replies.length > 0) {
        const flattenedReplies = this.flattenCommentsRecursive(replies, depth + 1);
        flattened.push(...flattenedReplies);
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
}
