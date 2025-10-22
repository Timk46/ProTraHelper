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
@UseGuards(RolesGuard)
export class EvaluationCommentController {

  constructor(private readonly evaluationCommentService: EvaluationCommentService) {}

  // Comment create
  @Post('create')
  @roles('ANY')
  async create(
    @Body() createDto: CreateEvaluationCommentDTO,
    @GetUser() user: User
  ): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.create(createDto, user.id);
  }

  // Comment delete
  @Delete('delete/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @roles('ANY')
  async remove(@Param('commentId', ParseIntPipe) commentId: number, @GetUser() user: User): Promise<void> {
    await this.evaluationCommentService.remove(commentId, user.id);
  }

  // Comment update
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
  @Get('get/:submissionId/:categoryId')
  @roles('ANY')
  async getAllByCategory(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @GetUser() user: User,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.getAllByCategory(submissionId, categoryId, user.id);
  }

  // Get replies for comment
  @Get('replies/:commentId')
  @roles('ANY')
  async getReplies(
    @Param('commentId', ParseIntPipe) parentId: number,
    @GetUser() user: User,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.getReplies(parentId, user.id);
  }

  // Vote on comment with limit enforcement
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
  @Get('votes/get/:commentId')
  @roles('ANY')
  async getVotes(
    @Param('commentId', ParseIntPipe) commentId: number,
    @GetUser() user: User): Promise<VoteCountResponseDTO> {
    return this.evaluationCommentService.getVotes(commentId, user.id);
  }

  // Reset own votes in category
  @Delete('votes/reset/:submissionId/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @roles('ANY')
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
  async getUserCommentStatusForAllCategories(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @GetUser() user: User,
  ): Promise<CommentStatusMapDTO> {
    return this.evaluationCommentService.getUserCommentStatusForAllCategories(submissionId, user.id);
  }
}
