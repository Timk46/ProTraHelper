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
  Req,
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
  async create(@Body() createDto: CreateEvaluationCommentDTO, @Req() req): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.create(createDto, req.user.id);
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
    @Req() req,
  ): Promise<void> {
    await this.evaluationCommentService.update(commentId, updateDto, req.user.id);
  }

  // Get by submission + category
  @Get('get/:submissionId/:categoryId')
  @roles('ANY')
  async getAllByCategory(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.getAllByCategory(submissionId, categoryId, req.user.id);
  }

  // Get replies for comment
  @Get('replies/:commentId')
  @roles('ANY')
  async getReplies(
    @Param('commentId', ParseIntPipe) parentId: number,
    @Req() req,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.getReplies(parentId, req.user.id);
  }

  // Vote on comment with limit enforcement
  @Post('votes/vote/:commentId')
  @roles('ANY')
  async vote(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: { isUpvote: boolean },
    @Req() req,
  ): Promise<VoteLimitResponseDTO> {
    return this.evaluationCommentService.vote(commentId, body.isUpvote, req.user.id);
  }

  // Get votes for comment (including user's vote in a separate parameter)
  @Get('votes/get/:commentId')
  @roles('ANY')
  async getVotes(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req): Promise<VoteCountResponseDTO> {
    return this.evaluationCommentService.getVotes(commentId, req.user.id);
  }

  // Reset own votes in category
  @Delete('votes/reset/:submissionId/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @roles('ANY')
  async resetUserVotes(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req,
  ): Promise<void> {
    await this.evaluationCommentService.resetUserVotes(submissionId, categoryId, req.user.id);
  }

  // Get vote limit status for a category
  @Get('vote-limit/:submissionId/:categoryId')
  @roles('ANY')
  async getVoteLimitStatus(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req,
  ): Promise<VoteLimitStatusDTO> {
    return this.evaluationCommentService.getVoteLimitStatus(req.user.id, categoryId, submissionId);
  }
}
