import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { CreateEvaluationRatingDTO, UpdateEvaluationRatingDTO, EvaluationRatingDTO } from '@DTOs/index';
import { EvaluationCacheService } from '../shared/evaluation-cache.service';
import { EvaluationUtilsService } from '../shared/evaluation-utils.service';

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

    // Check if session is in evaluation phase
    if (submission.session.phase !== 'EVALUATION') {
      throw new ForbiddenException('Ratings can only be submitted during evaluation phase');
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

  async update(id: number, updateDto: UpdateEvaluationRatingDTO, userId: number): Promise<EvaluationRatingDTO> {
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
    
    return this.cacheService.getOrSet(cacheKey, async () => {
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
        orderBy: [
          { category: { order: 'asc' } },
          { createdAt: 'desc' },
        ],
      });

      return ratings.map(this.mapToDTO);
    }, 300000); // 5 minutes cache
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
    
    return this.cacheService.getOrSet(cacheKey, async () => {
      const ratings = await this.prisma.evaluationRating.findMany({
        where: { submissionId },
        include: {
          category: true,
        },
      });

      const summary = ratings.reduce((acc, rating) => {
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
      Object.values(summary).forEach((cat: any) => {
        cat.average = this.utilsService.calculateAverageRating(cat.ratings);
        cat.distribution = this.utilsService.calculateScoreDistribution(cat.ratings);
        cat.count = cat.ratings.length;
      });

      return {
        totalRatings: ratings.length,
        categorySummary: summary,
        overallAverage: this.utilsService.calculateAverageRating(ratings.map(r => ({ score: r.rating }))),
      };
    }, 300000); // 5 minutes cache
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

  async getCategoryStats(submissionId: string, categoryId: number) {
    const cacheKey = this.utilsService.generateCacheKey('ratings', submissionId, 'category', categoryId.toString());
    
    return this.cacheService.getOrSet(cacheKey, async () => {
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
    }, 300000); // 5 minutes cache
  }

  private validateRatingScore(score: number): void {
    if (score < 0 || score > 10) {
      throw new BadRequestException('Rating score must be between 0 and 10');
    }
  }

  private mapToDTO(rating: any): EvaluationRatingDTO {
    return {
      id: rating.id.toString(),
      submissionId: rating.submissionId,
      userId: rating.userId,
      categoryId: rating.categoryId,
      score: rating.rating,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
      submission: rating.submission,
      user: rating.user,
      category: rating.category ? {
        id: rating.category.id.toString(),
        name: rating.category.name,
        displayName: rating.category.displayName,
        description: rating.category.description,
        icon: rating.category.icon,
        color: rating.category.color,
        order: rating.category.order,
      } : null,
    };
  }
}