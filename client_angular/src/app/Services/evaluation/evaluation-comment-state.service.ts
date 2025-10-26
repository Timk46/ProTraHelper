import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';

// DTOs
import {
  EvaluationCommentDTO,
  EvaluationDiscussionDTO,
  CreateEvaluationCommentDTO,
  AnonymousEvaluationUserDTO,
} from '@DTOs/index';

// Services
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { EvaluationCacheService } from './evaluation-cache.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Result type for reply addition operations
 */
interface ReplyAdditionResult {
  comments: EvaluationCommentDTO[];
  found: boolean;
}

/**
 * Manages comment creation and state updates
 *
 * @description
 * This service is responsible for:
 * - Creating new comments and replies
 * - Immutably updating discussion cache after comment creation
 * - Preventing duplicate comment submissions
 * - Handling optimistic updates for OnPush change detection
 *
 * @example
 * ```typescript
 * constructor(private commentState: EvaluationCommentStateService) {}
 *
 * // Add a comment
 * this.commentState.addComment(submissionId, categoryId, content, anonymousUser)
 *   .subscribe(comment => console.log('Comment created:', comment));
 * ```
 *
 * @implements {OnDestroy}
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationCommentStateService implements OnDestroy {
  private readonly log = this.logger.scope('EvaluationCommentStateService');

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  private destroy$ = new Subject<void>();

  // =============================================================================
  // STATE TRACKING
  // =============================================================================

  /**
   * Tracks ongoing comment creation operations to prevent duplicates
   * Key format: `${submissionId}-${categoryId}`
   */
  private commentCreationInProgress = new Set<string>();

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  private readonly CONFIG = {
    MAX_COMMENT_DEPTH: 50, // Maximum nesting depth for replies
  } as const;

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================

  constructor(
    private evaluationService: EvaluationDiscussionService,
    private cache: EvaluationCacheService,
    private logger: LoggerService
  ) {
    this.log.debug('EvaluationCommentStateService initialized');
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================

  ngOnDestroy(): void {
    this.log.debug('Service destroying - cleanup started');
    this.destroy$.next();
    this.destroy$.complete();
    this.commentCreationInProgress.clear();
    this.log.debug('Service destroyed - cleanup completed');
  }

  // =============================================================================
  // PUBLIC API - COMMENT CREATION
  // =============================================================================

  /**
   * Adds a comment to a specific category
   *
   * @description
   * Creates a new comment or reply and updates the local cache immutably.
   * Prevents duplicate submissions via progress tracking.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param content - The comment content
   * @param anonymousUser - The anonymous user creating the comment
   * @param parentId - Optional parent comment ID for replies
   * @returns Observable<EvaluationCommentDTO> The created comment
   * @throws Error if anonymous user is not available or duplicate submission detected
   */
  addComment(
    submissionId: string,
    categoryId: number,
    content: string,
    anonymousUser: AnonymousEvaluationUserDTO,
    parentId?: string
  ): Observable<EvaluationCommentDTO> {
    // Validate anonymous user exists
    if (!anonymousUser) {
      this.log.error('Cannot create comment: Anonymous user not available');
      throw new Error('Anonymous user not available. Please reload the page.');
    }

    // Prevent double submissions
    const operationKey = `${submissionId}-${categoryId}`;
    if (this.commentCreationInProgress.has(operationKey)) {
      this.log.warn('Comment creation already in progress', { categoryId });
      throw new Error('Comment creation already in progress. Please wait a moment.');
    }

    const createCommentDto: CreateEvaluationCommentDTO = {
      submissionId: Number(submissionId),
      categoryId: categoryId,
      content,
      parentId: parentId ? Number(parentId) : undefined,
    };

    this.log.info('Creating comment', {
      submissionId,
      categoryId,
      isReply: !!parentId,
      author: anonymousUser.displayName,
    });

    // Mark operation as in progress
    this.commentCreationInProgress.add(operationKey);

    return this.evaluationService.createComment(createCommentDto).pipe(
      map(comment => {
        // Ensure authorId is set to current anonymous user
        if (!comment.authorId && anonymousUser) {
          comment.authorId = anonymousUser.id;
        }

        // Update local cache immutably
        this.handleCommentAdded(submissionId, categoryId, comment);

        this.log.info('Comment created successfully', {
          commentId: comment.id,
          categoryId,
        });

        return comment;
      }),
      catchError(error => {
        this.log.error('Comment creation failed', { error, categoryId });
        throw error; // Re-throw for component to handle
      }),
      finalize(() => {
        // Always clean up the progress tracking
        this.commentCreationInProgress.delete(operationKey);
      })
    );
  }

  /**
   * Adds a reply to an existing comment
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param parentCommentId - The parent comment ID
   * @param content - The reply content
   * @param anonymousUser - The anonymous user creating the reply
   * @returns Observable<EvaluationCommentDTO> The created reply
   */
  addReply(
    submissionId: string,
    categoryId: number,
    parentCommentId: string,
    content: string,
    anonymousUser: AnonymousEvaluationUserDTO
  ): Observable<EvaluationCommentDTO> {
    return this.addComment(submissionId, categoryId, content, anonymousUser, parentCommentId);
  }

  // =============================================================================
  // PRIVATE METHODS - CACHE UPDATES
  // =============================================================================

  /**
   * Handles a comment being added to the local cache with immutable updates
   *
   * @description
   * Optimized for OnPush change detection by creating new object references
   * for ONLY the discussion that changed. Unchanged discussions maintain their references.
   *
   * Key features:
   * - Immutable updates (map + spread) instead of mutation
   * - Single BehaviorSubject emission
   * - Orphaned reply detection with graceful fallback
   * - Comprehensive error logging
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param comment - The comment that was added
   * @private
   */
  private handleCommentAdded(
    submissionId: string,
    categoryId: number,
    comment: EvaluationCommentDTO
  ): void {
    this.log.debug('Handling comment addition', {
      submissionId,
      categoryId,
      commentId: comment.id,
      isReply: !!comment.parentId,
    });

    try {
      // Validate input parameters
      if (!submissionId || !categoryId || !comment) {
        this.log.error('Invalid parameters for handleCommentAdded', {
          submissionId,
          categoryId,
          comment,
        });
        return;
      }

      // Get or create discussion cache
      const subject = this.cache.getDiscussionCache(categoryId);
      const currentDiscussions = subject.value || [];

      // Check if discussion exists for this category
      const discussionExists = currentDiscussions.some(d => d.categoryId === categoryId);

      let finalDiscussions: EvaluationDiscussionDTO[];

      if (!discussionExists) {
        // Create new discussion immutably
        this.log.info('Creating new discussion for category', { categoryId });
        const newDiscussion: EvaluationDiscussionDTO = {
          id: Date.now(),
          submissionId: Number(submissionId),
          categoryId: categoryId,
          comments: [comment],
          createdAt: new Date(),
          totalComments: 1,
          availableComments: 3,
          usedComments: 1,
        };

        finalDiscussions = [...currentDiscussions, newDiscussion];
      } else {
        // Update existing discussions immutably
        finalDiscussions = currentDiscussions.map(d => {
          if (d.categoryId !== categoryId) {
            // Unchanged - reuse reference for performance
            return d;
          }

          // This is the discussion we're updating
          let updatedComments: EvaluationCommentDTO[];

          if (comment.parentId) {
            // Reply: Use immutable helper with orphan detection
            const result = this.addReplyImmutably(d.comments || [], comment);

            if (!result.found) {
              // Orphaned reply - parent comment not found
              this.log.error('Parent comment not found for reply', {
                replyId: comment.id,
                parentId: comment.parentId,
                categoryId,
              });

              // Graceful fallback: Add as top-level comment
              this.log.warn('Adding orphaned reply as top-level comment');
              updatedComments = [comment, ...(d.comments || [])];
            } else {
              updatedComments = result.comments;
              this.log.info('Reply added to parent successfully', {
                replyId: comment.id,
                parentId: comment.parentId,
              });
            }
          } else {
            // Top-level comment: Simple prepend (newest first)
            updatedComments = [comment, ...(d.comments || [])];
            this.log.info('Top-level comment added', { commentId: comment.id });
          }

          // Return new discussion object (triggers OnPush)
          const totalComments = this.calculateTotalComments(updatedComments);
          return {
            ...d,
            comments: updatedComments,
            totalComments,
            usedComments: totalComments,
          };
        });
      }

      this.log.info('Comment processing complete', {
        categoryId,
        commentId: comment.id,
        totalDiscussions: finalDiscussions.length,
      });

      // Single emission - OnPush will detect reference change
      subject.next(finalDiscussions);

    } catch (error) {
      this.log.error('Error in handleCommentAdded', { error });
    }
  }

  /**
   * Immutably adds a reply to a comment tree
   *
   * @description
   * Recursively searches for parent comment and adds reply WITHOUT mutation.
   * Critical for OnPush change detection. Includes recursion depth limit.
   *
   * @param comments - Array of comments to search through
   * @param reply - The reply to add
   * @param depth - Current recursion depth (internal parameter)
   * @returns Object containing updated comments array and found flag
   * @private
   */
  private addReplyImmutably(
    comments: EvaluationCommentDTO[],
    reply: EvaluationCommentDTO,
    depth: number = 0
  ): ReplyAdditionResult {
    // Prevent infinite recursion
    if (depth > this.CONFIG.MAX_COMMENT_DEPTH) {
      this.log.error('Maximum comment depth exceeded', {
        depth,
        replyId: reply.id,
        parentId: reply.parentId,
      });
      return { comments, found: false };
    }

    let found = false;

    const updatedComments = comments.map(comment => {
      if (comment.id === reply.parentId) {
        found = true;
        // Create new comment object with reply added
        return {
          ...comment,
          replies: [...(comment.replies || []), reply],
        };
      }

      // Recursively search in replies
      if (comment.replies && comment.replies.length > 0) {
        const result = this.addReplyImmutably(comment.replies, reply, depth + 1);
        if (result.found) {
          found = true;
          return {
            ...comment,
            replies: result.comments,
          };
        }
      }

      return comment;
    });

    return { comments: updatedComments, found };
  }

  /**
   * Calculates total comment count including all nested replies
   *
   * @param comments - Array of comments to count
   * @returns Total count of all comments and replies
   * @private
   */
  private calculateTotalComments(comments: EvaluationCommentDTO[]): number {
    return comments.reduce((sum, comment) => {
      const repliesCount = comment.replies ? this.calculateTotalComments(comment.replies) : 0;
      return sum + 1 + repliesCount;
    }, 0);
  }

  // =============================================================================
  // DIAGNOSTICS & DEBUGGING
  // =============================================================================

  /**
   * Gets current state for debugging
   *
   * @returns Object containing current state information
   */
  getDebugState() {
    return {
      inProgressOperations: Array.from(this.commentCreationInProgress),
      config: this.CONFIG,
    };
  }
}
