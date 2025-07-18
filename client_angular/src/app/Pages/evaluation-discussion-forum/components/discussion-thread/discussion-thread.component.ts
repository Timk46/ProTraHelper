import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollingModule } from '@angular/cdk/scrolling';

// DTOs
import {
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  AnonymousEvaluationUserDTO
} from '@dtos';

// Child Components
import { CommentItemComponent } from '../comment-item/comment-item.component';
import { CommentInputComponent } from '../comment-input/comment-input.component';

@Component({
  selector: 'app-discussion-thread',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ScrollingModule,
    CommentItemComponent,
    CommentInputComponent
  ],
  templateUrl: './discussion-thread.component.html',
  styleUrl: './discussion-thread.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscussionThreadComponent implements OnInit, OnChanges {
  
  // =============================================================================
  // INPUTS - DATA FROM PARENT (SMART COMPONENT)
  // =============================================================================
  
  @Input() discussions: EvaluationDiscussionDTO[] = [];
  @Input() anonymousUser: AnonymousEvaluationUserDTO | null = null;
  @Input() canComment: boolean = true;
  @Input() canVote: boolean = true;
  @Input() isReadOnly: boolean = false;
  @Input() trackByFn: ((index: number, item: EvaluationDiscussionDTO) => string) | null = null;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT (SMART COMPONENT)
  // =============================================================================
  
  @Output() commentSubmitted = new EventEmitter<string>();
  @Output() commentVoted = new EventEmitter<{ commentId: string; voteType: 'UP' | 'DOWN' | null }>();

  // =============================================================================
  // COMPONENT STATE
  // =============================================================================
  
  // Flattened comment list for virtual scrolling
  flattenedComments: FlattenedComment[] = [];
  
  // Loading states
  isSubmittingComment: boolean = false;
  isVotingComment: Map<string, boolean> = new Map();
  
  // UI state
  showCommentInput: boolean = true;
  sortOrder: 'newest' | 'oldest' | 'mostVoted' = 'newest';
  
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['discussions'] || changes['sortOrder']) {
      this.processFlattenedComments();
    }
  }

  // =============================================================================
  // COMMENT PROCESSING AND THREADING
  // =============================================================================
  
  private processFlattenedComments(): void {
    this.flattenedComments = [];
    
    // Process each discussion
    this.discussions.forEach(discussion => {
      // Add discussion header
      this.flattenedComments.push({
        type: 'discussion-header',
        discussion,
        depth: 0,
        comment: null
      });
      
      // Sort and flatten comments
      const sortedComments = this.sortComments(discussion.comments);
      const flattenedComments = this.flattenCommentsRecursive(sortedComments, 0);
      this.flattenedComments.push(...flattenedComments);
      
      // Add comment input if can comment
      if (this.canComment && !this.isReadOnly) {
        this.flattenedComments.push({
          type: 'comment-input',
          discussion,
          depth: 0,
          comment: null
        });
      }
    });
  }

  private sortComments(comments: EvaluationCommentDTO[]): EvaluationCommentDTO[] {
    const commentsCopy = [...comments];
    
    switch (this.sortOrder) {
      case 'newest':
        return commentsCopy.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return commentsCopy.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'mostVoted':
        return commentsCopy.sort((a, b) => 
          (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
        );
      default:
        return commentsCopy;
    }
  }

  private flattenCommentsRecursive(
    comments: EvaluationCommentDTO[], 
    depth: number
  ): FlattenedComment[] {
    const flattened: FlattenedComment[] = [];
    
    comments.forEach(comment => {
      // Add the comment itself
      flattened.push({
        type: 'comment',
        discussion: null,
        depth,
        comment
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
    
    this.isSubmittingComment = true;
    this.commentSubmitted.emit(content.trim());
    
    // Reset loading state after a delay (will be updated by parent)
    setTimeout(() => {
      this.isSubmittingComment = false;
    }, 2000);
  }

  onCommentVoted(data: { commentId: string; voteType: 'UP' | 'DOWN' | null }): void {
    if (!this.canVote || this.isVotingComment.get(data.commentId)) {
      return;
    }
    
    // Set loading state for this specific comment
    this.isVotingComment.set(data.commentId, true);
    
    // Emit the vote event
    this.commentVoted.emit(data);
    
    // Reset loading state after a delay
    setTimeout(() => {
      this.isVotingComment.delete(data.commentId);
    }, 1000);
  }

  onSortOrderChanged(newOrder: 'newest' | 'oldest' | 'mostVoted'): void {
    this.sortOrder = newOrder;
    this.processFlattenedComments();
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================
  
  /**
   * Gets the discussion header text for a category
   */
  getDiscussionHeaderText(discussion: EvaluationDiscussionDTO): string {
    // This should match the category display name from the CategoryTabs
    const categoryNames: { [key: string]: string } = {
      'vollstaendigkeit': 'Vollständigkeit',
      'grafische_darstellung': 'Grafische Darstellungsqualität', 
      'vergleichbarkeit': 'Vergleichbarkeit',
      'komplexitaet': 'Komplexität'
    };
    
    const categoryName = categoryNames[discussion.categoryId] || discussion.categoryId;
    return `Diskussion: ${categoryName}`;
  }

  /**
   * Gets the total comment count for a discussion
   */
  getTotalCommentCount(discussion: EvaluationDiscussionDTO): number {
    return discussion.comments.length;
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
    return this.discussions.some(d => d.comments.length > 0);
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
