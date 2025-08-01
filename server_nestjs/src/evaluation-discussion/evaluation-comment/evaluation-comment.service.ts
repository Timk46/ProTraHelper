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
   * Findet alle Kommentare für eine Abgabe basierend auf der Abgabe-ID.
   *
   * @param submissionId - Die ID der Abgabe.
   * @param categoryId - Optional: Die ID der Kategorie, nach der gefiltert werden soll.
   * @returns Ein Promise, das ein Array von Kommentar-DTOs auflöst.
   */
  async findBySubmission(
    submissionId: string,
    categoryId?: number,
  ): Promise<EvaluationCommentDTO[]> {
    const cacheKey = this.utilsService.generateCacheKey(
      'comments',
      submissionId,
      categoryId.toString() || 'all',
    );

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const whereClause: Prisma.EvaluationCommentWhereInput = { submissionId };
        if (categoryId) {
          whereClause.categoryId = categoryId;
        }

        const comments = await this.prisma.evaluationComment.findMany({
          where: whereClause,
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
          orderBy: { createdAt: 'desc' },
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

    // Return format consistent with comment DTO voteStats structure
    return {
      commentId: commentId,
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
   *
   * @param comment - Der Prisma-Kommentar-Objekt.
   * @returns Das entsprechende EvaluationCommentDTO.
   */
  private mapCommentToDTO(comment: PrismaCommentWithDetails): EvaluationCommentDTO {
    const voteDetails = (comment.voteDetails as unknown as VoteDetails) || { userVotes: {} };
    const userVotes = voteDetails.userVotes || {};

    return {
      id: comment.id,
      submissionId: comment.submissionId,
      categoryId: comment.categoryId,
      authorId: comment.userId,
      content: comment.content,
      parentId: null, // Simple comment system without replies for now
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user.id.toString(),
        type: 'anonymous',
        displayName: comment.anonymousDisplayName || 'Anonymous User',
        colorCode: this.utilsService.generateColorCode(comment.user.id),
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
      replies: [],
      replyCount: 0,
      voteStats: {
        upVotes: comment.upvotes,
        downVotes: comment.downvotes,
        totalVotes: comment.upvotes + comment.downvotes,
        score: comment.upvotes - comment.downvotes,
      },
    };
  }
}
