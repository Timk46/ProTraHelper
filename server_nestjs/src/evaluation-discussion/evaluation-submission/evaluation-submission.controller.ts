import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { EvaluationSubmissionService } from './evaluation-submission.service';
import { CreateEvaluationSubmissionDTO, UpdateEvaluationSubmissionDTO, EvaluationSubmissionDTO, CommentStatsDTO, EvaluationSessionDTO } from '@DTOs/index';

@Controller('evaluation-submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationSubmissionController {
  constructor(private readonly evaluationSubmissionService: EvaluationSubmissionService) {}

  @Get()
  @roles('ANY')
  async findAll(@Query('sessionId') sessionId?: string): Promise<EvaluationSubmissionDTO[]> {
    return this.evaluationSubmissionService.findAll(sessionId ? Number(sessionId) : undefined);
  }

  @Get(':id')
  @roles('ANY')
  async findOne(@Param('id') id: string): Promise<EvaluationSubmissionDTO> {
    return this.evaluationSubmissionService.findOne(id);
  }

  @Post()
  @roles('STUDENT', 'TEACHER', 'ADMIN')
  async create(@Body() createDto: CreateEvaluationSubmissionDTO, @Req() req: any): Promise<EvaluationSubmissionDTO> {
    return this.evaluationSubmissionService.create(createDto, req.user.id);
  }

  @Put(':id')
  @roles('STUDENT', 'TEACHER', 'ADMIN')
  async update(@Param('id') id: string, @Body() updateDto: UpdateEvaluationSubmissionDTO, @Req() req: any): Promise<EvaluationSubmissionDTO> {
    return this.evaluationSubmissionService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @roles('STUDENT', 'TEACHER', 'ADMIN')
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.evaluationSubmissionService.remove(id, req.user.id);
  }

  @Get(':id/pdf')
  @roles('ANY')
  async getPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const fileStream = await this.evaluationSubmissionService.getPdfStream(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="submission-${id}.pdf"`,
    });
    fileStream.pipe(res);
  }

  @Get(':id/discussions')
  @roles('ANY')
  async getDiscussions(@Param('id') id: string, @Query('categoryId') categoryId?: string) {
    return this.evaluationSubmissionService.getDiscussions(id, categoryId ? Number(categoryId) : undefined);
  }

  @Get(':id/stats')
  @roles('ANY')
  async getStats(@Param('id') id: string) {
    return this.evaluationSubmissionService.getStats(id);
  }

  @Get(':id/anonymous-user')
  @roles('ANY')
  async getAnonymousUser(@Param('id') id: string, @Req() req: any) {
    return this.evaluationSubmissionService.getAnonymousUser(id, req.user.id);
  }

  /**
   * Get comment statistics for a submission
   * 
   * @description Retrieves detailed statistics about comments/discussions for a specific submission,
   * including per-category availability and usage limits for the current user.
   * This is essential for implementing comment limits and progress tracking.
   * 
   * @param id - The ID of the evaluation submission
   * @param req - Request object containing user information
   * @returns Promise resolving to comment statistics including per-category limits and usage
   * 
   * @example
   * GET /evaluation-submissions/abc123/comment-stats
   * Returns: { submissionId: 'abc123', totalAvailable: 12, totalUsed: 8, categories: [...] }
   */
  @Get(':id/comment-stats')
  @roles('ANY')
  async getCommentStats(@Param('id') id: string, @Req() req: any): Promise<CommentStatsDTO> {
    return this.evaluationSubmissionService.getCommentStats(id, req.user.id);
  }

  /**
   * Switch the phase of the evaluation session for this submission
   * 
   * @description Alternative endpoint to switch the phase of an evaluation session.
   * This endpoint is submission-centric, allowing users to switch the phase
   * from within the context of viewing a specific submission.
   * 
   * @param id - The ID of the evaluation submission
   * @param body - Object containing the target phase ('DISCUSSION' or 'EVALUATION')
   * @returns Promise resolving to the updated evaluation session
   * 
   * @example
   * POST /evaluation-submissions/abc123/switch-phase
   * Body: { "phase": "EVALUATION" }
   * Returns: { id: 456, phase: "EVALUATION", ... }
   */
  @Post(':id/switch-phase')
  @roles('TEACHER', 'ADMIN')
  async switchPhase(@Param('id') id: string, @Body() body: { phase: 'DISCUSSION' | 'EVALUATION' }): Promise<EvaluationSessionDTO> {
    return this.evaluationSubmissionService.switchPhase(id, body.phase);
  }
}