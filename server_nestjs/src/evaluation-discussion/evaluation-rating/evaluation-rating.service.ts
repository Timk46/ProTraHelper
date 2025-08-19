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
} from '@DTOs/index';
import { EvaluationCacheService } from '../shared/evaluation-cache.service';
import { EvaluationUtilsService } from '../shared/evaluation-utils.service';

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
  ratings: Array<{ score: number }>;
  average?: number;
  distribution?: number[];
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

    // Send notification to submission author
    await this.notificationService.notifyEvaluationRating(ratingDto.submissionId, userId);

    // Invalidate cache for this submission
    this.cacheService.invalidateByPattern(`ratings:${ratingDto.submissionId}:.*`);

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

    // Invalidate cache for this submission
    this.cacheService.invalidateByPattern(`ratings:${rating.submissionId}:.*`);

    return this.mapToDTO(rating);
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
          categoryData.distribution = this.utilsService.calculateScoreDistribution(categoryData.ratings);
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

  async getUserRatings(submissionId: string, userId: number) {
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

    return ratings.map(rating => ({
      categoryId: rating.categoryId,
      categoryName: rating.category.name,
      displayName: rating.category.displayName,
      score: rating.rating,
      comment: rating.comment,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    }));
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
    // For demo submissions, always return false (unrated) initially
    if (this.isDemoSubmission(submissionId)) {
      return false;
    }

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
    // Handle demo submissions that may not exist in the database
    if (this.isDemoSubmission(submissionId)) {
      return this.getDemoRatingStatus(submissionId, userId);
    }

    // Get all available categories for this submission's session
    const submission = await this.prisma.evaluationSubmission.findUnique({
      where: { id: submissionId },
      include: {
        session: {
          include: {
            categories: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Get user's ratings for this submission
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

    // Create a map for quick lookup
    const ratingsMap = new Map(userRatings.map(rating => [rating.categoryId, rating]));

    // Build status for each category
    return submission.session.categories.map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      displayName: category.displayName,
      hasRated: ratingsMap.has(category.id),
      rating: ratingsMap.get(category.id).rating || null,
      ratedAt: ratingsMap.get(category.id).createdAt || null,
      lastUpdatedAt: ratingsMap.get(category.id).updatedAt || null,
      canAccessDiscussion: ratingsMap.has(category.id), // User can access discussion if they've rated
      isRequired: true, // All categories require rating for discussion access
    }));
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
   * Provides demo rating status for demo submissions
   *
   * @description Creates a mock rating status response for demo submissions
   * that may not exist in the database, enabling frontend testing and demos
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

    // Check if user has any ratings for this demo submission (from memory/cache)
    // For simplicity, we'll assume no ratings exist for demo submissions
    return demoCategories.map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      displayName: category.displayName,
      hasRated: false, // Demo submissions start unrated
      rating: null,
      ratedAt: null,
      lastUpdatedAt: null,
      canAccessDiscussion: false, // Must rate first
      isRequired: true, // All categories require rating
    }));
  }

  private validateRatingScore(score: number): void {
    if (score < 0 || score > 10) {
      throw new BadRequestException('Rating score must be between 0 and 10');
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
      submission: rating.submission || null,
      user: rating.user || null,
      category: rating.category
        ? {
            id: rating.category.id.toString(),
            name: rating.category.name,
            displayName: rating.category.displayName,
            description: rating.category.description || null,
            icon: rating.category.icon || null,
            color: rating.category.color || null,
            order: rating.category.order,
          }
        : null,
    };
  }
}
