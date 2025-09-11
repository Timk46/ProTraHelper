import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import {
  CreateEvaluationRatingDTO,
  UpdateEvaluationRatingDTO,
  EvaluationRatingDTO,
  CategoryRatingStatus,
  EvaluationCategoryDTO,
  UserDTO,
  EvaluationSubmissionDTO,
  EvaluationStatus,
  EvaluationPhase,
} from '@DTOs/index';
import { globalRole } from '@DTOs/index';
import { EvaluationCacheService } from '../shared/evaluation-cache.service';
import { EvaluationUtilsService } from '../shared/evaluation-utils.service';
import { EvaluationCommentService } from '../evaluation-comment/evaluation-comment.service';

/**
 * Interface for Prisma rating with all relations
 *
 * @description Provides strict typing for Prisma query results
 * to eliminate any usage and improve type safety
 */
interface PrismaRatingWithRelations {
  id: number;
  submissionId: string;
  categoryId: number;
  userId: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  submission?: {
    id: string;
    title: string;
    author: {
      id: number;
      firstname: string;
      lastname: string;
    };
  };
  category?: {
    id: number;
    name: string;
    displayName: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    order: number;
  };
  user?: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

/**
 * Interface for category summary calculations
 *
 * @description Strict typing for rating summary operations
 * to ensure type safety across aggregation functions
 */
interface CategorySummary {
  categoryId: number;
  categoryName: string;
  displayName: string;
  ratings: { score: number }[];
  average?: number;
  distribution?: { score: number; count: number }[];
  count?: number;
}

/**
 * Interface for summary accumulator
 *
 * @description Type-safe accumulator for rating summary calculations
 */
interface SummaryAccumulator {
  [categoryId: number]: CategorySummary;
}

@Injectable()
export class EvaluationRatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: EvaluationCacheService,
    private readonly utilsService: EvaluationUtilsService,
    private readonly commentService: EvaluationCommentService,
  ) {}

  async rate(ratingDto: CreateEvaluationRatingDTO, userId: number): Promise<EvaluationRatingDTO> {
    // Validate rating score
    this.validateRatingScore(ratingDto.score);

    // Check if submission exists
    const submission = await this.prisma.evaluationSubmission.findUnique({
      where: { id: ratingDto.submissionId },
      include: {
        session: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${ratingDto.submissionId} not found`);
    }

    // Check if session is in discussion or evaluation phase
    if (submission.session.phase !== 'DISCUSSION' && submission.session.phase !== 'EVALUATION') {
      throw new ForbiddenException(
        'Ratings can only be submitted during discussion or evaluation phase',
      );
    }

    // Check if category exists
    const category = await this.prisma.evaluationCategory.findUnique({
      where: { id: Number(ratingDto.categoryId) },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${ratingDto.categoryId} not found`);
    }

    // Upsert rating (create or update)
    const rating = await this.prisma.evaluationRating.upsert({
      where: {
        submissionId_categoryId_userId: {
          submissionId: ratingDto.submissionId,
          categoryId: Number(ratingDto.categoryId),
          userId: userId,
        },
      },
      create: {
        submissionId: ratingDto.submissionId,
        categoryId: Number(ratingDto.categoryId),
        userId: userId,
        rating: ratingDto.score,
        comment: ratingDto.comment,
      },
      update: {
        rating: ratingDto.score,
        comment: ratingDto.comment,
        updatedAt: new Date(),
      },
      include: {
        submission: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        category: true,
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    // Create comment from rating if comment text is provided
    if (ratingDto.comment && ratingDto.comment.trim().length > 0) {
      try {
        await this.commentService.createCommentFromRating(
          ratingDto.submissionId,
          Number(ratingDto.categoryId),
          userId,
          ratingDto.comment.trim(),
          ratingDto.score
        );
      } catch (error) {
        // Log error but don't fail the rating operation
        console.error('Failed to create comment from rating:', error);
      }
    }

    // Send notification to submission author
    await this.notificationService.notifyEvaluationRating(ratingDto.submissionId, userId);

    // Invalidate cache for this submission (both old and new patterns)
    this.cacheService.invalidateByPattern(`ratings:${ratingDto.submissionId}:.*`);
    this.cacheService.invalidateByPattern(`rating-status-batch:${ratingDto.submissionId}:.*`);
    
    // BUGFIX: Also invalidate the specific user's cache key to ensure immediate freshness
    const specificCacheKey = this.utilsService.generateCacheKey(
      'rating-status-batch',
      ratingDto.submissionId,
      userId.toString()
    );
    this.cacheService.delete(specificCacheKey);

    return this.mapToDTO(rating);
  }

  async update(
    id: number,
    updateDto: UpdateEvaluationRatingDTO,
    userId: number,
  ): Promise<EvaluationRatingDTO> {
    const existing = await this.prisma.evaluationRating.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Rating with ID ${id} not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You can only update your own ratings');
    }

    // Validate rating score
    this.validateRatingScore(updateDto.score);

    const rating = await this.prisma.evaluationRating.update({
      where: { id },
      data: {
        rating: updateDto.score,
        comment: updateDto.comment,
        updatedAt: new Date(),
      },
      include: {
        submission: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        category: true,
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    // Update comment from rating if comment text is provided
    if (updateDto.comment && updateDto.comment.trim().length > 0) {
      try {
        await this.commentService.updateCommentFromRating(
          rating.submissionId,
          rating.categoryId,
          userId,
          updateDto.comment.trim(),
          updateDto.score
        );
      } catch (error) {
        // Log error but don't fail the rating operation
        console.error('Failed to update comment from rating:', error);
      }
    }

    // Invalidate cache for this submission
    this.cacheService.invalidateByPattern(`ratings:${rating.submissionId}:.*`);

    return this.mapToDTO(rating);
  }

  /**
   * Deletes a user's rating for a specific category and submission
   *
   * @description Removes an existing rating from the database and invalidates
   * related cache entries. Used for the reset functionality in the frontend.
   *
   * @param {string} submissionId - The submission ID
   * @param {number} categoryId - The category ID
   * @param {number} userId - The user ID who owns the rating
   * @returns {Promise<void>} Promise indicating deletion success
   * @throws {NotFoundException} When rating doesn't exist
   * @throws {ForbiddenException} When user doesn't own the rating
   * @memberof EvaluationRatingService
   */
  async deleteUserRating(
    submissionId: string,
    categoryId: number,
    userId: number,
  ): Promise<void> {
    // Find the existing rating
    const existingRating = await this.prisma.evaluationRating.findUnique({
      where: {
        submissionId_categoryId_userId: {
          submissionId,
          categoryId,
          userId,
        },
      },
      select: { id: true, userId: true },
    });

    if (!existingRating) {
      throw new NotFoundException(
        `Rating for submission ${submissionId} and category ${categoryId} not found`,
      );
    }

    if (existingRating.userId !== userId) {
      throw new ForbiddenException('You can only delete your own ratings');
    }

    // Delete the rating
    await this.prisma.evaluationRating.delete({
      where: { id: existingRating.id },
    });

    // Invalidate cache for this submission (both old and new patterns)
    this.cacheService.invalidateByPattern(`ratings:${submissionId}:.*`);
    this.cacheService.invalidateByPattern(`rating-status-batch:${submissionId}:.*`);
    
    // Also invalidate the specific user's cache key to ensure immediate freshness
    const specificCacheKey = this.utilsService.generateCacheKey(
      'rating-status-batch',
      submissionId,
      userId.toString()
    );
    this.cacheService.delete(specificCacheKey);
  }

  async getSubmissionRatings(submissionId: string): Promise<EvaluationRatingDTO[]> {
    const cacheKey = this.utilsService.generateCacheKey('ratings', submissionId, 'all');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const ratings = await this.prisma.evaluationRating.findMany({
          where: { submissionId },
          include: {
            submission: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                  },
                },
              },
            },
            category: true,
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
          orderBy: [{ category: { order: 'asc' } }, { createdAt: 'desc' }],
        });

        return ratings.map(this.mapToDTO);
      },
      300000,
    ); // 5 minutes cache
  }

  async getCategoryRatings(categoryId: number): Promise<EvaluationRatingDTO[]> {
    const ratings = await this.prisma.evaluationRating.findMany({
      where: { categoryId },
      include: {
        submission: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        },
        category: true,
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ratings.map(this.mapToDTO);
  }

  async getRatingSummary(submissionId: string) {
    const cacheKey = this.utilsService.generateCacheKey('ratings', submissionId, 'summary');

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const ratings = await this.prisma.evaluationRating.findMany({
          where: { submissionId },
          include: {
            category: true,
          },
        });

        const summary: SummaryAccumulator = ratings.reduce((acc: SummaryAccumulator, rating) => {
          const categoryId = rating.categoryId;
          const categoryName = rating.category.name;

          if (!acc[categoryId]) {
            acc[categoryId] = {
              categoryId,
              categoryName,
              displayName: rating.category.displayName,
              ratings: [],
            };
          }

          acc[categoryId].ratings.push({ score: rating.rating });

          return acc;
        }, {});

        // Calculate averages and distributions using utility service
        Object.values(summary).forEach((categoryData: CategorySummary) => {
          categoryData.average = this.utilsService.calculateAverageRating(categoryData.ratings);
          categoryData.distribution = this.utilsService.calculateScoreDistribution(
            categoryData.ratings,
          );
          categoryData.count = categoryData.ratings.length;
        });

        return {
          totalRatings: ratings.length,
          categorySummary: summary,
          overallAverage: this.utilsService.calculateAverageRating(
            ratings.map(r => ({ score: r.rating })),
          ),
        };
      },
      300000,
    ); // 5 minutes cache
  }

  /**
   * Retrieves all ratings for a given submission and user.
   *
   * @param {string} submissionId - The ID of the submission.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<EvaluationRatingDTO[]>} - Array of EvaluationRatingDTO objects.
   */
  async getUserRatings(submissionId: string, userId: number): Promise<EvaluationRatingDTO[]> {
    const ratings = await this.prisma.evaluationRating.findMany({
      where: {
        submissionId,
        userId,
      },
      include: {
        category: true,
      },
      orderBy: {
        category: { order: 'asc' },
      },
    });

    // Map the results to the EvaluationRatingDTO structure
    return ratings.map(
      (rating): EvaluationRatingDTO => ({
        id: rating.id.toString(),
        submissionId: rating.submissionId,
        userId: rating.userId,
        categoryId: rating.categoryId,
        score: rating.rating, // Assuming 'rating.rating' is the score (0-10)
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
        // Relations
        category: {
          id: rating.category.id,
          name: rating.category.name,
          displayName: rating.category.displayName,
          description: rating.category.description,
          icon: rating.category.icon,
          ...(rating.category.color && { color: rating.category.color }),
          order: rating.category.order,
        },
        // submission and user can be included if available, otherwise omitted
      }),
    );
  }

  /**
   * Checks if a user has rated a specific category for a submission
   *
   * @description This method determines if the user has already provided
   * a rating for the specified category, enabling access control for discussions
   *
   * @param {string} submissionId - The submission ID to check
   * @param {number} categoryId - The category ID to check
   * @param {number} userId - The user ID to check
   * @returns {Promise<boolean>} Promise indicating if user has rated the category
   * @memberof EvaluationRatingService
   */
  async hasUserRatedCategory(
    submissionId: string,
    categoryId: number,
    userId: number,
  ): Promise<boolean> {
    // FIXED: Demo submissions should also check for actual stored ratings
    // Removed the short-circuit that always returned false for demos

    const rating = await this.prisma.evaluationRating.findUnique({
      where: {
        submissionId_categoryId_userId: {
          submissionId,
          categoryId,
          userId,
        },
      },
      select: { id: true },
    });

    return !!rating;
  }

  /**
   * Gets the rating status for all categories for a specific user and submission
   *
   * @description This method returns the rating status for each category,
   * indicating which categories the user has rated and which are still pending.
   * This is used to control access to discussion areas.
   *
   * @param {string} submissionId - The submission ID to check
   * @param {number} userId - The user ID to check
   * @returns {Promise<CategoryRatingStatus[]>} Promise containing rating status for all categories
   * @memberof EvaluationRatingService
   */
  async getUserRatingStatus(submissionId: string, userId: number): Promise<CategoryRatingStatus[]> {
    const cacheKey = this.utilsService.generateCacheKey(
      'rating-status-batch',
      submissionId,
      userId.toString(),
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.getUserRatingStatusBatch(submissionId, userId);
      },
      60000,
    ); // 1 minute cache for fast updates but good performance
  }

  /**
   * Internal batch method for getting rating status with optimized single query
   *
   * @description Uses a single JOIN query to fetch all necessary data atomically,
   * preventing race conditions between submission and rating queries.
   *
   * @param {string} submissionId - The submission ID to check
   * @param {number} userId - The user ID to check
   * @returns {Promise<CategoryRatingStatus[]>} Promise containing rating status for all categories
   * @memberof EvaluationRatingService
   */
  private async getUserRatingStatusBatch(
    submissionId: string,
    userId: number,
  ): Promise<CategoryRatingStatus[]> {
    // Handle demo submissions that may not exist in the database
    if (this.isDemoSubmission(submissionId)) {
      return this.getDemoRatingStatus(submissionId, userId);
    }

    // OPTIMIZED: Single JOIN query to fetch submission, categories, and user ratings atomically
    const submissionWithRatings = await this.prisma.evaluationSubmission.findUnique({
      where: { id: submissionId },
      include: {
        session: {
          include: {
            categories: {
              orderBy: { order: 'asc' },
            },
          },
        },
        ratings: {
          where: { userId },
          select: {
            categoryId: true,
            rating: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!submissionWithRatings) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Create a map for O(1) lookup performance
    const ratingsMap = new Map(
      submissionWithRatings.ratings.map(rating => [rating.categoryId, rating]),
    );

    // Build status for each category with atomic data consistency
    return submissionWithRatings.session.categories.map(category => {
      const categoryRating = ratingsMap.get(category.id);
      const hasRated = ratingsMap.has(category.id);

      return {
        categoryId: category.id,
        categoryName: category.name,
        displayName: category.displayName,
        hasRated,
        rating: categoryRating?.rating ?? null,
        ratedAt: categoryRating?.createdAt ?? null,
        lastUpdatedAt: categoryRating?.updatedAt ?? new Date(), // Always provide lastUpdatedAt for cache validation
        canAccessDiscussion: hasRated, // User can access discussion if they've rated
        isRequired: true, // All categories require rating for discussion access
      };
    });
  }

  async getCategoryStats(submissionId: string, categoryId: number) {
    const cacheKey = this.utilsService.generateCacheKey(
      'ratings',
      submissionId,
      'category',
      categoryId.toString(),
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const ratings = await this.prisma.evaluationRating.findMany({
          where: {
            submissionId,
            categoryId,
          },
          include: {
            category: true,
          },
        });

        if (ratings.length === 0) {
          return {
            categoryId,
            categoryName: '',
            count: 0,
            average: 0,
            distribution: Array(11).fill(0),
          };
        }

        const ratingScores = ratings.map(r => ({ score: r.rating }));
        const distribution = this.utilsService.calculateScoreDistribution(ratingScores);
        const average = this.utilsService.calculateAverageRating(ratingScores);

        return {
          categoryId,
          categoryName: ratings[0].category.name,
          displayName: ratings[0].category.displayName,
          count: ratings.length,
          average,
          distribution,
          ratings: ratings.map(rating => ({
            score: rating.rating,
            comment: rating.comment,
            createdAt: rating.createdAt,
          })),
        };
      },
      300000,
    ); // 5 minutes cache
  }

  /**
   * Checks if a submission ID indicates a demo submission
   *
   * @description Demo submissions are used for testing and demonstration purposes
   * and may not exist in the database but should still function properly
   *
   * @param {string} submissionId - The submission ID to check
   * @returns {boolean} True if this is a demo submission
   * @memberof EvaluationRatingService
   */
  private isDemoSubmission(submissionId: string): boolean {
    return (
      submissionId.includes('demo') ||
      submissionId.includes('test') ||
      submissionId.startsWith('demo-')
    );
  }

  /**
   * Provides demo rating status for demo submissions with proper persistence
   *
   * @description Creates rating status for demo submissions by checking actual
   * stored ratings in the database, enabling proper testing with persistence
   *
   * @param {string} submissionId - The demo submission ID
   * @param {number} userId - The user ID to check
   * @returns {Promise<CategoryRatingStatus[]>} Promise containing demo rating status
   * @memberof EvaluationRatingService
   */
  private async getDemoRatingStatus(
    submissionId: string,
    userId: number,
  ): Promise<CategoryRatingStatus[]> {
    // Create demo categories for testing
    const demoCategories = [
      { id: 1, name: 'functionality', displayName: 'Funktionalität' },
      { id: 2, name: 'design', displayName: 'Design' },
      { id: 3, name: 'usability', displayName: 'Benutzerfreundlichkeit' },
      { id: 4, name: 'innovation', displayName: 'Innovation' },
      { id: 5, name: 'documentation', displayName: 'Dokumentation' },
    ];

    // FIXED: Check for actual stored ratings for demo submissions
    // Demo submissions should persist ratings like regular submissions
    const userRatings = await this.prisma.evaluationRating.findMany({
      where: {
        submissionId,
        userId,
      },
      select: {
        categoryId: true,
        rating: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create a map for quick lookup of stored ratings
    const ratingsMap = new Map(userRatings.map(rating => [rating.categoryId, rating]));

    return demoCategories.map(category => {
      const storedRating = ratingsMap.get(category.id);
      return {
        categoryId: category.id,
        categoryName: category.name,
        displayName: category.displayName,
        hasRated: ratingsMap.has(category.id), // Check if rating exists in DB
        rating: storedRating?.rating ?? null,
        ratedAt: storedRating?.createdAt ?? null,
        lastUpdatedAt: storedRating?.updatedAt ?? new Date(), // Always provide lastUpdatedAt for cache validation
        canAccessDiscussion: ratingsMap.has(category.id), // Can access if rated
        isRequired: true, // All categories require rating
      };
    });
  }

  private validateRatingScore(score: number): void {
    if (score < 0 || score > 15) {
      throw new BadRequestException('Rating score must be between 0 and 15');
    }
  }

  /**
   * Maps Prisma rating object to DTO with strict type safety
   *
   * @description Converts Prisma rating with relations to a typed DTO
   * eliminating any usage and ensuring type consistency
   *
   * @param {PrismaRatingWithRelations} rating - The Prisma rating object with relations
   * @returns {EvaluationRatingDTO} Typed DTO object
   * @memberof EvaluationRatingService
   */
  private mapToDTO(rating: PrismaRatingWithRelations): EvaluationRatingDTO {
    return {
      id: rating.id.toString(),
      submissionId: rating.submissionId,
      userId: rating.userId,
      categoryId: rating.categoryId,
      score: rating.rating,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
      // Map partial submission data to full DTO structure with required defaults
      submission: rating.submission
        ? {
            id: rating.submission.id,
            title: rating.submission.title,
            authorId: rating.submission.author.id,
            pdfFileId: 0, // Default value - not available in this context
            sessionId: 0, // Default value - not available in this context
            status: EvaluationStatus.SUBMITTED, // Default status
            phase: EvaluationPhase.DISCUSSION, // Default phase
            submittedAt: new Date(), // Default date
            createdAt: new Date(), // Default date
            updatedAt: new Date(), // Default date
            author: {
              id: rating.submission.author.id,
              firstname: rating.submission.author.firstname,
              lastname: rating.submission.author.lastname,
              email: '', // Default value - not available in this context
              globalRole: globalRole.STUDENT, // Default role
            },
          }
        : null,
      // Map partial user data to full DTO structure with required defaults
      user: rating.user
        ? {
            id: rating.user.id,
            firstname: rating.user.firstname,
            lastname: rating.user.lastname,
            email: '', // Default value - not available in this context
            globalRole: globalRole.STUDENT, // Default role
          }
        : null,
      category: rating.category
        ? {
            id: rating.category.id,
            name: rating.category.name,
            displayName: rating.category.displayName,
            description: rating.category.description ?? '',
            icon: rating.category.icon ?? '',
            color: rating.category.color ?? undefined,
            order: rating.category.order,
          }
        : undefined,
    };
  }
}
