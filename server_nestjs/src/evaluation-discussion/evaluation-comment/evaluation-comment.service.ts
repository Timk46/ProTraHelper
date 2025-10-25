/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { EvaluationAuthorizationService } from '../evaluation-authorization.service';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  CreateEvaluationCommentDTO,
  UpdateEvaluationCommentDTO,
  EvaluationCommentDTO,
  VoteCountResponseDTO,
  VoteLimitResponseDTO,
  VoteLimitStatusDTO,
  CommentStatusMapDTO,
} from '@DTOs/index';

/**
 * Prisma transaction client type for type-safe transaction operations
 */
type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Type definition for comment with all required relations for DTO mapping
 */
type CommentWithRelations = Prisma.EvaluationCommentGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        firstname: true;
        lastname: true;
      };
    };
    EvaluationCommentVote: true;
    _count: {
      select: {
        replies: true;
      };
    };
  };
}>;

/**
 * Standard include pattern for fetching comments with all required relations
 */
const COMMENT_INCLUDE_WITH_RELATIONS = {
  user: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
    },
  },
  EvaluationCommentVote: true,
  _count: {
    select: {
      replies: true,
    },
  },
} as const;

@Injectable()
export class EvaluationCommentService {
  private readonly logger = new Logger(EvaluationCommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly authorizationService: EvaluationAuthorizationService,
  ) {}

  async create(
    createDto: CreateEvaluationCommentDTO,
    userId: number,
  ): Promise<EvaluationCommentDTO> {
    // Create the comment
    const createdComment = await this.prisma.evaluationComment.create({
      data: {
        content: createDto.content,
        userId: userId,
        submissionId: createDto.submissionId,
        categoryId: createDto.categoryId,
        parentId: createDto.parentId || null,
      },
      include: COMMENT_INCLUDE_WITH_RELATIONS,
    });

    // Transform to DTO using existing mapper
    return this.mapToCommentDTO(createdComment, userId);
  }

  /**
   * Validates that a comment exists and belongs to the specified user
   * @param id - Comment ID
   * @param userId - User ID who should own the comment
   * @throws NotFoundException if comment not found
   * @throws ForbiddenException if comment doesn't belong to user
   */
  private async validateCommentOwnership(id: number, userId: number): Promise<void> {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You are not authorized to modify this comment');
    }
  }

  /**
   * Validates that user has access to the submission that the comment belongs to
   * Optimized single-query approach that combines existence check with authorization
   * @param commentId - Comment ID
   * @param userId - User ID requesting access
   * @returns The comment with submissionId and userId for further checks
   * @throws NotFoundException if comment doesn't exist
   * @throws ForbiddenException if user lacks access to submission
   */
  private async validateCommentAccess(
    commentId: number,
    userId: number,
  ): Promise<{ id: number; submissionId: number; userId: number }> {
    // Load comment with submissionId (optimized query - only fields we need)
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        submissionId: true,
        userId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Check submission authorization (group-based access control)
    await this.authorizationService.checkAccessOrThrow(comment.submissionId, userId);

    return comment;
  }

  async remove(id: number, userId: number): Promise<void> {
    // Validate submission access + get comment data (single query)
    const comment = await this.validateCommentAccess(id, userId);

    // Check ownership (only author can delete)
    if (comment.userId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this comment');
    }

    await this.prisma.evaluationComment.delete({
      where: { id },
    });
  }

  async update(id: number, updateDto: UpdateEvaluationCommentDTO, userId: number): Promise<void> {
    // Validate submission access + get comment data (single query)
    const comment = await this.validateCommentAccess(id, userId);

    // Check ownership (only author can update)
    if (comment.userId !== userId) {
      throw new ForbiddenException('You are not authorized to update this comment');
    }

    await this.prisma.evaluationComment.update({
      where: { id },
      data: {
        content: updateDto.content,
      },
    });
  }

  async getAllByCategory(
    submissionId: number,
    categoryId: number,
    userId: number,
  ): Promise<EvaluationCommentDTO[]> {
    const comments = await this.prisma.evaluationComment.findMany({
      where: {
        submissionId,
        categoryId,
      },
      include: COMMENT_INCLUDE_WITH_RELATIONS,
    });

    return comments.map(comment => this.mapToCommentDTO(comment, userId));
  }

  async getReplies(parentId: number, userId: number): Promise<EvaluationCommentDTO[]> {
    // Validate submission access via parent comment
    await this.validateCommentAccess(parentId, userId);

    const replies = await this.prisma.evaluationComment.findMany({
      where: {
        parentId,
      },
      include: COMMENT_INCLUDE_WITH_RELATIONS,
      orderBy: { createdAt: 'asc' },
    });

    return replies.map(reply => this.mapToCommentDTO(reply, userId));
  }

  private mapToCommentDTO(comment: CommentWithRelations, userId: number): EvaluationCommentDTO {
    // Calculate vote statistics for ranking system
    // In ranking system, all votes are positive (upvotes), so sum all voteCount values
    const upVotes =
      comment.EvaluationCommentVote?.reduce((acc, vote) => {
        return acc + vote.voteCount;
      }, 0) || 0;

    const userVoteCount =
      comment.EvaluationCommentVote?.find(vote => vote.userId === userId)?.voteCount || 0;

    // Map author information
    const author = comment.user
      ? {
          id: comment.user.id,
          type: 'user' as const,
          displayName: `${comment.user.firstname} ${comment.user.lastname}`,
          firstname: comment.user.firstname,
          lastname: comment.user.lastname,
        }
      : {
          id: comment.userId,
          type: 'user' as const,
          displayName: 'Unknown User',
        };

    return {
      id: comment.id,
      submissionId: comment.submissionId,
      categoryId: comment.categoryId,
      authorId: comment.userId,
      content: comment.content,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author,
      // Map database votes to DTO format (voteCount -> voteType)
      votes:
        comment.EvaluationCommentVote?.map(vote => ({
          id: vote.id,
          commentId: vote.commentId,
          userId: vote.userId,
          voteType: 'UP' as const,
          createdAt: vote.createdAt,
        })) || [],
      voteStats: {
        upVotes,
        downVotes: 0, // Deprecated in ranking system
        totalVotes: upVotes,
        score: upVotes,
      },
      userVoteCount,
      replies: [], // Will be populated by caller if needed
      replyCount: comment._count?.replies || 0,
    };
  }

  /**
   * Calculate total votes user has used in a category
   *
   * @description Uses Prisma aggregate for optimal performance.
   * Counts all votes across all comments in the specified category.
   *
   * @param userId - User ID
   * @param categoryId - Evaluation category ID
   * @param submissionId - Submission ID
   * @param tx - Optional Prisma transaction client
   * @returns Total vote count used in category
   */
  private async getTotalUserVotesInCategory(
    userId: number,
    categoryId: number,
    submissionId: number,
    tx?: PrismaTransaction,
  ): Promise<number> {
    const prisma = tx || this.prisma;

    const result = await prisma.evaluationCommentVote.aggregate({
      where: {
        userId,
        comment: {
          submissionId,
          categoryId,
        },
      },
      _sum: {
        voteCount: true,
      },
    });

    return result._sum.voteCount || 0;
  }

  /**
   * Vote on a comment with category-wide vote limits
   *
   * @description Implements 10-vote-per-category limit system with atomic transaction.
   * Users can distribute 10 votes across all comments in a category.
   * Authorization is checked before the transaction begins.
   *
   * @param commentId - Comment ID to vote on
   * @param isUpvote - true to add vote, false to remove vote
   * @param userId - User ID
   * @returns Vote operation result with updated category-wide limits
   * @throws NotFoundException if comment not found
   * @throws ForbiddenException if user lacks access to submission
   */
  async vote(commentId: number, isUpvote: boolean, userId: number): Promise<VoteLimitResponseDTO> {
    // Validate submission access BEFORE transaction (single query)
    await this.validateCommentAccess(commentId, userId);

    return await this.prisma.$transaction(async tx => {
      // 1. Get comment with category and submission info
      const comment = await tx.evaluationComment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          categoryId: true,
          submissionId: true,
        },
      });

      if (!comment) {
        throw new NotFoundException(`Comment with ID ${commentId} not found`);
      }

      // 2. Get existing vote for this specific comment
      const existingVote = await tx.evaluationCommentVote.findUnique({
        where: {
          unique_evaluation_comment_vote: {
            commentId,
            userId,
          },
        },
      });

      const voteValue = isUpvote ? 1 : -1;
      const currentVoteCountThisComment = existingVote?.voteCount || 0;
      const newVoteCountThisComment = currentVoteCountThisComment + voteValue;

      // 3. Calculate TOTAL votes across entire category
      const currentTotalVotesInCategory = await this.getTotalUserVotesInCategory(
        userId,
        comment.categoryId,
        comment.submissionId,
        tx,
      );

      const newTotalVotesInCategory = currentTotalVotesInCategory + voteValue;

      // 4. Validate: Can't go below 0 on this specific comment
      if (newVoteCountThisComment < 0) {
        return {
          success: false,
          userVoteCount: currentVoteCountThisComment,
          voteLimitStatus: {
            maxVotes: 10,
            remainingVotes: 10 - currentTotalVotesInCategory,
            votedCommentIds: [commentId],
            canVote: currentTotalVotesInCategory < 10,
            displayText: `${currentTotalVotesInCategory}/10 vergeben`,
          },
          message: 'Keine negativen Votes möglich',
        };
      }

      // 5. Validate: Total votes in category can't exceed 10
      if (newTotalVotesInCategory > 10) {
        return {
          success: false,
          userVoteCount: currentVoteCountThisComment,
          voteLimitStatus: {
            maxVotes: 10,
            remainingVotes: 10 - currentTotalVotesInCategory,
            votedCommentIds: [commentId],
            canVote: false,
            displayText: `${currentTotalVotesInCategory}/10 vergeben (Limit erreicht)`,
          },
          message: `Sie haben bereits ${currentTotalVotesInCategory} von 10 Votes in dieser Kategorie vergeben`,
        };
      }

      // 6. Perform vote operation (atomic upsert)
      const updatedVote = await tx.evaluationCommentVote.upsert({
        where: {
          unique_evaluation_comment_vote: {
            commentId,
            userId,
          },
        },
        update: {
          voteCount: newVoteCountThisComment,
        },
        create: {
          commentId,
          userId,
          voteCount: newVoteCountThisComment,
        },
      });

      // 7. Get all voted comment IDs in this category for DTO
      const votedComments = await tx.evaluationCommentVote.findMany({
        where: {
          userId,
          comment: {
            submissionId: comment.submissionId,
            categoryId: comment.categoryId,
          },
        },
        select: { commentId: true },
      });

      // 8. Build response with category-wide limits
      const remainingVotes = 10 - newTotalVotesInCategory;

      return {
        success: true,
        userVoteCount: updatedVote.voteCount,
        voteLimitStatus: {
          maxVotes: 10,
          remainingVotes,
          votedCommentIds: votedComments.map(v => v.commentId),
          canVote: remainingVotes > 0,
          displayText: `${newTotalVotesInCategory}/10 vergeben`,
        },
        message: `Vote ${
          isUpvote ? 'hinzugefügt' : 'entfernt'
        }. ${remainingVotes} Votes verbleibend in dieser Kategorie.`,
      };
    });
  }

  async getVotes(commentId: number, userId: number): Promise<VoteCountResponseDTO> {
    // Validate submission access
    await this.validateCommentAccess(commentId, userId);

    const votes = await this.prisma.evaluationCommentVote.findMany({
      where: { commentId },
    });

    const totalVotes = votes.reduce((acc, vote) => {
      return acc + (vote.userId === userId ? 0 : vote.voteCount);
    }, 0);

    const userVote = votes.find(vote => vote.userId === userId);
    const userVoteCount = userVote?.voteCount || 0;

    return {
      foreignVoteCount: totalVotes,
      userVoteCount,
    };
  }

  async resetUserVotes(submissionId: number, categoryId: number, userId: number): Promise<void> {
    // Delete all votes by this user in this category using nested where condition
    await this.prisma.evaluationCommentVote.deleteMany({
      where: {
        userId,
        comment: {
          submissionId,
          categoryId,
        },
      },
    });
  }

  /**
   * Get current vote limit status for a user in a category
   *
   * @description Returns detailed vote limit information including:
   * - Total votes available (10)
   * - Votes already used in category
   * - Remaining votes
   * - List of voted comment IDs
   *
   * @param userId - User ID
   * @param categoryId - Evaluation category ID
   * @param submissionId - Submission ID
   * @returns Current vote limit status for the category
   */
  async getVoteLimitStatus(
    userId: number,
    categoryId: number,
    submissionId: number,
  ): Promise<VoteLimitStatusDTO> {
    // Calculate total votes used in category
    const totalVotesUsed = await this.getTotalUserVotesInCategory(userId, categoryId, submissionId);

    // Get all voted comment IDs
    const votedComments = await this.prisma.evaluationCommentVote.findMany({
      where: {
        userId,
        comment: {
          submissionId,
          categoryId,
        },
      },
      select: { commentId: true },
    });

    const remainingVotes = 10 - totalVotesUsed;

    return {
      maxVotes: 10,
      remainingVotes,
      votedCommentIds: votedComments.map(v => v.commentId),
      canVote: remainingVotes > 0,
      displayText: `${totalVotesUsed}/10 vergeben`,
    };
  }

  /**
   * Creates a comment from a rating
   * Used when users submit a rating with comment text
   */
  async createCommentFromRating(
    submissionId: number,
    categoryId: number,
    userId: number,
    content: string,
    score: number,
  ): Promise<void> {
    await this.prisma.evaluationComment.create({
      data: {
        content: `[Rating: ${score}/10] ${content}`,
        userId,
        submissionId,
        categoryId,
        parentId: null,
      },
    });
  }

  /**
   * Updates an existing comment that was created from a rating
   * Used when users update their rating with new comment text
   */
  async updateCommentFromRating(
    submissionId: number,
    categoryId: number,
    userId: number,
    content: string,
    score: number,
  ): Promise<void> {
    // Find the user's comment in this category
    const existingComment = await this.prisma.evaluationComment.findFirst({
      where: {
        submissionId,
        categoryId,
        userId,
        content: {
          startsWith: '[Rating:',
        },
      },
    });

    if (existingComment) {
      await this.prisma.evaluationComment.update({
        where: { id: existingComment.id },
        data: {
          content: `[Rating: ${score}/10] ${content}`,
        },
      });
    } else {
      // If no existing comment, create a new one
      await this.createCommentFromRating(submissionId, categoryId, userId, content, score);
    }
  }

  /**
   * Get user comment status for all categories in a submission
   *
   * @description Efficient single-query approach to check which categories
   * the user has commented in. Essential for proper state initialization
   * after page refreshes, including auto-created rating comments.
   *
   * Performance: Uses GROUP BY aggregation instead of N+1 queries.
   *
   * @param submissionId - The submission ID
   * @param userId - The user ID
   * @returns Map of categoryId to hasCommented boolean
   */
  async getUserCommentStatusForAllCategories(
    submissionId: number,
    userId: number,
  ): Promise<CommentStatusMapDTO> {
    try {
      // Single optimized query: group comments by category and check user participation
      const commentsByCategory = await this.prisma.evaluationComment.groupBy({
        by: ['categoryId'],
        where: {
          submissionId,
          userId,
        },
        _count: {
          id: true,
        },
      });

      // Transform to map: categoryId -> hasCommented
      const statusMap: CommentStatusMapDTO = {};
      for (const category of commentsByCategory) {
        statusMap[category.categoryId] = category._count.id > 0;
      }

      return statusMap;
    } catch (error) {
      // Log error without sensitive data (GDPR compliant, no stack traces)
      this.logger.error(
        'Failed to load comment status for all categories',
        error instanceof Error ? error.name : 'UnknownError',
      );

      // In development: Log full details for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.error('[DEV] Full error details:', {
          submissionId,
          userId,
          error: error instanceof Error ? error.stack : error,
        });
      }

      // BLOCKER #6 FIX: Throw error instead of returning {} to prevent data integrity issues
      throw new InternalServerErrorException('Failed to load comment status');
    }
  }
}
