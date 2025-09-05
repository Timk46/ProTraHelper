/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
import type { Prisma } from '@prisma/client';

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Definiert die Struktur für die Speicherung von Stimmdetails als JSON-Objekt in Prisma.
 * Erweitert für Ranking-System mit mehrfachen Votes pro User.
 */
interface VoteDetails {
  userVotes: { [userId: string]: VoteType }; // Legacy: Tracks if user has voted
  userVoteCounts?: { [userId: string]: number }; // New: Tracks how many votes each user gave
}

@Injectable()
export class EvaluationCommentService {
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
                order: true,
              },
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
                    order: true,
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
                        order: true,
                      },
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
                order: true,
              },
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
                    order: true,
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
                        order: true,
                      },
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
            order: true,
          },
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
                order: true,
              },
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
        voteDetails: { userVotes: {} } as Prisma.JsonObject, // Initialize empty vote tracking
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
            order: true,
          },
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
                order: true,
              },
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
            order: true,
          },
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
                order: true,
              },
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
  async vote(commentId: string, voteType: 'UP' | null, userId: number) {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Defensive programming: Ensure voteDetails structure exists
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { 
      userVotes: {},
      userVoteCounts: {}
    };
    const previousVote = voteDetails.userVotes[userId.toString()];

    // Validate voteType for ranking system
    if (voteType !== null && voteType !== 'UP') {
      throw new BadRequestException(
        `Invalid vote type. Only 'UP' votes are allowed in the ranking system.`
      );
    }

    // Check vote limits - prevent exceeding maximum votes per user
    if (voteType === 'UP' && !previousVote) {
      const voteLimitStatus = await this.getVoteLimitStatus(
        userId,
        comment.submissionId,
        comment.categoryId?.toString() || 'null'
      );
      
      if (!voteLimitStatus.canVote || voteLimitStatus.remainingVotes <= 0) {
        throw new BadRequestException(
          `Vote limit exceeded. You have used all ${voteLimitStatus.maxVotes} available votes for this category.`
        );
      }
    }

    let newUpvotes = comment.upvotes;
    let newDownvotes = comment.downvotes;

    // Use the new calculateVoteChanges method for multiple votes support
    ({ newUpvotes, newDownvotes } = this.calculateVoteChanges(
      voteType,
      previousVote,
      newUpvotes,
      newDownvotes,
      voteDetails,
      userId,
    ));

    // Keep the complete voteDetails structure
    const updatedVoteDetails = voteDetails;

    const updatedComment = await this.prisma.evaluationComment.update({
      where: { id: commentId },
      data: {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        voteDetails: updatedVoteDetails as unknown as Prisma.JsonValue,
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
            order: true,
          },
        },
      },
    });

    // Invalidate cache for this submission
    this.cacheService.invalidateByPattern(`comments:.*`);

    // Return format consistent with VoteResultDTO structure
    return {
      commentId: commentId,
      upvotes: newUpvotes,
      downvotes: 0, // Always 0 in ranking system
      voteStats: {
        upVotes: newUpvotes,
        downVotes: 0, // Always 0 in ranking system
        totalVotes: newUpvotes, // Only positive votes count
        score: newUpvotes, // Score equals upvotes in ranking system
      },
      userVote: voteDetails.userVotes[userId.toString()] || null,
      userVoteCount: voteDetails.userVoteCounts?.[userId.toString()] || 0,
      netVotes: newUpvotes, // Equals upvotes in ranking system
    };
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
    const comment = await tx.evaluationComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Process vote logic with multiple votes support
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { 
      userVotes: {},
      userVoteCounts: {}
    };
    const previousVote = voteDetails.userVotes[userId.toString()];

    let newUpvotes = comment.upvotes;
    let newDownvotes = comment.downvotes;

    // Vote processing logic (extracted for reuse) - now supports multiple votes
    ({ newUpvotes, newDownvotes } = this.calculateVoteChanges(
      voteType,
      previousVote,
      newUpvotes,
      newDownvotes,
      voteDetails,
      userId,
    ));

    // Keep the complete voteDetails structure (including userVoteCounts)
    const updatedVoteDetails = voteDetails;

    const updatedComment = await tx.evaluationComment.update({
      where: { id: commentId },
      data: {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        voteDetails: updatedVoteDetails as unknown as Prisma.JsonValue,
      },
    });

    return {
      commentId,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      userVote: voteDetails.userVotes[userId.toString()] || null,
      userVoteCount: voteDetails.userVoteCounts?.[userId.toString()] || 0,
      netVotes: newUpvotes - newDownvotes,
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
  private countUserVotes(voteDetails: VoteDetails, userId: number): number {
    if (!voteDetails.userVoteCounts) {
      return voteDetails.userVotes[userId.toString()] ? 1 : 0; // Fallback to legacy
    }
    return voteDetails.userVoteCounts[userId.toString()] || 0;
  }

  /**
   * Gets the number of votes the user has given to a specific comment
   * @param commentId - The comment ID
   * @param userId - The user ID
   * @returns The number of votes the user has given to this comment
   */
  async getUserVoteCount(commentId: string, userId: number): Promise<number> {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
      select: {
        voteDetails: true,
      },
    });

    if (!comment) {
      return 0;
    }

    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
    return this.countUserVotes(voteDetails, userId);
  }

  /**
   * Gets the current user's vote status for a specific comment
   * @param commentId - The comment ID
   * @param userId - The user ID
   * @returns The user's vote type or null if no vote exists
   */
  async getUserVoteForComment(commentId: string, userId: number): Promise<'UP' | null> {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
      select: {
        voteDetails: true,
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Check voteDetails for user's vote
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
    const userVotes = voteDetails.userVotes || {};

    console.log('🔍 getUserVoteForComment:', {
      commentId,
      userId,
      userVote: userVotes[userId.toString()],
      allUserVotes: Object.keys(userVotes),
    });

    return userVotes[userId.toString()] || null;
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
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
      select: {
        upvotes: true,
        downvotes: true,
        voteDetails: true,
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
    const userVote = voteDetails.userVotes[userId.toString()] || null;

    // Return format consistent with comment DTO voteStats structure
    return {
      commentId: commentId,
      voteStats: {
        upVotes: comment.upvotes,
        downVotes: 0, // Always 0 in ranking system
        totalVotes: comment.upvotes, // Only positive votes count
        score: comment.upvotes, // Score equals upvotes in ranking system
      },
      userVote: userVote,
      netVotes: comment.upvotes, // Equals upvotes in ranking system
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
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {}, userVoteCounts: {} };
    const userVotes = voteDetails.userVotes || {};
    const userVoteCounts = voteDetails.userVoteCounts || {};

    // Calculate userVoteCount for the current user
    const userVoteCount = currentUserId ? (userVoteCounts[currentUserId.toString()] || 0) : undefined;

    // Recursively map replies, handling cases where replies might not have full relations
    const mappedReplies = comment.replies?.map((reply: any) => this.mapCommentToDTO(reply, currentUserId)) || [];

    return {
      id: comment.id,
      submissionId: comment.submissionId,
      categoryId: comment.categoryId,
      authorId: comment.userId,
      content: comment.content,
      parentId: comment.parentId || null, // Use actual parentId from database
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
            order: comment.category.order,
          }
        : null,
      votes: Object.entries(userVotes).map(([userId, voteType]) => ({
        id: `${comment.id}-${userId}`,
        commentId: comment.id,
        userId: parseInt(userId),
        voteType: voteType,
        createdAt: comment.createdAt,
      })),
      replies: mappedReplies, // Use recursively mapped replies
      replyCount: this.calculateReplyCount(comment.replies || []), // Calculate total reply count
      voteStats: {
        upVotes: comment.upvotes,
        downVotes: 0, // Always 0 in ranking system
        totalVotes: comment.upvotes, // Only positive votes count
        score: comment.upvotes, // Score equals upvotes in ranking system
      },
      userVoteCount: userVoteCount, // Number of votes the current user has given to this comment
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
    categoryId: string
  ): Promise<VoteLimitStatusDTO> {
    const cacheKey = this.utilsService.generateCacheKey(
      'vote-limit-status',
      submissionId,
      categoryId,
      userId.toString()
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Get total number of comments in this category for this submission
        const totalComments = await this.prisma.evaluationComment.count({
          where: {
            submissionId,
            categoryId: Number(categoryId),
            parentId: null, // Only count top-level comments for voting
          }
        });

        // Get comments that the user has already voted on
        const commentsWithVotes = await this.prisma.evaluationComment.findMany({
          where: {
            submissionId,
            categoryId: Number(categoryId),
            parentId: null,
          },
          select: {
            id: true,
            voteDetails: true,
          }
        });

        // Count total votes used by this user (sum of all userVoteCounts)
        const votedCommentIds: number[] = [];
        let totalVotesUsed = 0;
        
        commentsWithVotes.forEach(comment => {
          const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {}, userVoteCounts: {} };
          const userVotes = voteDetails.userVotes || {};
          const userVoteCounts = voteDetails.userVoteCounts || {};
          
          if (userVotes[userId.toString()]) {
            votedCommentIds.push(Number(comment.id));
            // Add the actual number of votes this user has given to this comment
            totalVotesUsed += userVoteCounts[userId.toString()] || 1; // Default to 1 if not tracked
          }
        });

        const remainingVotes = Math.max(0, totalComments - votedCommentIds.length);
        const canVote = remainingVotes > 0;
        const displayText = `${remainingVotes}/${totalComments}`;

        // Double the vote count - each user gets 2x the number of comments to vote on
        const maxVotes = totalComments * 2;
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
      60000 // 1 minute cache
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
    isAdding: boolean
  ): Promise<VoteLimitStatusDTO> {
    // Invalidate cache first
    const cacheKey = this.utilsService.generateCacheKey(
      'vote-limit-status',
      submissionId,
      categoryId,
      userId.toString()
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
  async voteWithLimitCheck(
    commentId: string,
    voteType: 'UP' | null,
    userId: number
  ): Promise<VoteLimitResponseDTO> {
    // Get comment to find submission and category
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
      select: {
        submissionId: true,
        categoryId: true,
        voteDetails: true,
      }
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Get current vote limit status
    const currentStatus = await this.getVoteLimitStatus(
      userId,
      comment.submissionId,
      comment.categoryId?.toString() || 'null'
    );

    // Check if user is trying to add a new vote but has no remaining votes
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
    const userVotes = voteDetails.userVotes || {};
    const previousVote = userVotes[userId.toString()];
    const isNewVote = !previousVote && voteType !== null;

    if (isNewVote && !currentStatus.canVote) {
      // For consistency, also return userVoteCount in error cases
      const currentUserVoteCount = (voteDetails.userVoteCounts || {})[userId.toString()] || 0;
      
      return {
        success: false,
        voteLimitStatus: currentStatus,
        message: 'Vote limit reached. Cannot add more votes.',
        userVoteCount: currentUserVoteCount,
      };
    }

    // Proceed with the vote
    await this.vote(commentId, voteType, userId);

    // Update vote limit status
    const isAddingVote = !previousVote && voteType !== null;
    const updatedStatus = await this.updateVoteLimitStatus(
      userId,
      comment.submissionId,
      comment.categoryId?.toString() || 'null',
      commentId,
      isAddingVote
    );

    // Get updated comment to calculate userVoteCount for this specific comment
    const updatedComment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
      select: { voteDetails: true }
    });

    // Calculate userVoteCount from the updated voteDetails
    let userVoteCount = 0;
    if (updatedComment?.voteDetails) {
      const updatedVoteDetails = (updatedComment.voteDetails as unknown as VoteDetails) || { userVotes: {}, userVoteCounts: {} };
      const userVoteCounts = updatedVoteDetails.userVoteCounts || {};
      userVoteCount = userVoteCounts[userId.toString()] || 0;
    }

    return {
      success: true,
      voteLimitStatus: updatedStatus,
      message: 'Vote successfully processed.',
      userVoteCount: userVoteCount,
    };
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
    voteType: 'UP' | 'ALL' // Removed 'DOWN' for ranking system
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
      timestamp: new Date().toISOString()
    });

    try {
      // Get all comments in this category that the user has voted on
      const commentsWithVotes = await this.prisma.evaluationComment.findMany({
        where: {
          submissionId,
          categoryId,
          parentId: null, // Only top-level comments
        },
        select: {
          id: true,
          voteDetails: true,
          upvotes: true,
          downvotes: true,
        }
      });

      const affectedCommentIds: string[] = [];
      let resetCount = 0;

      // Process each comment to reset votes
      for (const comment of commentsWithVotes) {
        const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
        const userVotes = voteDetails.userVotes || {};
        const userVote = userVotes[userId.toString()];

        // Check if this comment has a vote from this user that matches our reset criteria
        if (userVote && this.shouldResetVote(userVote, voteType)) {
          // Remove the user's vote
          delete userVotes[userId.toString()];
          
          // Update vote counts (only upvotes in ranking system)
          let newUpvotes = comment.upvotes;
          const newDownvotes = 0; // Always 0 in ranking system
          
          if (userVote === 'UP') {
            newUpvotes = Math.max(0, newUpvotes - 1);
          }
          // No need to handle 'DOWN' votes in ranking system

          // Update the comment in database
          await this.prisma.evaluationComment.update({
            where: { id: comment.id },
            data: {
              voteDetails: { userVotes },
              upvotes: newUpvotes,
              downvotes: 0, // Always 0 in ranking system
            }
          });

          affectedCommentIds.push(comment.id);
          resetCount++;

          console.log(`✅ Reset vote for comment ${comment.id}:`, {
            previousVote: userVote,
            newUpvotes,
            newDownvotes
          });
        }
      }

      // Invalidate cache for this user's vote limit status
      const cacheKey = this.utilsService.generateCacheKey(
        'vote-limit-status',
        submissionId,
        categoryId.toString(),
        userId.toString()
      );
      this.cacheService.delete(cacheKey);

      // Get updated vote limit status
      const updatedVoteLimitStatus = await this.getVoteLimitStatus(
        userId,
        submissionId,
        categoryId.toString()
      );

      console.log('🎯 Vote reset completed:', {
        resetCount,
        affectedCommentIds: affectedCommentIds.length,
        updatedVoteLimitStatus: {
          remainingVotes: updatedVoteLimitStatus.remainingVotes,
          maxVotes: updatedVoteLimitStatus.maxVotes
        }
      });

      return {
        success: true,
        resetCount,
        voteLimitStatus: updatedVoteLimitStatus,
        affectedCommentIds
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
}
