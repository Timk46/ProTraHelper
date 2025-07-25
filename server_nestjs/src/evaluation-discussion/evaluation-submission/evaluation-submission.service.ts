import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { FilesService } from '../../files/files.service';
import type {
  CreateEvaluationSubmissionDTO,
  UpdateEvaluationSubmissionDTO,
  EvaluationSubmissionDTO,
  CommentStatsDTO,
  CategoryStatsDTO,
  EvaluationSessionDTO,
} from '@DTOs/index';
import { EvaluationPhase, EvaluationStatus } from '@DTOs/index';
import { globalRole } from '@DTOs/index';
import { createReadStream } from 'fs';
import { join } from 'path';

@Injectable()
export class EvaluationSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly filesService: FilesService,
  ) {}

  async findAll(sessionId?: number, page?: number, limit?: number): Promise<EvaluationSubmissionDTO[]> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || undefined;

    const submissions = await this.prisma.evaluationSubmission.findMany({
      where: sessionId ? { sessionId } : undefined,
      skip,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        pdfFileId: true,
        sessionId: true,
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            // Remove email for privacy in listings
          },
        },
        pdfFile: {
          select: {
            id: true,
            name: true,
            type: true,
            // Remove path and other sensitive data
          },
        },
        session: {
          select: {
            id: true,
            title: true,
            phase: true,
            module: {
              select: {
                id: true,
                name: true,
                // Only essential module fields
              },
            },
            categories: {
              select: {
                id: true,
                name: true,
                displayName: true,
                order: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: {
            discussions: true,
            ratings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions.map(this.mapToDTO);
  }

  async findAllPaginated(
    sessionId?: number,
    page: number = 1,
    limit: number = 20,
    orderBy: string = 'createdAt',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    submissions: EvaluationSubmissionDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;
    const where = sessionId ? { sessionId } : undefined;

    const [submissions, total] = await Promise.all([
      this.prisma.evaluationSubmission.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
          authorId: true,
          pdfFileId: true,
          sessionId: true,
          author: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          pdfFile: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          _count: {
            select: {
              discussions: true,
              ratings: true,
            },
          },
        },
        orderBy: { [orderBy]: orderDirection },
      }),
      this.prisma.evaluationSubmission.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      submissions: submissions.map(this.mapToDTO),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  async findOne(id: string): Promise<EvaluationSubmissionDTO> {
    const submission = await this.prisma.evaluationSubmission.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        pdfFile: true,
        session: {
          include: {
            module: true,
            categories: {
              orderBy: { order: 'asc' },
            },
          },
        },
        discussions: {
          include: {
            author: true,
            messages: {
              include: {
                author: true,
                votes: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        ratings: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            category: true,
          },
        },
        _count: {
          select: {
            discussions: true,
            ratings: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Evaluation submission with ID ${id} not found`);
    }

    return this.mapToDTO(submission);
  }

  async create(
    createDto: CreateEvaluationSubmissionDTO,
    userId: number,
  ): Promise<EvaluationSubmissionDTO> {
    // Verify that the session exists and is active
    const session = await this.prisma.evaluationSession.findUnique({
      where: { id: createDto.sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Evaluation session with ID ${createDto.sessionId} not found`);
    }

    if (!session.isActive) {
      throw new ForbiddenException('Evaluation session is not active');
    }

    const submission = await this.prisma.evaluationSubmission.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        authorId: userId,
        pdfFileId: createDto.pdfFileId,
        sessionId: createDto.sessionId,
        status: EvaluationStatus.DRAFT,
        submittedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        pdfFile: true,
        session: {
          include: {
            module: true,
            categories: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: {
            discussions: true,
            ratings: true,
          },
        },
      },
    });

    // Create anonymous user for this submission
    await this.createAnonymousUser(submission.id, userId);

    return this.mapToDTO(submission);
  }

  async update(
    id: string,
    updateDto: UpdateEvaluationSubmissionDTO,
    userId: number,
  ): Promise<EvaluationSubmissionDTO> {
    // Check ownership
    const existing = await this.prisma.evaluationSubmission.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Evaluation submission with ID ${id} not found`);
    }

    if (existing.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own submissions');
    }

    const submission = await this.prisma.evaluationSubmission.update({
      where: { id },
      data: updateDto,
      include: {
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        pdfFile: true,
        session: {
          include: {
            module: true,
            categories: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: {
            discussions: true,
            ratings: true,
          },
        },
      },
    });

    return this.mapToDTO(submission);
  }

  async remove(id: string, userId: number): Promise<void> {
    // Check ownership
    const existing = await this.prisma.evaluationSubmission.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Evaluation submission with ID ${id} not found`);
    }

    if (existing.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own submissions');
    }

    await this.prisma.evaluationSubmission.delete({
      where: { id },
    });
  }

  async getPdfStream(id: string) {
    const submission = await this.prisma.evaluationSubmission.findUnique({
      where: { id },
      include: {
        pdfFile: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Evaluation submission with ID ${id} not found`);
    }

    if (!submission.pdfFile) {
      throw new NotFoundException(`PDF file for submission ${id} not found`);
    }

    const filePath = join(process.cwd(), submission.pdfFile.path);
    return createReadStream(filePath);
  }

  async getDiscussions(submissionId: string, categoryId?: number) {
    const discussions = await this.prisma.discussion.findMany({
      where: {
        evaluationSubmissionId: submissionId,
        evaluationCategoryId: categoryId,
      },
      include: {
        author: true,
        messages: {
          include: {
            author: true,
            votes: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        evaluationCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return discussions;
  }

  async getStats(submissionId: string) {
    const stats = await this.prisma.evaluationSubmission.findUnique({
      where: { id: submissionId },
      select: {
        _count: {
          select: {
            discussions: true,
            ratings: true,
          },
        },
        discussions: {
          select: {
            evaluationCategoryId: true,
            _count: {
              select: {
                messages: true,
              },
            },
          },
        },
        ratings: {
          select: {
            categoryId: true,
            rating: true,
          },
        },
      },
    });

    if (!stats) {
      throw new NotFoundException(`Evaluation submission with ID ${submissionId} not found`);
    }

    return {
      totalDiscussions: stats._count.discussions,
      totalRatings: stats._count.ratings,
      discussionsByCategory: stats.discussions.reduce((acc, discussion) => {
        const categoryId = discussion.evaluationCategoryId;
        if (!acc[categoryId]) {
          acc[categoryId] = 0;
        }
        acc[categoryId] += discussion._count.messages;
        return acc;
      }, {}),
      ratingsByCategory: stats.ratings.reduce((acc, rating) => {
        const categoryId = rating.categoryId;
        if (!acc[categoryId]) {
          acc[categoryId] = { total: 0, count: 0, average: 0 };
        }
        acc[categoryId].total += rating.rating;
        acc[categoryId].count += 1;
        acc[categoryId].average = acc[categoryId].total / acc[categoryId].count;
        return acc;
      }, {}),
    };
  }

  async getAnonymousUser(submissionId: string, userId: number) {
    let anonymousUser = await this.prisma.anonymousUser.findFirst({
      where: {
        userId,
        // We need to find anonymous users related to this submission
        // This will be implemented once we have the proper relation
      },
    });

    if (!anonymousUser) {
      anonymousUser = await this.createAnonymousUser(submissionId, userId);
    }

    return {
      id: anonymousUser.id,
      displayName: anonymousUser.anonymousName,
      colorCode: this.generateColorCode(anonymousUser.id),
    };
  }

  /**
   * Get detailed comment statistics for a submission
   *
   * @description Retrieves comprehensive statistics about comment availability and usage
   * for a specific submission, including per-category limits and user-specific data.
   * This is used to enforce comment limits and provide progress tracking.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param userId - The ID of the user requesting the statistics
   * @returns Promise resolving to detailed comment statistics
   * @throws NotFoundException if the submission does not exist
   */
  async getCommentStats(submissionId: string, userId: number): Promise<CommentStatsDTO> {
    // First verify the submission exists
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
      throw new NotFoundException(`Evaluation submission with ID ${submissionId} not found`);
    }

    // Note: CommentLimit model is not yet defined in the schema
    // For now, we'll use default limits. This can be enhanced when CommentLimit is added
    const commentLimits: any[] = [];

    // Create a map for quick lookup (empty for now)
    const limitsMap = new Map();

    // Get discussion counts per category for this submission
    const discussionCounts = await this.prisma.discussion.groupBy({
      by: ['evaluationCategoryId'],
      where: {
        evaluationSubmissionId: submissionId,
        authorId: userId,
      },
      _count: {
        id: true,
      },
    });

    const discussionCountsMap = new Map(
      discussionCounts.map(count => [count.evaluationCategoryId, count._count.id])
    );

    // Default limits per category (could be configurable)
    const DEFAULT_COMMENTS_PER_CATEGORY = 3;
    const DEFAULT_TOTAL_COMMENTS = submission.session.categories.length * DEFAULT_COMMENTS_PER_CATEGORY;

    let totalAvailable = 0;
    let totalUsed = 0;

    const categories: CategoryStatsDTO[] = submission.session.categories.map(category => {
      // Use default limits since CommentLimit model is not yet in schema
      const availableComments = DEFAULT_COMMENTS_PER_CATEGORY;
      const usedComments = discussionCountsMap.get(category.id) || 0;
      const isLimitReached = usedComments >= availableComments;

      totalAvailable += availableComments;
      totalUsed += usedComments;

      let indicatorColor: 'success' | 'warn' | 'error' | 'primary';
      let availabilityIcon: 'add' | 'remove' | 'block';

      if (isLimitReached) {
        indicatorColor = 'error';
        availabilityIcon = 'block';
      } else if (usedComments >= availableComments * 0.8) {
        indicatorColor = 'warn';
        availabilityIcon = 'remove';
      } else {
        indicatorColor = 'success';
        availabilityIcon = 'add';
      }

      return {
        categoryId: category.id,
        categoryName: category.displayName,
        availableComments,
        usedComments,
        isLimitReached,
        lastCommentAt: undefined, // Will be available when CommentLimit model is added
        indicatorColor,
        availabilityText: `${usedComments}/${availableComments} verwendet`,
        availabilityIcon,
      };
    });

    const overallProgress = totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0;
    const averageUsage = categories.length > 0
      ? categories.reduce((sum, cat) => sum + (cat.usedComments / cat.availableComments), 0) / categories.length * 100
      : 0;

    return {
      submissionId,
      totalAvailable,
      totalUsed,
      categories,
      overallProgress,
      averageUsage,
      userLimits: {
        userId,
        totalLimit: DEFAULT_TOTAL_COMMENTS,
        totalUsed,
        canComment: totalUsed < DEFAULT_TOTAL_COMMENTS,
        resetAt: undefined, // Could implement periodic resets
      },
    };
  }

  /**
   * Switch the phase of the evaluation session for this submission
   *
   * @description Alternative method to switch the phase of an evaluation session
   * from the context of a specific submission. This provides a submission-centric
   * way to control the session phase.
   *
   * @param submissionId - The ID of the evaluation submission
   * @param phase - The target phase ('DISCUSSION' or 'EVALUATION')
   * @returns Promise resolving to the updated evaluation session
   * @throws NotFoundException if the submission does not exist
   * @throws ForbiddenException if user lacks permission
   */
  async switchPhase(submissionId: string, phase: 'DISCUSSION' | 'EVALUATION'): Promise<EvaluationSessionDTO> {
    // First get the submission to find the associated session
    const submission = await this.prisma.evaluationSubmission.findUnique({
      where: { id: submissionId },
      include: {
        session: {
          include: {
            module: true,
            createdBy: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
            _count: {
              select: {
                submissions: true,
                categories: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Evaluation submission with ID ${submissionId} not found`);
    }

    // Update the session phase
    const updatedSession = await this.prisma.evaluationSession.update({
      where: { id: submission.sessionId },
      data: { phase: phase as EvaluationPhase },
      include: {
        module: true,
        createdBy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            globalRole: true,
          },
        },
        submissions: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
                globalRole: true,
              },
            },
          },
        },
        categories: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            submissions: true,
            categories: true,
          },
        },
      },
    });

    // Notify all participants about phase switch
    await this.notificationService.notifyPhaseSwitch(submission.sessionId, phase);

    // Map to DTO format with proper type conversions
    return {
      id: updatedSession.id,
      title: updatedSession.title,
      description: updatedSession.description,
      startDate: updatedSession.startDate,
      endDate: updatedSession.endDate,
      moduleId: updatedSession.moduleId,
      createdById: updatedSession.createdById,
      isActive: updatedSession.isActive,
      isAnonymous: updatedSession.isAnonymous,
      phase: updatedSession.phase as EvaluationPhase, // Cast Prisma enum to DTO enum
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt,
      module: updatedSession.module,
      createdBy: updatedSession.createdBy ? {
        ...updatedSession.createdBy,
        globalRole: updatedSession.createdBy.globalRole as globalRole, // Cast Prisma enum to DTO enum
      } : undefined,
      submissions: updatedSession.submissions?.map(sub => ({
        ...sub,
        phase: updatedSession.phase as EvaluationPhase, // Use session phase for submissions
        status: sub.status as EvaluationStatus, // Cast Prisma enum to DTO enum
        author: sub.author ? {
          ...sub.author,
          globalRole: sub.author.globalRole as globalRole, // Cast Prisma enum to DTO enum
        } : undefined,
      })),
      categories: updatedSession.categories,
      _count: updatedSession._count,
    };
  }

  private async createAnonymousUser(submissionId: string, userId: number) {
    const anonymousNames = [
      'Teilnehmer',
      'Bewerter',
      'Diskutant',
      'Reviewer',
      'Kommentator',
      'Analyst',
      'Kritiker',
      'Prüfer',
      'Evaluator',
      'Gutachter',
    ];

    const randomName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
    const suffix = Math.floor(Math.random() * 1000);

    return await this.prisma.anonymousUser.create({
      data: {
        userId,
        anonymousName: `${randomName} ${suffix}`,
      },
    });
  }

  private generateColorCode(userId: number): string {
    const colors = [
      '#F44336',
      '#E91E63',
      '#9C27B0',
      '#673AB7',
      '#3F51B5',
      '#2196F3',
      '#03A9F4',
      '#00BCD4',
      '#009688',
      '#4CAF50',
      '#8BC34A',
      '#CDDC39',
      '#FFC107',
      '#FF9800',
      '#FF5722',
      '#795548',
      '#607D8B',
    ];

    return colors[userId % colors.length];
  }

  private mapToDTO(submission: any): EvaluationSubmissionDTO {
    return {
      id: submission.id,
      title: submission.title,
      description: submission.description,
      authorId: submission.authorId,
      pdfFileId: submission.pdfFileId,
      sessionId: submission.sessionId,
      status: submission.status,
      phase: submission.session?.phase || 'DISCUSSION',
      submittedAt: submission.submittedAt,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      author: submission.author,
      pdfFile: submission.pdfFile,
      session: submission.session,
      discussions: submission.discussions,
      ratings: submission.ratings,
      _count: submission._count,
      pdfMetadata: submission.pdfFile
        ? {
            pageCount: 0, // Default value since we don't store this in the File model
            fileSize: 0,  // Default value since we don't store this in the File model
            downloadUrl: `/api/evaluation-submissions/${submission.id}/pdf`,
          }
        : undefined,
    };
  }
}
