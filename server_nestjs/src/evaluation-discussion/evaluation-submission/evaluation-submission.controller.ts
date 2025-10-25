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
  Req,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { AuthenticatedRequest } from '../../auth/common/interfaces';
import { EvaluationSubmissionService } from './evaluation-submission.service';
import { EvaluationAuthorizationService } from '../evaluation-authorization.service';
import { EvaluationSubmissionDTO, CommentStatsDTO, EvaluationSessionDTO } from '@DTOs/index';
import { CreateEvaluationSubmissionDTO, UpdateEvaluationSubmissionDTO } from '@DTOs/index';

@Controller('evaluation-submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationSubmissionController {
  constructor(
    private readonly evaluationSubmissionService: EvaluationSubmissionService,
    private readonly authorizationService: EvaluationAuthorizationService,
  ) {}

  @Get()
  @roles('ANY')
  async findAll(@Query('sessionId') sessionId?: string): Promise<EvaluationSubmissionDTO[]> {
    return this.evaluationSubmissionService.findAll(sessionId ? Number(sessionId) : undefined);
  }

  /**
   * Create a new evaluation submission
   *
   * @description Creates a new submission for the authenticated user.
   *
   * **Authorization Strategy**: Users can always create their own submissions.
   * No group-based authorization check is required at creation time.
   * Group membership affects who can VIEW the submission (enforced in GET endpoints).
   *
   * @param createDto - Submission creation data
   * @param req - Authenticated request with user information
   * @returns Promise resolving to the created submission DTO
   */
  @Post()
  @roles('STUDENT', 'TEACHER', 'ADMIN')
  async create(
    @Body() createDto: CreateEvaluationSubmissionDTO,
    @Req() req: AuthenticatedRequest,
  ): Promise<EvaluationSubmissionDTO> {
    return this.evaluationSubmissionService.create(createDto, req.user.id);
  }

  /**
   * Get submission PDF file
   *
   * @description Retrieves the PDF file for a specific submission.
   * Access is controlled by group-based authorization.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param req - Authenticated request with user information
   * @param res - Express response object for streaming the PDF
   * @throws {NotFoundException} If submission does not exist
   * @throws {ForbiddenException} If user does not have access to the submission (not in same group)
   */
  @Get(':id/pdf')
  @roles('ANY')
  async getPdf(
    @Param('id', ParseIntPipe) submissionId: number,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.authorizationService.checkAccessOrThrow(submissionId, req.user.id);

    const fileStream = await this.evaluationSubmissionService.getPdfStream(submissionId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="submission-${submissionId}.pdf"`,
    });
    fileStream.pipe(res);
  }

  /**
   * Get discussions for a submission
   *
   * @description Retrieves all discussions/comments for a specific submission,
   * optionally filtered by category. Access is controlled by group-based authorization.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param req - Authenticated request with user information
   * @param categoryId - Optional category ID to filter discussions
   * @throws {NotFoundException} If submission does not exist
   * @throws {ForbiddenException} If user does not have access to the submission (not in same group)
   */
  @Get(':id/discussions')
  @roles('ANY')
  async getDiscussions(
    @Param('id', ParseIntPipe) submissionId: number,
    @Req() req: AuthenticatedRequest,
    @Query('categoryId') categoryId?: string,
  ) {
    await this.authorizationService.checkAccessOrThrow(submissionId, req.user.id);

    return this.evaluationSubmissionService.getDiscussions(
      submissionId,
      categoryId ? Number(categoryId) : undefined,
    );
  }

  /**
   * Get statistics for a submission
   *
   * @description Retrieves statistical information about a specific submission.
   * Access is controlled by group-based authorization.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param req - Authenticated request with user information
   * @throws {NotFoundException} If submission does not exist
   * @throws {ForbiddenException} If user does not have access to the submission (not in same group)
   */
  @Get(':id/stats')
  @roles('ANY')
  async getStats(
    @Param('id', ParseIntPipe) submissionId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.authorizationService.checkAccessOrThrow(submissionId, req.user.id);

    return this.evaluationSubmissionService.getStats(submissionId);
  }

  /**
   * Get anonymous user information for a submission
   *
   * @description Retrieves the anonymous user identifier for the current user
   * in the context of a specific submission. Access is controlled by group-based authorization.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param req - Authenticated request with user information
   * @throws {NotFoundException} If submission does not exist
   * @throws {ForbiddenException} If user does not have access to the submission (not in same group)
   */
  @Get(':id/anonymous-user')
  @roles('ANY')
  async getAnonymousUser(
    @Param('id', ParseIntPipe) submissionId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.authorizationService.checkAccessOrThrow(submissionId, req.user.id);

    return this.evaluationSubmissionService.getAnonymousUser(submissionId, req.user.id);
  }

  /**
   * Get comment statistics for a submission
   *
   * @description Retrieves detailed statistics about comments/discussions for a specific submission,
   * including per-category availability and usage limits for the current user.
   * This is essential for implementing comment limits and progress tracking.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param req - Authenticated request with user information
   * @returns Promise resolving to comment statistics including per-category limits and usage
   * @throws {NotFoundException} If submission does not exist
   * @throws {ForbiddenException} If user does not have access to the submission (not in same group)
   *
   * @example
   * GET /evaluation-submissions/abc123/comment-stats
   * Returns: { submissionId: 'abc123', totalAvailable: 12, totalUsed: 8, categories: [...] }
   */
  @Get(':id/comment-stats')
  @roles('ANY')
  async getCommentStats(
    @Param('id', ParseIntPipe) submissionId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<CommentStatsDTO> {
    await this.authorizationService.checkAccessOrThrow(submissionId, req.user.id);

    return this.evaluationSubmissionService.getCommentStats(submissionId, req.user.id);
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
  async switchPhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { phase: 'DISCUSSION' | 'EVALUATION' },
  ): Promise<EvaluationSessionDTO> {
    return this.evaluationSubmissionService.switchPhase(id, body.phase);
  }

  /**
   * Update an existing submission
   *
   * @description Updates a submission owned by the authenticated user.
   *
   * **Authorization Strategy**: Ownership check performed in service layer.
   * Only the submission author can update their own submission.
   * Group-based authorization is not required for update operations.
   *
   * @param id - Submission ID to update
   * @param updateDto - Update data
   * @param req - Authenticated request with user information
   * @returns Promise resolving to the updated submission DTO
   * @throws {ForbiddenException} If user is not the author of the submission
   */
  @Put(':id')
  @roles('STUDENT', 'TEACHER', 'ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEvaluationSubmissionDTO,
    @Req() req: AuthenticatedRequest,
  ): Promise<EvaluationSubmissionDTO> {
    return this.evaluationSubmissionService.update(id, updateDto, req.user.id);
  }

  /**
   * Delete a submission
   *
   * @description Deletes a submission owned by the authenticated user.
   *
   * **Authorization Strategy**: Ownership check performed in service layer.
   * Only the submission author can delete their own submission.
   * Group-based authorization is not required for delete operations.
   *
   * @param id - Submission ID to delete
   * @param req - Authenticated request with user information
   * @throws {ForbiddenException} If user is not the author of the submission
   */
  @Delete(':id')
  @roles('STUDENT', 'TEACHER', 'ADMIN')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.evaluationSubmissionService.remove(id, req.user.id);
  }

  /**
   * Get a specific submission by ID
   *
   * @description Retrieves detailed information about a specific evaluation submission.
   * Access is controlled by group-based authorization.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param req - Authenticated request with user information
   * @returns Promise resolving to the submission DTO
   * @throws {NotFoundException} If submission does not exist
   * @throws {ForbiddenException} If user does not have access to the submission (not in same group)
   */
  @Get(':id')
  @roles('ANY')
  async findOne(
    @Param('id', ParseIntPipe) submissionId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<EvaluationSubmissionDTO> {
    await this.authorizationService.checkAccessOrThrow(submissionId, req.user.id);

    return this.evaluationSubmissionService.findOne(submissionId);
  }
}
