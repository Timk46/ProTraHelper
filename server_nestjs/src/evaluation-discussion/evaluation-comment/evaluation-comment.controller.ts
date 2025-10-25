/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { SubmissionAuthorizationGuard } from '../guards/submission-authorization.guard';
import { AuthorizedSubmission } from '../decorators/authorized-submission.decorator';
import { EvaluationCommentService } from './evaluation-comment.service';
import {
  EvaluationCommentDTO,
  VoteCountResponseDTO,
  VoteLimitResponseDTO,
  VoteLimitStatusDTO,
  CommentStatusMapDTO,
} from '@DTOs/index';
import { CreateEvaluationCommentDTO, UpdateEvaluationCommentDTO } from '@DTOs/index';

import { GetUser } from '../../auth/common/decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('evaluation-comments')
@UseGuards(RolesGuard, SubmissionAuthorizationGuard)
export class EvaluationCommentController {
  constructor(private readonly evaluationCommentService: EvaluationCommentService) {}

  // Comment create
  /**
   * Creates a new comment or reply
   * @security Protected by @AuthorizedSubmission (body) - verifies group membership
   */
  @Post('create')
  @roles('ANY')
  @AuthorizedSubmission('submissionId', 'body')
  async create(
    @Body() createDto: CreateEvaluationCommentDTO,
    @GetUser() user: User,
  ): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.create(createDto, user.id);
  }

  // Comment delete
  /**
   * Deletes a comment
   * @security Authorization checked in service layer
   */
  @Delete('delete/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @roles('ANY')
  async remove(
    @Param('commentId', ParseIntPipe) commentId: number,
    @GetUser() user: User,
  ): Promise<void> {
    await this.evaluationCommentService.remove(commentId, user.id);
  }

  // Comment update
  /**
   * Updates a comment
   * @security Authorization checked in service layer
   */
  @Put('update/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @roles('ANY')
  async update(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateDto: UpdateEvaluationCommentDTO,
    @GetUser() user: User,
  ): Promise<void> {
    await this.evaluationCommentService.update(commentId, updateDto, user.id);
  }

  // Get by submission + category
  /**
   * Gets all comments for a specific submission and category
   *
   * @security Protected by @AuthorizedSubmission - verifies group membership
   * Users can only access comments from submissions they have permission to view.
   *
   * @param submissionId - The submission ID
   * @param categoryId - The evaluation category ID
   * @param user - Current authenticated user
   * @returns Array of comments for the category
   * @throws {ForbiddenException} If user lacks access to the submission
   */
  @Get('get/:submissionId/:categoryId')
  @roles('ANY')
  @AuthorizedSubmission()
  async getAllByCategory(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @GetUser() user: User,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.getAllByCategory(submissionId, categoryId, user.id);
  }

  // Get replies for comment
  /**
   * Gets all replies for a comment
   * @security Authorization checked in service layer
   */
  @Get('replies/:commentId')
  @roles('ANY')
  async getReplies(
    @Param('commentId', ParseIntPipe) parentId: number,
    @GetUser() user: User,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.getReplies(parentId, user.id);
  }

  // Vote on comment with limit enforcement
  /**
   * Votes on a comment (upvote or downvote)
   * @security Authorization checked in service layer
   */
  @Post('votes/vote/:commentId')
  @roles('ANY')
  async vote(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: { isUpvote: boolean },
    @GetUser() user: User,
  ): Promise<VoteLimitResponseDTO> {
    return this.evaluationCommentService.vote(commentId, body.isUpvote, user.id);
  }

  // Get votes for comment (including user's vote in a separate parameter)
  /**
   * Gets vote counts for a comment
   * @security Authorization checked in service layer
   */
  @Get('votes/get/:commentId')
  @roles('ANY')
  async getVotes(
    @Param('commentId', ParseIntPipe) commentId: number,
    @GetUser() user: User,
  ): Promise<VoteCountResponseDTO> {
    return this.evaluationCommentService.getVotes(commentId, user.id);
  }

  // Reset own votes in category
  @Delete('votes/reset/:submissionId/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @roles('ANY')
  @AuthorizedSubmission()
  async resetUserVotes(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @GetUser() user: User,
  ): Promise<void> {
    await this.evaluationCommentService.resetUserVotes(submissionId, categoryId, user.id);
  }

  // Get vote limit status for a category
  @Get('vote-limit/:submissionId/:categoryId')
  @roles('ANY')
  @AuthorizedSubmission()
  async getVoteLimitStatus(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @GetUser() user: User,
  ): Promise<VoteLimitStatusDTO> {
    return this.evaluationCommentService.getVoteLimitStatus(user.id, categoryId, submissionId);
  }

  // Get user comment status for all categories
  @Get('comment-status/:submissionId')
  @roles('ANY')
  @AuthorizedSubmission()
  async getUserCommentStatusForAllCategories(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @GetUser() user: User,
  ): Promise<CommentStatusMapDTO> {
    return this.evaluationCommentService.getUserCommentStatusForAllCategories(
      submissionId,
      user.id,
    );
  }
}
