/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import type {
  CreateEvaluationCommentDTO,
  UpdateEvaluationCommentDTO,
  EvaluationCommentDTO,
  VoteType,
} from '@DTOs/index';
import { EvaluationCacheService } from '../shared/evaluation-cache.service';
import { EvaluationUtilsService } from '../shared/evaluation-utils.service';
import type { Prisma } from '@prisma/client';

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Definiert die Struktur für die Speicherung von Stimmdetails als JSON-Objekt in Prisma.
 */
interface VoteDetails {
  userVotes: { [userId: string]: VoteType };
}

/**
 * Definiert einen stark typisierten Kommentar, wie er von Prisma mit Relationen zurückgegeben wird.
 * Dies vermeidet die Verwendung von `any` und erhöht die Typsicherheit.
 */
type PrismaCommentWithDetails = Prisma.EvaluationCommentGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        firstname: true;
        lastname: true;
      };
    };
    category: {
      select: {
        id: true;
        name: true;
        displayName: true;
        description: true;
        icon: true;
        color: true;
        order: true;
      };
    };
    replies: {
      include: {
        user: {
          select: {
            id: true;
            firstname: true;
            lastname: true;
          };
        };
        category: {
          select: {
            id: true;
            name: true;
            displayName: true;
            description: true;
            icon: true;
            color: true;
            order: true;
          };
        };
        replies: {
          include: {
            user: {
              select: {
                id: true;
                firstname: true;
                lastname: true;
              };
            };
            category: {
              select: {
                id: true;
                name: true;
                displayName: true;
                description: true;
                icon: true;
                color: true;
                order: true;
              };
            };
            replies: true; // Include nested replies (recursive)
          };
        };
      };
    };
  };
}>;

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
          comments: comments.map(comment => this.mapCommentToDTO(comment)),
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
  ): Promise<EvaluationCommentDTO[]> {
    const cacheKey = this.utilsService.generateCacheKey(
      'comments',
      submissionId,
      categoryId.toString(),
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

        return comments.map(comment => this.mapCommentToDTO(comment));
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
  async findOne(id: string): Promise<EvaluationCommentDTO> {
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

    return this.mapCommentToDTO(comment);
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

    return this.mapCommentToDTO(comment);
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

    return this.mapCommentToDTO(updatedComment);
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
   * Verarbeitet eine Stimme (Upvote/Downvote) für einen Kommentar.
   * Fügt eine Stimme hinzu, entfernt sie oder ändert sie.
   *
   * @param commentId Die ID des Kommentars, für den abgestimmt wird.
   * @param voteType Der Typ der Stimme ('UP', 'DOWN') oder `null` zum Entfernen der Stimme.
   * @param userId Die ID des abstimmenden Benutzers.
   * @returns Ein Promise, das ein Objekt mit den aktualisierten Stimmergebnissen auflöst.
   * @throws {NotFoundException} Wenn kein Kommentar mit der gegebenen ID gefunden wird.
   */
  async vote(commentId: string, voteType: 'UP' | 'DOWN' | null, userId: number) {
    const comment = await this.prisma.evaluationComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Defensive programming: Ensure voteDetails and userVotes exist
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };

    // Ensure userVotes object exists before accessing
    const userVotes = voteDetails.userVotes || {};
    const previousVote = userVotes[userId.toString()];

    let newUpvotes = comment.upvotes;
    let newDownvotes = comment.downvotes;

    if (voteType === null) {
      // Remove vote
      if (previousVote) {
        delete userVotes[userId.toString()];
        if (previousVote === 'UP') {
          newUpvotes--;
        } else {
          newDownvotes--;
        }
      }
    } else {
      // Add or change vote
      if (previousVote === voteType) {
        // Same vote - remove it
        delete userVotes[userId.toString()];
        if (voteType === 'UP') {
          newUpvotes--;
        } else {
          newDownvotes--;
        }
      } else {
        // New vote or change vote
        if (previousVote) {
          // Remove previous vote first
          if (previousVote === 'UP') {
            newUpvotes--;
          } else {
            newDownvotes--;
          }
        }

        // Add new vote
        userVotes[userId.toString()] = voteType;
        if (voteType === 'UP') {
          newUpvotes++;
        } else {
          newDownvotes++;
        }
      }
    }

    // Update voteDetails with the modified userVotes
    const updatedVoteDetails = { userVotes };

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
      downvotes: newDownvotes,
      voteStats: {
        upVotes: newUpvotes,
        downVotes: newDownvotes,
        totalVotes: newUpvotes + newDownvotes,
        score: newUpvotes - newDownvotes,
      },
      userVote: userVotes[userId.toString()] || null,
      netVotes: newUpvotes - newDownvotes,
    };
  }

  /**
   * Process multiple votes in a batch operation for better performance
   * @param votes - Array of vote operations
   * @param userId - The user ID
   * @returns Array of vote results
   */
  async batchVote(votes: { commentId: string; voteType: 'UP' | 'DOWN' | null }[], userId: number) {
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
    voteType: 'UP' | 'DOWN' | null,
    userId: number,
  ) {
    const comment = await tx.evaluationComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Process vote logic (same as single vote)
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
    const userVotes = voteDetails.userVotes || {};
    const previousVote = userVotes[userId.toString()];

    let newUpvotes = comment.upvotes;
    let newDownvotes = comment.downvotes;

    // Vote processing logic (extracted for reuse)
    ({ newUpvotes, newDownvotes } = this.calculateVoteChanges(
      voteType,
      previousVote,
      newUpvotes,
      newDownvotes,
      userVotes,
      userId,
    ));

    const updatedVoteDetails = { userVotes };

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
      userVote: userVotes[userId.toString()] || null,
      netVotes: newUpvotes - newDownvotes,
    };
  }

  /**
   * Extract vote calculation logic for reuse
   */
  private calculateVoteChanges(
    voteType: 'UP' | 'DOWN' | null,
    previousVote: string | undefined,
    upvotes: number,
    downvotes: number,
    userVotes: { [userId: string]: VoteType },
    userId: number,
  ): { newUpvotes: number; newDownvotes: number } {
    let newUpvotes = upvotes;
    let newDownvotes = downvotes;

    if (voteType === null) {
      // Remove vote
      if (previousVote) {
        delete userVotes[userId.toString()];
        if (previousVote === 'UP') {
          newUpvotes--;
        } else {
          newDownvotes--;
        }
      }
    } else {
      // Add or change vote
      if (previousVote === voteType) {
        // Same vote - remove it
        delete userVotes[userId.toString()];
        if (voteType === 'UP') {
          newUpvotes--;
        } else {
          newDownvotes--;
        }
      } else {
        // New vote or change vote
        if (previousVote) {
          // Remove previous vote first
          if (previousVote === 'UP') {
            newUpvotes--;
          } else {
            newDownvotes--;
          }
        }

        // Add new vote
        userVotes[userId.toString()] = voteType;
        if (voteType === 'UP') {
          newUpvotes++;
        } else {
          newDownvotes++;
        }
      }
    }

    return { newUpvotes, newDownvotes };
  }

  /**
   * Gets the current user's vote status for a specific comment
   * @param commentId - The comment ID
   * @param userId - The user ID
   * @returns The user's vote type or null if no vote exists
   */
  async getUserVoteForComment(commentId: string, userId: number): Promise<'UP' | 'DOWN' | null> {
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
        downVotes: comment.downvotes,
        totalVotes: comment.upvotes + comment.downvotes,
        score: comment.upvotes - comment.downvotes,
      },
      userVote: userVote,
      netVotes: comment.upvotes - comment.downvotes,
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
  private mapCommentToDTO(comment: any): EvaluationCommentDTO {
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
    const userVotes = voteDetails.userVotes || {};

    // Recursively map replies, handling cases where replies might not have full relations
    const mappedReplies = comment.replies?.map((reply: any) => this.mapCommentToDTO(reply)) || [];

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
        downVotes: comment.downvotes,
        totalVotes: comment.upvotes + comment.downvotes,
        score: comment.upvotes - comment.downvotes,
      },
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
}
