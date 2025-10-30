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
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { AuthenticatedRequest } from '../../auth/common/interfaces';
import { EvaluationRatingService } from './evaluation-rating.service';
import { EvaluationRatingDTO, CategoryRatingStatus } from '@DTOs/index';
import { CreateEvaluationRatingDTO, UpdateEvaluationRatingDTO } from '@DTOs/index';
import { ParseIntPipe } from '../../common/pipes/parse-int.pipe';

@Controller('evaluation-ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationRatingController {
  private readonly logger = new Logger(EvaluationRatingController.name);

  constructor(private readonly evaluationRatingService: EvaluationRatingService) {}

  @Post()
  @roles('ANY')
  async rate(
    @Body() ratingDto: CreateEvaluationRatingDTO,
    @Req() req: AuthenticatedRequest,
  ): Promise<EvaluationRatingDTO> {
    return this.evaluationRatingService.rate(ratingDto, req.user.id);
  }

  @Put(':id')
  @roles('ANY')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEvaluationRatingDTO,
    @Req() req: AuthenticatedRequest,
  ): Promise<EvaluationRatingDTO> {
    return this.evaluationRatingService.update(id, updateDto, req.user.id);
  }

  @Get('submission/:submissionId')
  @roles('ANY')
  async getSubmissionRatings(
    @Param('submissionId', ParseIntPipe) submissionId: number,
  ): Promise<EvaluationRatingDTO[]> {
    return this.evaluationRatingService.getSubmissionRatings(submissionId);
  }

  @Get('category/:categoryId')
  @roles('ANY')
  async getCategoryRatings(
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<EvaluationRatingDTO[]> {
    return this.evaluationRatingService.getCategoryRatings(categoryId);
  }

  @Get('submission/:submissionId/summary')
  @roles('ANY')
  async getRatingSummary(@Param('submissionId', ParseIntPipe) submissionId: number): Promise<any> {
    return this.evaluationRatingService.getRatingSummary(submissionId);
  }

  @Get('submission/:submissionId/user/:userId')
  @roles('ANY')
  async getUserRatings(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<EvaluationRatingDTO[]> {
    this.logger.debug(`Getting ratings for submission: ${submissionId}, user: ${userId}`);
    return this.evaluationRatingService.getUserRatings(submissionId, userId);
  }

  @Get('submission/:submissionId/category/:categoryId/stats')
  @roles('ANY')
  async getCategoryStats(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<any> {
    this.logger.debug(
      `Getting category stats for submission: ${submissionId}, category: ${categoryId}`,
    );
    return this.evaluationRatingService.getCategoryStats(submissionId, categoryId);
  }

  /**
   * Checks if the current user has rated a specific category for a submission
   *
   * @description This endpoint is used to determine if the user has access
   * to the discussion area for a specific category. Authentication is guaranteed
   * by JwtAuthGuard at controller level.
   *
   * @route GET /evaluation-ratings/submission/:submissionId/category/:categoryId/user
   * @param {string} submissionId - The submission ID to check
   * @param {string} categoryId - The category ID to check
   * @param {AuthenticatedRequest} req - Request object with authenticated user (guaranteed by JwtAuthGuard)
   * @returns {Promise<{hasRated: boolean}>} Object indicating if user has rated the category
   */
  @Get('submission/:submissionId/category/:categoryId/user')
  @roles('ANY')
  async hasUserRatedCategory(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ hasRated: boolean }> {
    const hasRated = await this.evaluationRatingService.hasUserRatedCategory(
      submissionId,
      categoryId,
      req.user.id,
    );
    return { hasRated };
  }

  /**
   * Gets the rating status for all categories for a specific user and submission
   *
   * @description This endpoint returns the complete rating status overview,
   * indicating which categories the user has rated and which discussions they can access.
   * Path parameter userId is validated by NestJS routing (cannot be empty).
   *
   * @route GET /evaluation-ratings/submission/:submissionId/user/:userId/status
   * @param {string} submissionId - The submission ID to check
   * @param {string} userId - The user ID to check (validated by routing)
   * @returns {Promise<CategoryRatingStatus[]>} Array of category rating statuses
   */
  @Get('submission/:submissionId/user/:userId/status')
  @roles('ANY')
  async getUserRatingStatus(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<CategoryRatingStatus[]> {
    return this.evaluationRatingService.getUserRatingStatus(submissionId, userId);
  }

  /**
   * Deletes a rating by category for the current user
   *
   * @description Removes the user's rating for a specific category and submission.
   * This enables the reset functionality in the frontend rating system.
   * Authentication is guaranteed by JwtAuthGuard at controller level.
   *
   * @route DELETE /evaluation-ratings/submission/:submissionId/category/:categoryId/user
   * @param {string} submissionId - The submission ID
   * @param {string} categoryId - The category ID
   * @param {AuthenticatedRequest} req - Request object with authenticated user (guaranteed by JwtAuthGuard)
   * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
   */
  @Delete('submission/:submissionId/category/:categoryId/user')
  @roles('ANY')
  async deleteUserRating(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    await this.evaluationRatingService.deleteUserRating(submissionId, categoryId, req.user.id);

    this.logger.log(
      `Rating deleted: submission=${submissionId}, category=${categoryId}, user=${req.user.id}`,
    );

    return {
      success: true,
      message: 'Rating deleted successfully',
    };
  }
}
