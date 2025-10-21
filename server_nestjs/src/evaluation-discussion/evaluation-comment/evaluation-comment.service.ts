/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import type {
  CreateEvaluationCommentDTO,
  UpdateEvaluationCommentDTO,
  EvaluationCommentDTO,
  VoteType,
  VoteLimitStatusDTO,
  VoteLimitResponseDTO,
  ResetVotesDTO,
  ResetVotesResponseDTO,
} from '@DTOs/index';
import { EvaluationCacheService } from '../shared/evaluation-cache.service';
import { EvaluationUtilsService } from '../shared/evaluation-utils.service';
import { Prisma } from '@prisma/client';

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Definiert die Struktur für die Speicherung von Stimmdetails als JSON-Objekt in Prisma.
 * Erweitert für Ranking-System mit mehrfachen Votes pro User.
 */
interface VoteDetails {
  // Legacy placeholder kept for backward compatibility (no longer used with new schema)
  userVotes: { [userId: string]: VoteType };
  userVoteCounts?: { [userId: string]: number };
}

@Injectable()
export class EvaluationCommentService {
  private readonly logger = new Logger(EvaluationCommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: EvaluationCacheService,
    private readonly utilsService: EvaluationUtilsService,
  ) {}

  /**
   * Findet alle Kommentare für eine Abgabe basierend auf der Abgabe-ID mit Pagination.
   *
   * @param submissionId - Die ID der Abgabe.
   * @param categoryId - Optional: Die ID der Kategorie, nach der gefiltert werden soll.
   * @param options - Pagination and filtering options
   * @returns Ein Promise, das paginated Kommentar-DTOs auflöst.
   */
  async findBySubmissionPaginated(
    submissionId: string,
    categoryId: string,
    options: {
      page?: number;
      pageSize?: number;
      sortOrder?: 'asc' | 'desc';
      onlyTopLevel?: boolean;
    } = {},
  ): Promise<{
    comments: EvaluationCommentDTO[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, pageSize = 20, sortOrder = 'desc', onlyTopLevel = false } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: Prisma.EvaluationCommentWhereInput = { submissionId };
    if (categoryId) {
      whereClause.categoryId = Number(categoryId);
    }
    if (onlyTopLevel) {
      whereClause.parentId = null;
    }

    // Get total count for pagination
    const total = await this.prisma.evaluationComment.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(total / pageSize);

    const cacheKey = this.utilsService.generateCacheKey(
      'comments-paginated',
      submissionId,
      categoryId.toString(),
      page.toString(),
      pageSize.toString(),
      sortOrder,
      onlyTopLevel.toString(),
    );

    const result = await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const comments = await this.prisma.evaluationComment.findMany({
          where: whereClause,
          relationLoadStrategy: 'join',
          skip,
          take: pageSize,
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                icon: true,
                color: true,
              },
            },
            EvaluationCommentVote: {
              select: { userId: true, voteCount: true, createdAt: true },
            },
            replies: {
              take: 5, // Limit replies in paginated view
              include: {
                user: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    description: true,
                    icon: true,
                    color: true,
                  },
                },
                replies: {
                  take: 3,
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        name: true,
                        displayName: true,
                        description: true,
                        icon: true,
                        color: true,
                      },
                    },
                    EvaluationCommentVote: {
                      select: { userId: true, voteCount: true, createdAt: true },
                    },
                    replies: true,
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: sortOrder },
        });

        return {
          comments: comments.map(comment => this.mapCommentToDTO(comment)), // No userId for paginated results (performance)
          pagination: {
            page,
            pageSize,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        };
      },
      180000, // 3 minutes cache for paginated results
    );

    return result;
  }

  /**
   * Findet alle Kommentare für eine Abgabe basierend auf der Abgabe-ID.
   *
   * @param submissionId - Die ID der Abgabe.
   * @param categoryId - Optional: Die ID der Kategorie, nach der gefiltert werden soll.
   * @returns Ein Promise, das ein Array von Kommentar-DTOs auflöst.
   */
  async findBySubmission(
    submissionId: string,
    categoryId: string,
    currentUserId?: number,
  ): Promise<EvaluationCommentDTO[]> {
    const cacheKey = this.utilsService.generateCacheKey(
      'comments',
      submissionId,
      categoryId.toString(),
      currentUserId?.toString() || 'anonymous', // Include userId in cache for userVoteCount
    );
    console.log('🔍 findBySubmission service  cachekey:', cacheKey);
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const whereClause: Prisma.EvaluationCommentWhereInput = { submissionId };
        if (categoryId) {
          whereClause.categoryId = Number(categoryId);
        }

        // Temporarily disable parentId filtering to restore existing comments visibility
        // This allows both existing comments (without parentId) and new top-level comments
        // TODO: Re-enable proper parentId filtering after data migration
        const extendedWhereClause = { ...whereClause };

        const comments = await this.prisma.evaluationComment.findMany({
          where: extendedWhereClause,
          relationLoadStrategy: 'join', // More efficient for deep relations
          take: 50, // Limit initial load for performance
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                icon: true,
                color: true,
              },
            },
            EvaluationCommentVote: {
              select: { userId: true, voteCount: true, createdAt: true },
            },
            replies: {
              take: 20, // Limit replies per comment
              include: {
                user: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    description: true,
                    icon: true,
                    color: true,
                  },
                },
                replies: {
                  take: 10, // Limit nested replies
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstname: true,
                        lastname: true,
                      },
                    },
                    category: {
                      select: {
                        id: true,
                        name: true,
                        displayName: true,
                        description: true,
                        icon: true,
                        color: true,
                      },
                    },
                    EvaluationCommentVote: {
                      select: { userId: true, voteCount: true, createdAt: true },
                    },
                    replies: true, // Support deeper nesting
                  },
                  orderBy: { createdAt: 'asc' }, // Replies chronological order
                },
              },
              orderBy: { createdAt: 'asc' }, // Replies chronological order
            },
          },
          orderBy: { createdAt: 'desc' }, // Top-level comments newest first
        });

        return comments.map(comment => this.mapCommentToDTO(comment, currentUserId));
      },
      300000,
    ); // 5 minutes cache
  }

  /**
   * Findet einen einzelnen Kommentar basierend auf seiner ID.
   *
   * @param id - Die ID des Kommentars.
   * @returns Ein Promise, das das Kommentar-DTO auflöst.
   * @throws {NotFoundException} Wenn kein Kommentar mit der gegebenen ID gefunden wird.
   */
  async findOne(id: string, currentUserId?: number): Promise<EvaluationCommentDTO> {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            icon: true,
            color: true,
          },
        },
        EvaluationCommentVote: {
          select: { userId: true, voteCount: true, createdAt: true },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                icon: true,
                color: true,
              },
            },
            EvaluationCommentVote: {
              select: { userId: true, voteCount: true, createdAt: true },
            },
            replies: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return this.mapCommentToDTO(comment, currentUserId);
  }

  /**
   * Erstellt einen neuen Kommentar für eine Abgabe.
   * Generiert einen anonymen Anzeigenamen, speichert den Kommentar und benachrichtigt andere Teilnehmer.
   *
   * @param createDto DTO mit den Daten für den neuen Kommentar.
   * @param userId Die ID des Benutzers, der den Kommentar erstellt.
   * @returns Ein Promise, das das erstellte Kommentar-DTO auflöst.
   */
  async create(
    createDto: CreateEvaluationCommentDTO,
    userId: number,
  ): Promise<EvaluationCommentDTO> {
    // Validate reply if parentId is provided
    if (createDto.parentId) {
      await this.validateReply(createDto.parentId, createDto.submissionId);
    }

    // Generate anonymous display name
    console.log('createDto', createDto);
    console.log('userId', userId);
    const anonymousDisplayName = await this.generateAnonymousName(createDto.submissionId, userId);
    console.log('anonymousDisplayName', anonymousDisplayName);
    const comment = await this.prisma.evaluationComment.create({
      data: {
        submissionId: createDto.submissionId,
        categoryId: createDto.categoryId,
        userId: userId,
        content: createDto.content,
        parentId: createDto.parentId || null, // Handle reply functionality
        anonymousDisplayName,
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            icon: true,
            color: true,
          },
        },
        EvaluationCommentVote: {
          select: { userId: true, voteCount: true, createdAt: true },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                icon: true,
                color: true,
              },
            },
            EvaluationCommentVote: {
              select: { userId: true, voteCount: true, createdAt: true },
            },
            replies: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Send notification to other participants
    await this.notificationService.notifyEvaluationComment(createDto.submissionId, userId);

    // Invalidate cache for this submission
    this.cacheService.invalidateByPattern(`comments:${createDto.submissionId}:.*`);

    return this.mapCommentToDTO(comment, userId);
  }

  /**
   * Aktualisiert einen bestehenden Kommentar.
   *
   * @param id Die ID des zu aktualisierenden Kommentars.
   * @param updateDto DTO mit den neuen Daten für den Kommentar.
   * @param userId Die ID des Benutzers, der die Aktualisierung anfordert (muss der Autor sein).
   * @returns Ein Promise, das das aktualisierte Kommentar-DTO auflöst.
   */
  async update(
    id: string,
    updateDto: UpdateEvaluationCommentDTO,
    userId: number,
  ): Promise<EvaluationCommentDTO> {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updatedComment = await this.prisma.evaluationComment.update({
      where: { id },
      data: {
        content: updateDto.content,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            icon: true,
            color: true,
          },
        },
        EvaluationCommentVote: {
          select: { userId: true, voteCount: true, createdAt: true },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                icon: true,
                color: true,
              },
            },
            EvaluationCommentVote: {
              select: { userId: true, voteCount: true, createdAt: true },
            },
            replies: true, // Nested replies
          },
          orderBy: { createdAt: 'asc' }, // Replies chronologically
        },
      },
    });

    // Invalidate cache for this submission
    this.cacheService.invalidateByPattern(`comments:${comment.submissionId}:.*`);

    return this.mapCommentToDTO(updatedComment, userId);
  }

  /**
   * Löscht einen Kommentar.
   *
   * @param id Die ID des zu löschenden Kommentars.
   * @param userId Die ID des Benutzers, der die Löschung anfordert (muss der Autor sein).
   * @returns Ein leeres Promise nach erfolgreicher Löschung.
   * @throws {NotFoundException} Wenn kein Kommentar mit der gegebenen ID gefunden wird.
   * @throws {ForbiddenException} Wenn der Benutzer nicht der Autor des Kommentars ist.
   */
  async remove(id: string, userId: number): Promise<void> {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.evaluationComment.delete({
      where: { id },
    });

    // Invalidate cache for this submission
    this.cacheService.invalidateByPattern(`comments:.*`);
  }

  /**
   * Verarbeitet eine positive Bewertung für einen Kommentar (Ranking-System).
   * Fügt eine Stimme hinzu oder entfernt sie. Negative Bewertungen sind nicht mehr möglich.
   *
   * @param commentId Die ID des Kommentars, für den abgestimmt wird.
   * @param voteType Der Typ der Stimme ('UP' für positive Bewertung) oder `null` zum Entfernen.
   * @param userId Die ID des abstimmenden Benutzers.
   * @returns Ein Promise, das ein Objekt mit den aktualisierten Stimmergebnissen auflöst.
   * @throws {NotFoundException} Wenn kein Kommentar mit der gegebenen ID gefunden wird.
   * @throws {BadRequestException} Wenn ein ungültiger voteType verwendet wird.
   */
  /**
   * Core vote operation with comprehensive error handling
   * @param commentId Comment ID to vote on
   * @param voteType Vote type ('UP' or null to remove)
   * @param userId User ID performing the vote
   * @returns Vote result with updated statistics
   */
  async vote(commentId: string, voteType: 'UP' | null, userId: number) {
    const voteId = `${commentId}-${userId}-${Date.now()}`;
    this.logger.log(`🗳️ Processing core vote: ${voteId}`);

    try {
      // Input validation
      if (!commentId || typeof commentId !== 'string') {
        throw new BadRequestException('Invalid comment ID provided');
      }

      if (!userId || typeof userId !== 'number' || userId <= 0) {
        throw new BadRequestException('Invalid user ID provided');
      }

      // Fetch comment with comprehensive error handling
      let comment;
      try {
        comment = await this.prisma.evaluationComment.findUnique({
          where: { id: commentId },
          select: {
            id: true,
            userId: true,
            submissionId: true,
            categoryId: true,
          },
        });
      } catch (dbError) {
        this.logger.error(`❌ Database error fetching comment for vote ${voteId}:`, dbError);
        throw new InternalServerErrorException('Database error while fetching comment for vote');
      }

      if (!comment) {
        this.logger.warn(`⚠️ Comment not found for vote: ${commentId}`);
        throw new NotFoundException(`Comment with ID ${commentId} not found`);
      }

      // 🚨 CRITICAL SECURITY: Prevent self-voting
      if (comment.userId === userId) {
        this.logger.warn(
          `🚫 Self-voting blocked in core vote: user ${userId} comment ${commentId}`,
        );
        throw new ForbiddenException(
          'Users cannot vote on their own comments. Self-voting is not allowed.',
        );
      }

      // Fetch existing vote for this user/comment
      const existingVote = await this.prisma.evaluationCommentVote.findFirst({
        where: { commentId, userId },
        select: { voteCount: true },
      });

      // Validate voteType for ranking system
      if (voteType !== null && voteType !== 'UP') {
        throw new BadRequestException(
          `Invalid vote type '${voteType}'. Only 'UP' votes are allowed in the ranking system.`,
        );
      }

      // Check vote limits for new votes
      if (voteType === 'UP' && !existingVote) {
        try {
          const voteLimitStatus = await this.getVoteLimitStatus(
            userId,
            comment.submissionId,
            comment.categoryId?.toString() || 'null',
          );

          if (!voteLimitStatus.canVote || voteLimitStatus.remainingVotes <= 0) {
            this.logger.warn(`⚠️ Vote limit exceeded for user ${userId}`);
            throw new BadRequestException(
              `Vote limit exceeded. You have used all ${voteLimitStatus.maxVotes} available votes for this category.`,
            );
          }
        } catch (limitError) {
          if (limitError instanceof BadRequestException) {
            throw limitError;
          }
          this.logger.error(`❌ Error checking vote limits:`, limitError);
          throw new InternalServerErrorException('Error validating vote limits');
        }
      }
      // 🔐 Use transaction for atomic vote update
      let updatedUserVoteCount = existingVote?.voteCount || 0;
      try {
        await this.prisma.$transaction(
          async tx => {
            if (voteType === 'UP') {
              if (existingVote) {
                await tx.evaluationCommentVote.updateMany({
                  where: { commentId, userId },
                  data: { voteCount: { increment: 1 } },
                });
                const updated = await tx.evaluationCommentVote.findFirst({
                  where: { commentId, userId },
                  select: { voteCount: true },
                });
                updatedUserVoteCount = updated.voteCount;
              } else {
                const created = await tx.evaluationCommentVote.create({
                  data: { commentId, userId, voteCount: 1 },
                  select: { voteCount: true },
                });
                updatedUserVoteCount = created.voteCount;
              }
            } else {
              // voteType === null -> remove ONE vote if present
              if (existingVote && existingVote.voteCount > 1) {
                await tx.evaluationCommentVote.updateMany({
                  where: { commentId, userId },
                  data: { voteCount: { decrement: 1 } },
                });
                const updated = await tx.evaluationCommentVote.findFirst({
                  where: { commentId, userId },
                  select: { voteCount: true },
                });
                updatedUserVoteCount = updated.voteCount;
              } else if (existingVote) {
                await tx.evaluationCommentVote.deleteMany({ where: { commentId, userId } });
                updatedUserVoteCount = 0;
              }
            }
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000, // 5 seconds max wait
            timeout: 10000, // 10 seconds max transaction time
          },
        );
      } catch (transactionError) {
        this.logger.error(`❌ Transaction failed for vote ${voteId}:`, transactionError);

        // Handle specific Prisma errors
        if (transactionError.code === 'P2034') {
          throw new InternalServerErrorException('Transaction conflict - please retry');
        }
        if (transactionError.code === 'P2025') {
          throw new NotFoundException('Comment no longer exists');
        }

        throw new InternalServerErrorException(
          `Database transaction failed: ${transactionError.message || 'Unknown error'}`,
        );
      }

      // Invalidate cache safely
      try {
        this.cacheService.invalidateByPattern(`comments:.*`);
      } catch (cacheError) {
        this.logger.warn(`⚠️ Cache invalidation failed for vote ${voteId}:`, cacheError);
        // Don't fail the operation for cache errors
      }

      // Recalculate totals
      const agg = await this.prisma.evaluationCommentVote.aggregate({
        where: { commentId },
        _sum: { voteCount: true },
      });
      const totalUpvotes = agg._sum.voteCount || 0;
      const safeUserVoteCount = updatedUserVoteCount;
      const safeUserVote: 'UP' | null = safeUserVoteCount > 0 ? 'UP' : null;

      this.logger.log(`✅ Core vote completed: ${voteId}`);

      // Return format consistent with VoteResultDTO structure
      return {
        commentId: commentId,
        upvotes: totalUpvotes,
        downvotes: 0, // Always 0 in ranking system
        voteStats: {
          upVotes: totalUpvotes,
          downVotes: 0, // Always 0 in ranking system
          totalVotes: totalUpvotes, // Only positive votes count
          score: totalUpvotes, // Score equals upvotes in ranking system
        },
        userVote: safeUserVote,
        userVoteCount: safeUserVoteCount,
        netVotes: totalUpvotes, // Equals upvotes in ranking system
      };
    } catch (error) {
      this.logger.error(`❌ Core vote operation failed: ${voteId}`, error);

      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Wrap unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error during vote: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process multiple votes in a batch operation for better performance
   * @param votes - Array of vote operations
   * @param userId - The user ID
   * @returns Array of vote results
   */
  async batchVote(votes: { commentId: string; voteType: 'UP' | null }[], userId: number) {
    const results = [];

    // Use transaction for atomic batch operations
    await this.prisma.$transaction(async tx => {
      for (const voteOperation of votes) {
        const result = await this.processVoteInTransaction(
          tx,
          voteOperation.commentId,
          voteOperation.voteType,
          userId,
        );
        results.push(result);
      }
    });

    // Invalidate all related cache entries
    this.cacheService.invalidateByPattern(`comments:.*`);

    return results;
  }

  /**
   * Process a single vote within a transaction context
   */
  private async processVoteInTransaction(
    tx: any,
    commentId: string,
    voteType: 'UP' | null,
    userId: number,
  ) {
    const comment = await tx.evaluationComment.findUnique({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    const existingVote = await tx.evaluationCommentVote.findFirst({
      where: { commentId, userId },
      select: { voteCount: true },
    });

    let updatedUserVoteCount = existingVote?.voteCount || 0;

    if (voteType === 'UP') {
      if (existingVote) {
        await tx.evaluationCommentVote.updateMany({
          where: { commentId, userId },
          data: { voteCount: { increment: 1 } },
        });
        const updated = await tx.evaluationCommentVote.findFirst({
          where: { commentId, userId },
          select: { voteCount: true },
        });
        updatedUserVoteCount = updated.voteCount;
      } else {
        const created = await tx.evaluationCommentVote.create({
          data: { commentId, userId, voteCount: 1 },
          select: { voteCount: true },
        });
        updatedUserVoteCount = created.voteCount;
      }
    } else {
      if (existingVote && existingVote.voteCount > 1) {
        await tx.evaluationCommentVote.updateMany({
          where: { commentId, userId },
          data: { voteCount: { decrement: 1 } },
        });
        const updated = await tx.evaluationCommentVote.findFirst({
          where: { commentId, userId },
          select: { voteCount: true },
        });
        updatedUserVoteCount = updated.voteCount;
      } else if (existingVote) {
        await tx.evaluationCommentVote.deleteMany({ where: { commentId, userId } });
        updatedUserVoteCount = 0;
      }
    }

    const agg = await tx.evaluationCommentVote.aggregate({
      where: { commentId },
      _sum: { voteCount: true },
    });

    const totalUpvotes = agg._sum.voteCount || 0;

    return {
      commentId,
      upvotes: totalUpvotes,
      downvotes: 0,
      userVote: updatedUserVoteCount > 0 ? 'UP' : null,
      userVoteCount: updatedUserVoteCount,
      netVotes: totalUpvotes,
    };
  }

  /**
   * Extract vote calculation logic for multiple votes per user (Ranking System)
   * Now supports userVoteCounts for tracking multiple votes per user
   */
  private calculateVoteChanges(
    voteType: 'UP' | null,
    previousVote: string | undefined,
    upvotes: number,
    downvotes: number,
    voteDetails: VoteDetails,
    userId: number,
  ): { newUpvotes: number; newDownvotes: number } {
    let newUpvotes = upvotes;
    let newDownvotes = downvotes;

    // Initialize userVoteCounts if it doesn't exist
    if (!voteDetails.userVoteCounts) {
      voteDetails.userVoteCounts = {};
    }

    const userKey = userId.toString();
    const currentUserVoteCount = voteDetails.userVoteCounts[userKey] || 0;

    if (voteType === null) {
      // Remove ONE vote from this user (if any exist)
      if (currentUserVoteCount > 0) {
        voteDetails.userVoteCounts[userKey] = currentUserVoteCount - 1;
        newUpvotes--;

        // If no votes left, remove from userVotes as well
        if (voteDetails.userVoteCounts[userKey] === 0) {
          delete voteDetails.userVotes[userKey];
          delete voteDetails.userVoteCounts[userKey];
        }
      }
    } else if (voteType === 'UP') {
      // Add ONE more vote for this user (multiple votes allowed)
      voteDetails.userVotes[userKey] = 'UP'; // Mark that user has voted
      voteDetails.userVoteCounts[userKey] = currentUserVoteCount + 1;
      newUpvotes++;
    }

    return { newUpvotes, newDownvotes };
  }

  /**
   * Helper method to count votes from a specific user
   * Uses the new userVoteCounts structure
   */
  private countUserVotesFromRows(
    votes: { userId: number; voteCount: number }[],
    userId: number,
  ): number {
    const row = votes.find(v => v.userId === userId);
    return Math.max(0, row?.voteCount || 0);
  }

  /**
   * Gets the number of votes the user has given to a specific comment
   * @param commentId - The comment ID
   * @param userId - The user ID
   * @returns The number of votes the user has given to this comment
   */
  async getUserVoteCount(commentId: string, userId: number): Promise<number> {
    const voteRow = await this.prisma.evaluationCommentVote.findFirst({
      where: { commentId, userId },
      select: { voteCount: true },
    });
    return Math.max(0, voteRow?.voteCount || 0);
  }

  /**
   * Gets the current user's vote status for a specific comment
   * @param commentId - The comment ID
   * @param userId - The user ID
   * @returns The user's vote type or null if no vote exists
   */
  async getUserVoteForComment(commentId: string, userId: number): Promise<'UP' | null> {
    const voteRow = await this.prisma.evaluationCommentVote.findFirst({
      where: { commentId, userId },
      select: { voteCount: true },
    });
    return voteRow && voteRow.voteCount > 0 ? 'UP' : null;
  }

  /**
   * Ruft die Stimmen eines Kommentars ab.
   *
   * @param commentId - Die ID des Kommentars.
   * @param userId - Die ID des Benutzers, dessen Stimme abgerufen werden soll.
   * @returns Ein Promise, das ein Objekt mit den Stimmen- und Benutzerstimmen-Informationen auflöst.
   * @throws {NotFoundException} Wenn kein Kommentar mit der gegebenen ID gefunden wird.
   */
  async getVotes(commentId: string, userId: number) {
    const agg = await this.prisma.evaluationCommentVote.aggregate({
      where: { commentId },
      _sum: { voteCount: true },
    });
    const totalUpvotes = agg._sum.voteCount || 0;
    const voteRow = await this.prisma.evaluationCommentVote.findFirst({
      where: { commentId, userId },
      select: { voteCount: true },
    });
    const userVote = voteRow && voteRow.voteCount > 0 ? 'UP' : null;

    return {
      commentId: commentId,
      voteStats: {
        upVotes: totalUpvotes,
        downVotes: 0,
        totalVotes: totalUpvotes,
        score: totalUpvotes,
      },
      userVote: userVote,
      netVotes: totalUpvotes,
    };
  }

  /**
   * Generiert einen anonymen Anzeigenamen für einen Benutzer innerhalb einer Abgabe-Diskussion.
   * Wenn der Benutzer bereits einen Kommentar in dieser Diskussion verfasst hat, wird der existierende
   * anonyme Name zurückgegeben. Andernfalls wird ein neuer Name generiert (z.B. "Student A", "Student B"),
   * basierend auf der Anzahl der bisherigen einzigartigen Kommentatoren.
   *
   * @param submissionId - Die ID der Abgabe.
   * @param userId - Die ID des Benutzers, für den der Name generiert wird.
   * @returns Ein Promise, das den anonymen Anzeigenamen als String auflöst.
   */
  private async generateAnonymousName(submissionId: string, userId: number): Promise<string> {
    // Check if user already has an anonymous name for this submission
    console.log('submissionId', submissionId);
    console.log('userId', userId);
    const existingComment = await this.prisma.evaluationComment.findFirst({
      where: {
        submissionId,
        userId,
      },
      select: {
        anonymousDisplayName: true,
      },
    });
    console.log('existingComment', existingComment);
    if (existingComment) {
      return existingComment.anonymousDisplayName;
    }

    // Generate new anonymous name by grouping by userId and counting the groups.
    // This is a stable and correct way to get the count of distinct users.
    const distinctUserGroups = await this.prisma.evaluationComment.groupBy({
      by: ['userId'],
      where: { submissionId },
    });

    const distinctUserCount = distinctUserGroups.length;

    return `Student ${String.fromCharCode(65 + distinctUserCount)}`;
  }

  /**
   * Mappt einen Prisma-Kommentar mit allen Details auf ein EvaluationCommentDTO.
   * Unterstützt jetzt hierarchische Replies.
   *
   * @param comment - Der Prisma-Kommentar-Objekt.
   * @returns Das entsprechende EvaluationCommentDTO.
   */
  private mapCommentToDTO(comment: any, currentUserId?: number): EvaluationCommentDTO {
    const votes: Array<{ userId: number; voteCount: number; createdAt: Date }> =
      comment.EvaluationCommentVote || [];

    const totalUpvotes = votes.reduce((sum, v) => sum + Math.max(0, v.voteCount || 0), 0);
    const userVoteCount = currentUserId
      ? this.countUserVotesFromRows(votes, currentUserId)
      : undefined;

    // Recursively map replies
    const mappedReplies =
      comment.replies?.map((reply: any) => this.mapCommentToDTO(reply, currentUserId)) || [];

    return {
      id: comment.id,
      submissionId: comment.submissionId,
      categoryId: comment.categoryId,
      authorId: comment.userId,
      content: comment.content,
      parentId: comment.parentId || null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user?.id?.toString() || comment.userId?.toString(),
        type: 'anonymous',
        displayName: comment.anonymousDisplayName || 'Anonymous User',
        colorCode: this.utilsService.generateColorCode(comment.user?.id || comment.userId),
      },
      category: comment.category
        ? {
            id: comment.category.id,
            name: comment.category.name,
            displayName: comment.category.displayName,
            description: comment.category.description,
            icon: comment.category.icon,
            color: comment.category.color,
            // New schema: order resides in junction table; provide safe fallback for DTO
            order: (comment as any).order ?? 0,
          }
        : null,
      votes: votes.map(v => ({
        id: `${comment.id}-${v.userId}`,
        commentId: comment.id,
        userId: v.userId,
        voteType: (v.voteCount || 0) > 0 ? 'UP' : null,
        createdAt: (v as any).createdAt || comment.createdAt,
      })),
      replies: mappedReplies,
      replyCount: this.calculateReplyCount(comment.replies || []),
      voteStats: {
        upVotes: totalUpvotes,
        downVotes: 0,
        totalVotes: totalUpvotes,
        score: totalUpvotes,
      },
      userVoteCount,
    };
  }

  /**
   * Berechnet die Gesamtzahl der Replies rekursiv (inkl. Replies von Replies).
   *
   * @param replies - Array der direkten Replies.
   * @returns Die Gesamtzahl aller Replies.
   */
  private calculateReplyCount(replies: any[]): number {
    if (!replies || replies.length === 0) {
      return 0;
    }

    return replies.reduce((count, reply) => {
      return count + 1 + this.calculateReplyCount(reply.replies || []);
    }, 0);
  }

  /**
   * Validiert eine Reply-Anfrage.
   * Stellt sicher, dass der Parent-Comment existiert, zur gleichen Submission gehört
   * und die maximale Tiefe nicht überschritten wird.
   *
   * @param parentId - Die ID des Parent-Comments.
   * @param submissionId - Die ID der Submission.
   * @throws {NotFoundException} Wenn der Parent-Comment nicht existiert.
   * @throws {ForbiddenException} Wenn der Parent-Comment zu einer anderen Submission gehört oder maximale Tiefe überschritten wird.
   */
  private async validateReply(parentId: string, submissionId: string): Promise<void> {
    const parentComment = await this.prisma.evaluationComment.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        submissionId: true,
        parentId: true,
      },
    });

    if (!parentComment) {
      throw new NotFoundException(`Parent comment with ID ${parentId} not found`);
    }

    if (parentComment.submissionId !== submissionId) {
      throw new ForbiddenException('Parent comment must belong to the same submission');
    }

    // Calculate depth by traversing up the parent chain
    const depth = await this.calculateCommentDepth(parentId);
    const MAX_REPLY_DEPTH = 5; // Allow up to 5 levels of nesting

    if (depth >= MAX_REPLY_DEPTH) {
      throw new ForbiddenException(`Maximum reply depth of ${MAX_REPLY_DEPTH} exceeded`);
    }
  }

  /**
   * Berechnet die Tiefe eines Comments in der Reply-Hierarchie.
   *
   * @param commentId - Die ID des Comments.
   * @returns Die Tiefe (0 = Top-Level-Comment, 1 = erste Reply-Ebene, etc.).
   */
  private async calculateCommentDepth(commentId: string): Promise<number> {
    let depth = 0;
    let currentCommentId = commentId;

    while (currentCommentId) {
      const comment = await this.prisma.evaluationComment.findUnique({
        where: { id: currentCommentId },
        select: { parentId: true },
      });

      if (!comment || !comment.parentId) {
        break;
      }

      depth++;
      currentCommentId = comment.parentId;
    }

    return depth;
  }

  // =============================================================================
  // VOTE LIMIT TRACKING METHODS
  // =============================================================================

  /**
   * Gets the vote limit status for a user in a specific submission and category
   *
   * @param userId - The user ID
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @returns Promise containing vote limit status
   */
  async getVoteLimitStatus(
    userId: number,
    submissionId: string,
    categoryId: string,
  ): Promise<VoteLimitStatusDTO> {
    const cacheKey = this.utilsService.generateCacheKey(
      'vote-limit-status',
      submissionId,
      categoryId,
      userId.toString(),
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Count top-level comments in category for this submission
        const totalComments = await this.prisma.evaluationComment.count({
          where: { submissionId, categoryId: Number(categoryId), parentId: null },
        });

        // Find all user's votes in this submission/category on top-level comments
        const userVotes = await this.prisma.evaluationCommentVote.findMany({
          where: {
            userId,
            comment: { submissionId, categoryId: Number(categoryId), parentId: null },
          },
          select: { commentId: true, voteCount: true },
        });

        const votedCommentIds: number[] = [];
        // commentId is string (cuid); frontend DTO expects number[]; keep empty for now
        // If needed, this could be changed to string[] across DTOs in a separate refactor
        const totalVotesUsed = userVotes.reduce((sum, v) => sum + Math.max(0, v.voteCount || 0), 0);

        // Fixed quota: 10 votes per category
        const maxVotes = 10;
        const adjustedRemainingVotes = Math.max(0, maxVotes - totalVotesUsed);
        const adjustedCanVote = adjustedRemainingVotes > 0;
        const adjustedDisplayText = `${adjustedRemainingVotes}/${maxVotes}`;

        return {
          maxVotes,
          remainingVotes: adjustedRemainingVotes,
          votedCommentIds,
          canVote: adjustedCanVote,
          displayText: adjustedDisplayText,
        };
      },
      60000, // 1 minute cache
    );
  }

  /**
   * Updates vote limit status after a vote action
   *
   * @param userId - The user ID
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param commentId - The comment ID that was voted on
   * @param isAdding - Whether vote was added (true) or removed (false)
   * @returns Promise containing updated vote limit status
   */
  async updateVoteLimitStatus(
    userId: number,
    submissionId: string,
    categoryId: string,
    commentId: string,
    isAdding: boolean,
  ): Promise<VoteLimitStatusDTO> {
    // Invalidate cache first
    const cacheKey = this.utilsService.generateCacheKey(
      'vote-limit-status',
      submissionId,
      categoryId,
      userId.toString(),
    );
    this.cacheService.delete(cacheKey);

    // Get fresh status
    return this.getVoteLimitStatus(userId, submissionId, categoryId);
  }

  /**
   * Enhanced vote method that includes limit validation
   *
   * @param commentId - The comment ID to vote on
   * @param voteType - The type of vote ('UP' or null to remove) - Ranking System
   * @param userId - The user ID
   * @returns Promise containing vote result and updated limit status
   */
  /**
   * Vote with comprehensive error handling and limit checking
   * @param commentId Comment ID to vote on
   * @param voteType Vote type ('UP' or null to remove)
   * @param userId User ID performing the vote
   * @returns Promise with vote result and limit status
   */
  async voteWithLimitCheck(
    commentId: string,
    voteType: 'UP' | null,
    userId: number,
  ): Promise<VoteLimitResponseDTO> {
    const operationId = `vote-${commentId}-${userId}-${Date.now()}`;
    this.logger.log(
      `🗳️ Starting vote operation ${operationId}: ${
        voteType || 'remove'
      } for comment ${commentId} by user ${userId}`,
    );

    try {
      // Input validation
      if (!commentId || typeof commentId !== 'string') {
        this.logger.error(`❌ Invalid commentId: ${commentId}`);
        throw new BadRequestException('Invalid comment ID provided');
      }

      if (!userId || typeof userId !== 'number' || userId <= 0) {
        this.logger.error(`❌ Invalid userId: ${userId}`);
        throw new BadRequestException('Invalid user ID provided');
      }

      if (voteType !== null && voteType !== 'UP') {
        this.logger.error(`❌ Invalid voteType: ${voteType}`);
        throw new BadRequestException('Invalid vote type. Only UP votes are allowed.');
      }

      // Get comment to find submission and category with error handling
      let comment;
      try {
        comment = await this.prisma.evaluationComment.findUnique({
          where: { id: commentId },
          select: {
            userId: true,
            submissionId: true,
            categoryId: true,
          },
        });
      } catch (dbError) {
        this.logger.error(`❌ Database error fetching comment ${commentId}:`, dbError);
        throw new InternalServerErrorException('Database error while fetching comment');
      }

      if (!comment) {
        this.logger.warn(`⚠️ Comment not found: ${commentId}`);
        throw new NotFoundException(`Comment with ID ${commentId} not found`);
      }

      // 🚨 CRITICAL SECURITY: Prevent self-voting (double-check in voteWithLimitCheck)
      if (comment.userId === userId) {
        this.logger.warn(
          `🚫 Self-voting attempt blocked: user ${userId} tried to vote on comment ${commentId}`,
        );
        throw new ForbiddenException(
          'Users cannot vote on their own comments. Self-voting is not allowed.',
        );
      }

      // Get current vote limit status with error handling
      let currentStatus;
      try {
        currentStatus = await this.getVoteLimitStatus(
          userId,
          comment.submissionId,
          comment.categoryId?.toString() || 'null',
        );
      } catch (limitError) {
        this.logger.error(`❌ Error getting vote limit status:`, limitError);
        throw new InternalServerErrorException('Error checking vote limits');
      }
      // Check if user has an existing vote row
      const existingVote = await this.prisma.evaluationCommentVote.findFirst({
        where: { commentId, userId },
        select: { voteCount: true },
      });
      const isNewVote = !existingVote && voteType !== null;

      // Check vote limits
      if (isNewVote && !currentStatus.canVote) {
        const currentUserVoteCount = existingVote?.voteCount || 0;
        this.logger.warn(
          `⚠️ Vote limit exceeded for user ${userId} in category ${comment.categoryId}`,
        );

        return {
          success: false,
          voteLimitStatus: currentStatus,
          message: 'Vote limit reached. Cannot add more votes.',
          userVoteCount: currentUserVoteCount,
        };
      }

      // Proceed with the vote operation
      let voteResult;
      try {
        voteResult = await this.vote(commentId, voteType, userId);
        this.logger.log(`✅ Vote operation successful: ${operationId}`);
      } catch (voteError) {
        this.logger.error(`❌ Vote operation failed: ${operationId}`, voteError);
        throw voteError; // Re-throw to maintain error details
      }

      // Update vote limit status
      let updatedStatus;
      try {
        const isAddingVote = !existingVote && voteType !== null;
        updatedStatus = await this.updateVoteLimitStatus(
          userId,
          comment.submissionId,
          comment.categoryId?.toString() || 'null',
          commentId,
          isAddingVote,
        );
      } catch (statusError) {
        this.logger.error(`❌ Error updating vote limit status:`, statusError);
        // Don't fail the entire operation for status update errors
        updatedStatus = currentStatus;
      }

      // Get updated comment to calculate userVoteCount
      let userVoteCount = 0;
      try {
        const voteRow = await this.prisma.evaluationCommentVote.findFirst({
          where: { commentId, userId },
          select: { voteCount: true },
        });
        userVoteCount = Math.max(0, voteRow?.voteCount || 0);
      } catch (countError) {
        this.logger.warn(`⚠️ Error calculating user vote count:`, countError);
        // Use fallback from vote result if available
        userVoteCount = voteResult?.userVoteCount || 0;
      }

      this.logger.log(`✅ Vote operation completed: ${operationId}`);
      return {
        success: true,
        voteLimitStatus: updatedStatus,
        message: 'Vote successfully processed.',
        userVoteCount: userVoteCount,
      };
    } catch (error) {
      this.logger.error(`❌ Vote operation failed: ${operationId}`, error);

      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Wrap unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error during vote operation: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Resets user votes in a specific category
   *
   * @param userId - The user ID whose votes to reset
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param voteType - The type of votes to reset ('UP' or 'ALL') - Ranking System
   * @returns Promise containing reset result and updated vote limit status
   */
  async resetUserVotes(
    userId: number,
    submissionId: string,
    categoryId: number,
    voteType: 'UP' | 'ALL', // Removed 'DOWN' for ranking system
  ): Promise<{
    success: boolean;
    resetCount: number;
    voteLimitStatus: VoteLimitStatusDTO;
    affectedCommentIds: string[];
  }> {
    console.log('🔄 Resetting user votes:', {
      userId,
      submissionId,
      categoryId,
      voteType,
      timestamp: new Date().toISOString(),
    });

    try {
      // Find all user's votes for top-level comments in this submission/category
      const userVotes = await this.prisma.evaluationCommentVote.findMany({
        where: {
          userId,
          comment: { submissionId, categoryId, parentId: null },
        },
        select: { commentId: true },
      });

      const affectedCommentIds: string[] = userVotes.map(v => v.commentId);
      let resetCount = 0;

      if (affectedCommentIds.length > 0) {
        // Delete all vote rows (ranking system only has UP votes)
        const res = await this.prisma.evaluationCommentVote.deleteMany({
          where: { userId, commentId: { in: affectedCommentIds } },
        });
        resetCount = res.count;
      }

      // Invalidate cache for this user's vote limit status
      const cacheKey = this.utilsService.generateCacheKey(
        'vote-limit-status',
        submissionId,
        categoryId.toString(),
        userId.toString(),
      );
      this.cacheService.delete(cacheKey);

      // Get updated vote limit status
      const updatedVoteLimitStatus = await this.getVoteLimitStatus(
        userId,
        submissionId,
        categoryId.toString(),
      );

      console.log('🎯 Vote reset completed:', {
        resetCount,
        affectedCommentIds: affectedCommentIds.length,
        updatedVoteLimitStatus: {
          remainingVotes: updatedVoteLimitStatus.remainingVotes,
          maxVotes: updatedVoteLimitStatus.maxVotes,
        },
      });

      return {
        success: true,
        resetCount,
        voteLimitStatus: updatedVoteLimitStatus,
        affectedCommentIds,
      };
    } catch (error) {
      console.error('❌ Error resetting user votes:', error);
      throw error;
    }
  }

  /**
   * Helper method to determine if a vote should be reset based on criteria
   *
   * @param userVote - The user's current vote ('UP' or 'DOWN')
   * @param resetType - The type of reset requested ('UP', 'DOWN', or 'ALL')
   * @returns boolean indicating if the vote should be reset
   */
  private shouldResetVote(userVote: 'UP', resetType: 'UP' | 'ALL'): boolean {
    if (resetType === 'ALL') {
      return true;
    }
    return userVote === resetType; // Only 'UP' votes exist in ranking system
  }

  // =============================================================================
  // RATING-TO-COMMENT INTEGRATION
  // =============================================================================

  /**
   * Creates a comment automatically from a user's rating
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param userId - The user ID who created the rating
   * @param comment - The comment text from the rating
   * @param score - The numeric score (for display purposes)
   * @returns Promise containing the created comment DTO
   */
  async createCommentFromRating(
    submissionId: string,
    categoryId: number,
    userId: number,
    comment: string,
    score: number,
  ): Promise<EvaluationCommentDTO> {
    this.logger.log(
      `📝 Creating comment from rating: submission=${submissionId}, category=${categoryId}, user=${userId}`,
    );

    // Check if a rating comment already exists for this user/category/submission
    const existingRatingComment = await this.prisma.evaluationComment.findFirst({
      where: {
        submissionId,
        categoryId,
        userId,
        content: {
          startsWith: '[Schriftliche Bewertung]',
        },
      },
    });

    if (existingRatingComment) {
      this.logger.log(`✅ Rating comment already exists: ${existingRatingComment.id}`);
      return this.mapCommentToDTO(existingRatingComment, userId);
    }

    // Generate anonymous display name
    const anonymousDisplayName = await this.generateAnonymousName(submissionId, userId);

    // Format the comment content to indicate it's from a rating
    const formattedContent = `[Schriftliche Bewertung] (${score}/10)\n\n${comment}`;

    try {
      const createdComment = await this.prisma.evaluationComment.create({
        data: {
          submissionId,
          categoryId,
          userId,
          content: formattedContent,
          parentId: null, // Rating comments are always top-level
          anonymousDisplayName,
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
              icon: true,
              color: true,
            },
          },
          EvaluationCommentVote: {
            select: { userId: true, voteCount: true, createdAt: true },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                },
              },
              category: true,
              EvaluationCommentVote: {
                select: { userId: true, voteCount: true, createdAt: true },
              },
              replies: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // Invalidate cache for this submission
      this.cacheService.invalidateByPattern(`comments:${submissionId}:.*`);

      this.logger.log(`✅ Rating comment created successfully: ${createdComment.id}`);
      return this.mapCommentToDTO(createdComment, userId);
    } catch (error) {
      this.logger.error(`❌ Failed to create comment from rating:`, error);
      throw new InternalServerErrorException('Failed to create comment from rating');
    }
  }

  /**
   * Updates an existing rating comment when the rating is modified
   *
   * @param submissionId - The submission ID
   * @param categoryId - The category ID
   * @param userId - The user ID who owns the rating
   * @param comment - The updated comment text
   * @param score - The updated numeric score
   * @returns Promise containing the updated comment DTO
   */
  async updateCommentFromRating(
    submissionId: string,
    categoryId: number,
    userId: number,
    comment: string,
    score: number,
  ): Promise<EvaluationCommentDTO | null> {
    this.logger.log(
      `📝 Updating rating comment: submission=${submissionId}, category=${categoryId}, user=${userId}`,
    );

    // Find the existing rating comment
    const existingRatingComment = await this.prisma.evaluationComment.findFirst({
      where: {
        submissionId,
        categoryId,
        userId,
        content: {
          startsWith: '[Schriftliche Bewertung]',
        },
      },
    });

    if (!existingRatingComment) {
      this.logger.warn(`⚠️ No existing rating comment found to update`);
      return null;
    }

    // Format the updated content
    const formattedContent = `[Schriftliche Bewertung] (${score}/10)\n\n${comment}`;

    try {
      const updatedComment = await this.prisma.evaluationComment.update({
        where: { id: existingRatingComment.id },
        data: {
          content: formattedContent,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
              icon: true,
              color: true,
            },
          },
          EvaluationCommentVote: {
            select: { userId: true, voteCount: true, createdAt: true },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                },
              },
              category: true,
              EvaluationCommentVote: {
                select: { userId: true, voteCount: true, createdAt: true },
              },
              replies: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // Invalidate cache for this submission
      this.cacheService.invalidateByPattern(`comments:${submissionId}:.*`);

      this.logger.log(`✅ Rating comment updated successfully: ${updatedComment.id}`);
      return this.mapCommentToDTO(updatedComment, userId);
    } catch (error) {
      this.logger.error(`❌ Failed to update rating comment:`, error);
      throw new InternalServerErrorException('Failed to update rating comment');
    }
  }

  /**
   * Gets comment status for all categories for a specific user and submission
   *
   * @description This method checks all categories for a submission to determine
   * which ones the user has already commented in. This is used to properly
   * initialize the frontend comment status after page refreshes, including
   * comments that were automatically created from ratings.
   *
   * @param submissionId - The submission ID to check
   * @param userId - The user ID to check
   * @returns Promise containing map of categoryId to boolean indicating if user has commented
   * @memberof EvaluationCommentService
   */
  async getUserCommentStatusForAllCategories(
    submissionId: string,
    userId: number,
  ): Promise<Map<number, boolean>> {
    this.logger.log(
      `🔍 Getting comment status for all categories: ${submissionId}, userId: ${userId}`,
    );

    try {
      // Get all comments for this user and submission (including rating-generated comments)
      const userComments = await this.prisma.evaluationComment.findMany({
        where: {
          submissionId,
          userId,
        },
        select: {
          categoryId: true,
        },
        distinct: ['categoryId'],
      });

      // Create map of categoryId to hasCommented
      const commentStatusMap = new Map<number, boolean>();
      userComments.forEach(comment => {
        commentStatusMap.set(comment.categoryId, true);
      });

      this.logger.log(
        `✅ Comment status retrieved: ${commentStatusMap.size} categories with comments`,
      );
      return commentStatusMap;
    } catch (error) {
      this.logger.error(`❌ Failed to get comment status for all categories:`, error);
      throw new InternalServerErrorException('Failed to get comment status');
    }
  }
}
