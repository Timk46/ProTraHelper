/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import {
  CreateEvaluationCommentDTO,
  UpdateEvaluationCommentDTO,
  EvaluationCommentDTO,
  VoteCountResponseDTO,
} from '@DTOs/index';
import { reduce } from 'lodash';

@Injectable()
export class EvaluationCommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createDto: CreateEvaluationCommentDTO, userId: number): Promise<boolean> {
    try {
      await this.prisma.evaluationComment.create({
        data: {
          content: createDto.content,
          userId: userId,
          submissionId: createDto.submissionId,
          categoryId: createDto.categoryId,
          parentId: createDto.parentId || null,
        },
      });

      return true;
    } catch (error) {
      console.error('Error creating evaluation comment:', error);
      return false;
    }
  }

  async remove(id: number, userId: number): Promise<boolean> {
    try {
      // Check if comment exists and belongs to the user
      const comment = await this.prisma.evaluationComment.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!comment) {
        console.error('Comment not found');
        return false;
      }

      if (comment.userId !== userId) {
        console.error('User not authorized to delete this comment');
        return false;
      }

      await this.prisma.evaluationComment.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('Error deleting evaluation comment:', error);
      return false;
    }
  }

  async update(
    id: number,
    updateDto: UpdateEvaluationCommentDTO,
    userId: number,
  ): Promise<boolean> {
    try {
      // Check if comment exists and belongs to the user
      const comment = await this.prisma.evaluationComment.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!comment) {
        console.error('Comment not found');
        return false;
      }

      if (comment.userId !== userId) {
        console.error('User not authorized to update this comment');
        return false;
      }

      await this.prisma.evaluationComment.update({
        where: { id },
        data: {
          content: updateDto.content,
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating evaluation comment:', error);
      return false;
    }
  }

  async getAllByCategory(
    submissionId: number,
    categoryId: number,
    userId: number,
  ): Promise<EvaluationCommentDTO[]> {
    try {
      const comments = await this.prisma.evaluationComment.findMany({
        where: {
          submissionId,
          categoryId,
        },
        include: {
          EvaluationCommentVote: true,
        },
      });

      return comments.map(comment => this.mapToCommentDTO(comment, userId));
    } catch (error) {
      console.error('Error getting comments by category:', error);
      return [];
    }
  }

  async getReplies(parentId: number, userId: number): Promise<EvaluationCommentDTO[]> {
    try {
      const replies = await this.prisma.evaluationComment.findMany({
        where: {
          parentId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          EvaluationCommentVote: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return replies.map(reply => this.mapToCommentDTO(reply, userId));
    } catch (error) {
      console.error('Error getting comment replies:', error);
      return [];
    }
  }

  private mapToCommentDTO(comment: any, userId: number): EvaluationCommentDTO {
    const voteCount = comment.EvaluationCommentVote.reduce((acc, vote) => {
      return acc + (vote.userId === userId ? 0 : vote.voteCount);
    }, 0);
    const userVoteCount =
      comment.EvaluationCommentVote.find(vote => vote.userId === userId)?.voteCount || 0;

    return {
      id: comment.id,
      submissionId: comment.submissionId,
      categoryId: comment.categoryId,
      authorId: comment.userId,
      content: comment.content,
      parentId: comment.parentId,
      voteCount,
      userVoteCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  async vote(commentId: number, isUpvote: boolean, userId: number): Promise<boolean> {
    try {
      // Check if comment exists
      const comment = await this.prisma.evaluationComment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        console.error('Comment not found');
        return false;
      }

      // Find existing vote
      const existingVote = await this.prisma.evaluationCommentVote.findUnique({
        where: {
          unique_evaluation_comment_vote: {
            commentId,
            userId,
          },
        },
      });

      const voteValue = isUpvote ? 1 : -1;

      if (existingVote) {
        // Update existing vote
        await this.prisma.evaluationCommentVote.update({
          where: {
            id: existingVote.id,
          },
          data: {
            voteCount: existingVote.voteCount + voteValue,
          },
        });
      } else {
        // Create new vote
        await this.prisma.evaluationCommentVote.create({
          data: {
            commentId,
            userId,
            voteCount: voteValue,
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Error voting on comment:', error);
      return false;
    }
  }

  async getVotes(commentId: number, userId: number): Promise<VoteCountResponseDTO> {
    try {
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
    } catch (error) {
      console.error('Error getting votes:', error);
      return {
        foreignVoteCount: 0,
        userVoteCount: 0,
      };
    }
  }

  async resetUserVotes(submissionId: number, categoryId: number, userId: number): Promise<boolean> {
    try {
      // Get all comments in this category for this submission
      const comments = await this.prisma.evaluationComment.findMany({
        where: {
          submissionId,
          categoryId,
        },
        select: { id: true },
      });

      const commentIds = comments.map(comment => comment.id);

      // Delete all votes by this user on these comments
      await this.prisma.evaluationCommentVote.deleteMany({
        where: {
          commentId: { in: commentIds },
          userId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error resetting user votes:', error);
      return false;
    }
  }
}
