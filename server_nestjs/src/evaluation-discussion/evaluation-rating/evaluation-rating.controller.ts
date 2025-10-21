import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/common/guards/roles.guard';
import { roles } from '../../auth/common/guards/roles.guard';
import { EvaluationRatingService } from './evaluation-rating.service';
import { EvaluationRatingDTO, CategoryRatingStatus } from '@DTOs/index';
import { CreateEvaluationRatingDTO, UpdateEvaluationRatingDTO } from '@DTOs/index';
import { randomInt } from 'crypto';

@Controller('evaluation-ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationRatingController {
  constructor(private readonly evaluationRatingService: EvaluationRatingService) {}

  @Post()
  @roles('ANY')
  async rate(
    @Body() ratingDto: CreateEvaluationRatingDTO,
    @Req() req: any,
  ): Promise<EvaluationRatingDTO> {
    return this.evaluationRatingService.rate(ratingDto, req.user.id);
  }

  @Put(':id')
  @roles('ANY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEvaluationRatingDTO,
    @Req() req: any,
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
   * to the discussion area for a specific category
   *
   * @route GET /evaluation-ratings/submission/:submissionId/category/:categoryId/user
   * @param {string} submissionId - The submission ID to check
   * @param {string} categoryId - The category ID to check
   * @param {any} req - Request object containing user information
   * @returns {Promise<{hasRated: boolean}>} Object indicating if user has rated the category
   */
  @Get('submission/:submissionId/category/:categoryId/user')
  @roles('ANY')
  async hasUserRatedCategory(
    @Param('submissionId') submissionId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: any,
  ): Promise<{ hasRated: boolean }> {
    // Handle authenticated users
    const userId = req.user && req.user.id ? req.user.id : this.extractDemoUserId(submissionId);

    const hasRated = await this.evaluationRatingService.hasUserRatedCategory(
      Number(submissionId),
      Number(categoryId),
      userId,
    );
    return { hasRated };
  }

  /**
   * Gets the rating status for all categories for the current user and submission
   *
   * @description This endpoint returns the complete rating status overview,
   * indicating which categories the user has rated and which discussions they can access
   *
   * @route GET /evaluation-ratings/submission/:submissionId/user/status
   * @param {string} submissionId - The submission ID to check
   * @param {any} req - Request object containing user information
   * @returns {Promise<CategoryRatingStatus[]>} Array of category rating statuses
   */
  @Get('submission/:submissionId/user/:userId/status')
  @roles('ANY')
  async getUserRatingStatus(
    @Param('submissionId') submissionId: string,
    @Param('userId') userId: string,
  ): Promise<CategoryRatingStatus[]> {
    // Handle authenticated users
    if (userId) {
      return this.evaluationRatingService.getUserRatingStatus(Number(submissionId), Number(userId));
    }

    // Handle anonymous/demo scenarios - extract user ID from submission or use default
    // For demo submissions, use a consistent demo user ID
    const demoUserId = this.extractDemoUserId(submissionId);
    return this.evaluationRatingService.getUserRatingStatus(Number(submissionId), demoUserId);
  }

  /**
   * Cache for consistent anonymous user IDs per session
   *
   * @description Stores mapping between submission IDs and generated anonymous user IDs
   * to ensure consistency within a single application session while maintaining security
   *
   * @private
   * @static
   * @memberof EvaluationRatingController
   */
  private static readonly anonymousUserCache = new Map<string, number>();

  /**
   * Deletes a rating by category for the current user
   *
   * @description Removes the user's rating for a specific category and submission.
   * This enables the reset functionality in the frontend rating system.
   *
   * @route DELETE /evaluation-ratings/submission/:submissionId/category/:categoryId/user
   * @param {string} submissionId - The submission ID
   * @param {string} categoryId - The category ID  
   * @param {any} req - Request object containing user information
   * @returns {Promise<{success: boolean, message: string}>} Deletion confirmation
   */
  @Delete('submission/:submissionId/category/:categoryId/user')
  @roles('ANY')
  async deleteUserRating(
    @Param('submissionId') submissionId: string,
    @Param('categoryId') categoryId: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user && req.user.id ? req.user.id : this.extractDemoUserId(submissionId);

    await this.evaluationRatingService.deleteUserRating(
      Number(submissionId),
      Number(categoryId),
      userId,
    );

    return {
      success: true,
      message: 'Rating deleted successfully',
    };
  }

  /**
   * Extracts or generates a secure demo user ID for anonymous access
   *
   * @description For demo submissions, uses a consistent demo user ID.
   * For other anonymous cases, generates a cryptographically secure random ID
   * that is cached per session to maintain consistency without predictability.
   *
   * @param {string} submissionId - The submission ID to generate user ID for
   * @returns {number} Secure anonymous user ID
   * @memberof EvaluationRatingController
   */
  private extractDemoUserId(submissionId: string): number {
    // For demo submissions, use a consistent demo user ID
    if (submissionId.includes('demo') || submissionId.includes('test')) {
      return 999; // Known demo user ID for testing
    }

    // Check if we already have a cached ID for this submission
    if (EvaluationRatingController.anonymousUserCache.has(submissionId)) {
      return EvaluationRatingController.anonymousUserCache.get(submissionId)!;
    }

    // Generate a cryptographically secure random ID for anonymous users
    // Range: 1000-9999 for anonymous users (avoiding conflicts with real user IDs)
    const secureAnonymousId = randomInt(1000, 10000);

    // Cache the ID for consistency within this session
    EvaluationRatingController.anonymousUserCache.set(submissionId, secureAnonymousId);

    // Optional: Clean up cache periodically (implementation depends on requirements)
    // This prevents unlimited memory growth in long-running applications
    if (EvaluationRatingController.anonymousUserCache.size > 100) {
      // Remove oldest entries (simple FIFO cleanup)
      const firstKey = EvaluationRatingController.anonymousUserCache.keys().next().value;
      EvaluationRatingController.anonymousUserCache.delete(firstKey);
    }

    return secureAnonymousId;
  }
}
