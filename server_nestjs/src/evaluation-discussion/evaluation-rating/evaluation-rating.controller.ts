import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { EvaluationRatingService } from './evaluation-rating.service';
import { EvaluationRatingDTO, CategoryRatingStatus } from '@DTOs/index';
import { CreateEvaluationRatingDTO, UpdateEvaluationRatingDTO } from '@DTOs/index';

/**
 * Type-safe authenticated request interface
 * Guaranteed by JwtAuthGuard at controller level
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string;
  };
}

@Controller('evaluation-ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationRatingController {
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
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationRatingDTO,
    @Req() req: AuthenticatedRequest,
  ): Promise<EvaluationRatingDTO> {
    return this.evaluationRatingService.update(Number(id), updateDto, req.user.id);
  }

  @Get('submission/:submissionId')
  @roles('ANY')
  async getSubmissionRatings(
    @Param('submissionId') submissionId: string,
  ): Promise<EvaluationRatingDTO[]> {
    return this.evaluationRatingService.getSubmissionRatings(Number(submissionId));
  }

  @Get('category/:categoryId')
  @roles('ANY')
  async getCategoryRatings(
    @Param('categoryId') categoryId: string,
  ): Promise<EvaluationRatingDTO[]> {
    return this.evaluationRatingService.getCategoryRatings(Number(categoryId));
  }

  @Get('submission/:submissionId/summary')
  @roles('ANY')
  async getRatingSummary(@Param('submissionId') submissionId: string): Promise<any> {
    return this.evaluationRatingService.getRatingSummary(Number(submissionId));
  }

  @Get('submission/:submissionId/user/:userId')
  @roles('ANY')
  async getUserRatings(
    @Param('submissionId') submissionId: string,
    @Param('userId') userId: string,
  ): Promise<EvaluationRatingDTO[]> {
    console.log('getUserRatings', submissionId, 'userId', userId);
    return this.evaluationRatingService.getUserRatings(Number(submissionId), Number(userId));
  }

  @Get('submission/:submissionId/category/:categoryId/stats')
  @roles('ANY')
  async getCategoryStats(
    @Param('submissionId') submissionId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<any> {
    console.log('getCategoryStats', submissionId, 'categoryId', categoryId);
    return this.evaluationRatingService.getCategoryStats(Number(submissionId), Number(categoryId));
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
    @Param('submissionId') submissionId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ hasRated: boolean }> {
    const hasRated = await this.evaluationRatingService.hasUserRatedCategory(
      Number(submissionId),
      Number(categoryId),
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
    @Param('submissionId') submissionId: string,
    @Param('userId') userId: string,
  ): Promise<CategoryRatingStatus[]> {
    return this.evaluationRatingService.getUserRatingStatus(
      Number(submissionId),
      Number(userId)
    );
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
    @Param('submissionId') submissionId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    await this.evaluationRatingService.deleteUserRating(
      Number(submissionId),
      Number(categoryId),
      req.user.id,
    );

    return {
      success: true,
      message: 'Rating deleted successfully',
    };
  }

}
