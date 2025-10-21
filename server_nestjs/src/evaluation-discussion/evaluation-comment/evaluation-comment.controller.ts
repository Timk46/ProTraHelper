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
} from '@nestjs/common';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { EvaluationCommentService } from './evaluation-comment.service';
import {
  EvaluationCommentDTO,
  VoteCountResponseDTO,
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
  async create(@Body() createDto: CreateEvaluationCommentDTO, @Req() req): Promise<boolean> {
    return this.evaluationCommentService.create(createDto, req.user.id);
  }

  // Comment delete
  @Delete('delete/:commentId')
  @roles('ANY')
  async remove(@Param('commentId', ParseIntPipe) commentId: number, @GetUser() user: User): Promise<boolean> {
    return this.evaluationCommentService.remove(commentId, user.id);
  }

  // Comment update
  @Put('update/:commentId')
  @roles('ANY')
  async update(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateDto: UpdateEvaluationCommentDTO,
    @Req() req,
  ): Promise<boolean> {
    return this.evaluationCommentService.update(commentId, updateDto, req.user.id);
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

  // Vote on comment (without limit check)
  @Post('votes/vote/:commentId')
  @roles('ANY')
  async vote(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: { isUpvote: boolean },
    @Req() req,
  ): Promise<boolean> {
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
  @roles('ANY')
  async resetUserVotes(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req,
  ): Promise<boolean> {
    return this.evaluationCommentService.resetUserVotes(submissionId, categoryId, req.user.id);
  }
}
