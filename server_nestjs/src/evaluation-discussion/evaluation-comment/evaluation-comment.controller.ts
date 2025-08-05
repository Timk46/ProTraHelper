/* eslint-disable @typescript-eslint/require-await */
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { EvaluationCommentService } from './evaluation-comment.service';
import { EvaluationCommentDTO, UserVoteResponseDTO } from '@DTOs/index';
import { CreateEvaluationCommentDTO, UpdateEvaluationCommentDTO } from '@DTOs/index';

import { GetUser } from '../../auth/common/decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('evaluation-comments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationCommentController {
  constructor(private readonly evaluationCommentService: EvaluationCommentService) {}

  @Get()
  @roles('ANY')
  async findBySubmission(
    @Query('submissionId') submissionId: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<EvaluationCommentDTO[]> {
    return this.evaluationCommentService.findBySubmission(
      submissionId,
      categoryId ? Number(categoryId) : undefined,
    );
  }

  @Get(':id')
  @roles('ANY')
  async findOne(@Param('id') id: string): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.findOne(id);
  }

  @Post()
  @roles('ANY')
  async create(
    @Body() createDto: CreateEvaluationCommentDTO,
    @GetUser() user: User,
  ): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.create(createDto, user.id);
  }

  @Put(':id')
  @roles('ANY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationCommentDTO,
    @GetUser() user: User,
  ): Promise<EvaluationCommentDTO> {
    return this.evaluationCommentService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @roles('ANY')
  async remove(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    return this.evaluationCommentService.remove(id, user.id);
  }

  @Get(':id/replies')
  @roles('ANY')
  async getReplies(@Param('id') parentId: string): Promise<EvaluationCommentDTO[]> {
    // Get the parent comment with all its replies
    const parentComment = await this.evaluationCommentService.findOne(parentId);
    return parentComment.replies;
  }

  @Post(':id/vote')
  @roles('ANY')
  async vote(
    @Param('id') id: string,
    @Body() body: { voteType: 'UP' | 'DOWN' | null },
    @GetUser() user: User,
  ) {
    return this.evaluationCommentService.vote(id, body.voteType, user.id);
  }

  @Get(':id/votes')
  @roles('ANY')
  async getVotes(@Param('id') id: string, @GetUser() user: User) {
    return this.evaluationCommentService.getVotes(id, user.id);
  }

  @Get(':id/user-vote')
  @roles('ANY')
  async getUserVote(@Param('id') id: string, @GetUser() user: User): Promise<UserVoteResponseDTO> {
    const voteType = await this.evaluationCommentService.getUserVoteForComment(id, user.id);
    return { voteType };
  }
}
