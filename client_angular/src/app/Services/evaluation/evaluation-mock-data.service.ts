import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  EvaluationRatingDTO,
  CommentStatsDTO,
  CategoryStatsDTO,
  AnonymousEvaluationUserDTO,
  RatingStatsDTO,
  VoteResultDTO,
  VoteUpdateData,
  EvaluationPhase,
  EvaluationStatus,
  VoteType,
  EVALUATION_CATEGORIES,
  AuthorDTO
} from '@DTOs/index';

@Injectable({
  providedIn: 'root'
})
export class EvaluationMockDataService {

  // Local state for interactive demo
  private mockSubmissionSubject = new BehaviorSubject<EvaluationSubmissionDTO>(this.createMockSubmission());
  private mockCommentsSubject = new BehaviorSubject<Map<number, EvaluationCommentDTO[]>>(this.createMockCommentsMap());
  private mockVoteLimitsSubject = new BehaviorSubject<Map<number, {availableVotes: number}>>(this.createMockVoteLimits());
  private mockRatingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>(this.createMockRatings());

  private nextCommentId = 20; // Start counter for new comments
  private nextVoteId = 50; // Start counter for new votes

  constructor() {}

  // =============================================================================
  // CORE DATA GETTERS
  // =============================================================================

  getMockSubmission(): Observable<EvaluationSubmissionDTO> {
    return this.mockSubmissionSubject.asObservable();
  }

  getMockCategories(): EvaluationCategoryDTO[] {
    return [
      EVALUATION_CATEGORIES.VOLLSTAENDIGKEIT,
      EVALUATION_CATEGORIES.GRAFISCHE_DARSTELLUNG,
      EVALUATION_CATEGORIES.VERGLEICHBARKEIT,
      EVALUATION_CATEGORIES.KOMPLEXITAET
    ];
  }

  getMockDiscussions(categoryId: number): Observable<EvaluationDiscussionDTO[]> {
    return this.mockCommentsSubject.pipe(
      map(commentsMap => {
        const comments = commentsMap.get(categoryId) || [];
        return [{
          id: `discussion-${categoryId}-001`,
          submissionId: "demo-submission-001",
          categoryId: categoryId,
          comments: comments,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          totalComments: comments.length,
          availableComments: 3,
          usedComments: Math.min(comments.length, 3)
        }];
      })
    );
  }

  getMockAnonymousUser(): AnonymousEvaluationUserDTO {
    return {
      id: 999, // Changed from string to number to match DTO
      userId: 999,
      submissionId: "demo-submission-001",
      displayName: "Sie (Demo-Modus)",
      colorCode: "#4CAF50",
      createdAt: new Date('2024-01-15T10:00:00Z')
    };
  }

  getMockCommentStats(): Observable<CommentStatsDTO> {
    return this.mockCommentsSubject.pipe(
      map(commentsMap => {
        const categories = this.getMockCategories();
        const categoryStats: CategoryStatsDTO[] = categories.map(cat => {
          const comments = commentsMap.get(cat.id) || [];
          const usedComments = Math.min(comments.length, 3);
          const availableComments = 3 - usedComments;

          return {
            categoryId: cat.id,
            categoryName: cat.displayName,
            availableComments: availableComments,
            usedComments: usedComments,
            isLimitReached: availableComments === 0,
            lastCommentAt: comments.length > 0 ? comments[0].createdAt : undefined,
            indicatorColor: availableComments > 1 ? 'success' : availableComments === 1 ? 'warn' : 'error',
            availabilityText: `${availableComments}/3 verfügbar`,
            availabilityIcon: availableComments > 0 ? 'add' : 'block'
          };
        });

        const totalUsed = categoryStats.reduce((sum, cat) => sum + cat.usedComments, 0);
        const totalAvailable = categoryStats.reduce((sum, cat) => sum + cat.availableComments, 0);

        return {
          submissionId: "demo-submission-001",
          totalAvailable: totalAvailable,
          totalUsed: totalUsed,
          categories: categoryStats,
          overallProgress: Math.round((totalUsed / (totalUsed + totalAvailable)) * 100),
          averageUsage: totalUsed / categories.length,
          userLimits: {
            userId: 999,
            totalLimit: 12,
            totalUsed: totalUsed,
            canComment: totalUsed < 12
          }
        };
      })
    );
  }

  getMockVoteLimits(): Observable<Map<number, {availableVotes: number}>> {
    return this.mockVoteLimitsSubject.asObservable();
  }

  getMockRatingStats(categoryId: number): Observable<RatingStatsDTO> {
    return this.mockRatingsSubject.pipe(
      map(ratings => {
        const categoryRatings = ratings.filter(r => r.categoryId === categoryId);
        const scores = categoryRatings.map(r => r.score);
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        // Create score distribution
        const scoreDistribution = [];
        for (let score = 0; score <= 10; score++) {
          const count = categoryRatings.filter(r => r.score === score).length;
          if (count > 0) {
            scoreDistribution.push({ score, count });
          }
        }

        const userRating = categoryRatings.find(r => r.userId === 999);

        return {
          submissionId: "demo-submission-001",
          categoryId: categoryId,
          averageScore: Math.round(averageScore * 10) / 10,
          totalRatings: categoryRatings.length,
          scoreDistribution: scoreDistribution,
          userRating: userRating?.score,
          userHasRated: !!userRating
        };
      })
    );
  }

  // =============================================================================
  // INTERACTIVE DEMO METHODS
  // =============================================================================

  addMockComment(categoryId: number, content: string): Observable<EvaluationCommentDTO> {
    const newComment: EvaluationCommentDTO = {
      id: `comment-${this.nextCommentId++}`,
      submissionId: "demo-submission-001",
      categoryId: categoryId,
      authorId: 999,
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),

      author: {
        id: "999",
        type: "anonymous",
        displayName: "Sie (Demo-Modus)",
        colorCode: "#4CAF50"
      },

      votes: [],
      voteStats: {
        upVotes: 0,
        downVotes: 0,
        totalVotes: 0,
        score: 0
      },

      replies: [],
      replyCount: 0
    };

    // Update local state
    const currentComments = new Map(this.mockCommentsSubject.value);
    const categoryComments = currentComments.get(categoryId) || [];
    categoryComments.unshift(newComment); // Add to beginning
    currentComments.set(categoryId, categoryComments);
    this.mockCommentsSubject.next(currentComments);

    return of(newComment);
  }

  voteMockComment(commentId: string, voteType: VoteType, categoryId: number): Observable<VoteResultDTO> {
    const currentComments = new Map(this.mockCommentsSubject.value);
    const categoryComments = currentComments.get(categoryId) || [];

    const commentIndex = categoryComments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) {
      throw new Error('Comment not found');
    }

    const comment = categoryComments[commentIndex];

    // Simulate vote logic (Ranking System: UP votes only)
    let upvotes = comment.voteStats.upVotes;
    let userVote: VoteType = null;

    // Check current user vote (simulate)
    const existingUserVote = comment.votes.find(v => v.userId === 999);

    if (voteType === 'UP') {
      if (existingUserVote?.voteType === 'UP') {
        // Remove upvote (toggle)
        upvotes--;
        userVote = null;
      } else {
        // Add upvote
        upvotes++;
        userVote = 'UP';
      }
    }
    // Note: DOWN votes not supported in ranking system

    // Update comment (Ranking System: only upvotes)
    comment.voteStats = {
      upVotes: upvotes,
      downVotes: 0, // Always 0 in ranking system
      totalVotes: upvotes,
      score: upvotes // Score equals upvotes in ranking system
    };

    // Update votes array
    if (existingUserVote) {
      const voteIndex = comment.votes.findIndex(v => v.userId === 999);
      if (userVote === null) {
        comment.votes.splice(voteIndex, 1);
      } else {
        comment.votes[voteIndex].voteType = userVote;
      }
    } else if (userVote !== null) {
      comment.votes.push({
        id: `vote-${this.nextVoteId++}`,
        commentId: commentId,
        userId: 999,
        voteType: userVote,
        createdAt: new Date()
      });
    }

    // Update state
    categoryComments[commentIndex] = comment;
    currentComments.set(categoryId, categoryComments);
    this.mockCommentsSubject.next(currentComments);

    // Update vote limits
    this.updateVoteLimits(categoryId, voteType, userVote !== null);

    return of({
      commentId: commentId,
      upvotes: upvotes,
      downvotes: 0, // Always 0 in ranking system
      voteStats: {
        upVotes: upvotes,
        downVotes: 0, // Always 0 in ranking system
        totalVotes: upvotes,
        score: upvotes, // Score equals upvotes in ranking system
      },
      userVote: userVote,
      netVotes: upvotes // Net votes equals upvotes in ranking system
    });
  }

  rateMockCategory(categoryId: number, score: number): Observable<EvaluationRatingDTO> {
    const newRating: EvaluationRatingDTO = {
      id: `rating-${categoryId}-999`,
      submissionId: "demo-submission-001",
      userId: 999,
      categoryId: categoryId,
      score: score,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Update local ratings
    const currentRatings = this.mockRatingsSubject.value;
    const filteredRatings = currentRatings.filter(r => !(r.categoryId === categoryId && r.userId === 999));
    this.mockRatingsSubject.next([...filteredRatings, newRating]);

    return of(newRating);
  }

  switchMockPhase(targetPhase: EvaluationPhase): Observable<any> {
    const currentSubmission = this.mockSubmissionSubject.value;
    const updatedSubmission = {
      ...currentSubmission,
      phase: targetPhase,
      updatedAt: new Date()
    };

    this.mockSubmissionSubject.next(updatedSubmission);

    return of({
      success: true,
      newPhase: targetPhase,
      message: `Phase erfolgreich zu ${targetPhase} gewechselt`
    });
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private createMockSubmission(): EvaluationSubmissionDTO {
    return {
      id: "demo-submission-001",
      title: "Entwurf \"Stabile Rahmenkonstruktion\"",
      description: "CAD-Entwurf einer tragfähigen Rahmenkonstruktion für industrielle Anwendungen",
      authorId: 1,
      pdfFileId: 1,
      sessionId: 1,
      status: EvaluationStatus.IN_REVIEW,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-01-15T10:00:00Z'),
      createdAt: new Date('2024-01-15T09:30:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),

      author: {
        id: 1,
        firstname: "Student A",
        lastname: "(anonymisiert)",
        email: "anonymized@example.com",
        globalRole: "STUDENT" as any
      },

      pdfFile: {
        id: 1,
        name: "rahmenkonstruktion.pdf",
        uniqueIdentifier: "rahmenkonstruktion.pdf",
        path: "/uploads/demo-rahmenkonstruktion.pdf",
        type: "pdf"
      },

      session: {
        id: 1,
        title: "CAD Konstruktionsaufgabe - Tragwerke",
        description: "Bewertung von CAD-Entwürfen für Rahmenkonstruktionen",
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-25T23:59:59Z'),
        moduleId: 1,
        phase: EvaluationPhase.DISCUSSION,
        isActive: true,
        isAnonymous: true
      },

      pdfMetadata: {
        pageCount: 8,
        fileSize: 2450000,
        downloadUrl: "/assets/demo-rahmenkonstruktion.pdf"
      },

      _count: {
        discussions: 4,
        ratings: 0
      }
    };
  }

  private createMockCommentsMap(): Map<number, EvaluationCommentDTO[]> {
    const commentsMap = new Map<number, EvaluationCommentDTO[]>();

    // Comments for each category
    commentsMap.set(1, this.createVollstaendigkeitComments());
    commentsMap.set(2, this.createGrafischeComments());
    commentsMap.set(3, this.createVergleichbarkeitComments());
    commentsMap.set(4, this.createKomplexitaetComments());

    return commentsMap;
  }

  private createVollstaendigkeitComments(): EvaluationCommentDTO[] {
    return [
      {
        id: "comment-001",
        submissionId: "demo-submission-001",
        categoryId: 1,
        authorId: 2,
        content: "Die Konstruktion wirkt sehr durchdacht. Alle wesentlichen Bauteile sind klar erkennbar und sinnvoll dimensioniert. Besonders die Materialwahl für die Hauptträger überzeugt.",
        createdAt: new Date('2024-01-15T11:30:00Z'),
        updatedAt: new Date('2024-01-15T11:30:00Z'),

        author: {
          id: "anon-2",
          type: "anonymous",
          displayName: "Teilnehmer B",
          colorCode: "#2196F3"
        },

        votes: [
          {
            id: "vote-001",
            commentId: "comment-001",
            userId: 3,
            voteType: "UP",
            createdAt: new Date('2024-01-15T11:45:00Z')
          },
          {
            id: "vote-002",
            commentId: "comment-001",
            userId: 4,
            voteType: "UP",
            createdAt: new Date('2024-01-15T12:00:00Z')
          }
        ],
        voteStats: {
          upVotes: 2,
          downVotes: 0,
          totalVotes: 2,
          score: 2
        },

        replies: [],
        replyCount: 0
      },
      {
        id: "comment-002",
        submissionId: "demo-submission-001",
        categoryId: 1,
        authorId: 3,
        content: "Mir fehlen einige Details bei den Verbindungselementen. Wie sollen die Träger miteinander verbunden werden? Schrauben, Schweißnähte oder andere Verbindungstechniken?",
        createdAt: new Date('2024-01-15T12:15:00Z'),
        updatedAt: new Date('2024-01-15T12:15:00Z'),

        author: {
          id: "anon-3",
          type: "anonymous",
          displayName: "Teilnehmer C",
          colorCode: "#FF9800"
        },

        votes: [
          {
            id: "vote-003",
            commentId: "comment-002",
            userId: 2,
            voteType: "UP",
            createdAt: new Date('2024-01-15T12:30:00Z')
          }
        ],
        voteStats: {
          upVotes: 1,
          downVotes: 0,
          totalVotes: 1,
          score: 1
        },

        replies: [],
        replyCount: 0
      },
      {
        id: "comment-003",
        submissionId: "demo-submission-001",
        categoryId: 1,
        authorId: 4,
        content: "Gute Materialangaben im Titel, aber die Dimensionierung der Träger sollte nochmals überprüft werden. Sind die gewählten Profile für die erwarteten Lasten ausreichend?",
        createdAt: new Date('2024-01-15T13:00:00Z'),
        updatedAt: new Date('2024-01-15T13:00:00Z'),

        author: {
          id: "anon-4",
          type: "anonymous",
          displayName: "Teilnehmer D",
          colorCode: "#9C27B0"
        },

        votes: [],
        voteStats: {
          upVotes: 0,
          downVotes: 0,
          totalVotes: 0,
          score: 0
        },

        replies: [],
        replyCount: 0
      }
    ];
  }

  private createGrafischeComments(): EvaluationCommentDTO[] {
    return [
      {
        id: "comment-004",
        submissionId: "demo-submission-001",
        categoryId: 2,
        authorId: 2,
        content: "Sehr saubere technische Zeichnung! Die Bemaßung ist vollständig und korrekt dargestellt. Linienführung entspricht den Standards.",
        createdAt: new Date('2024-01-15T11:45:00Z'),
        updatedAt: new Date('2024-01-15T11:45:00Z'),

        author: {
          id: "anon-2",
          type: "anonymous",
          displayName: "Teilnehmer B",
          colorCode: "#2196F3"
        },

        votes: [
          {
            id: "vote-004",
            commentId: "comment-004",
            userId: 3,
            voteType: "UP",
            createdAt: new Date('2024-01-15T12:00:00Z')
          }
        ],
        voteStats: {
          upVotes: 1,
          downVotes: 0,
          totalVotes: 1,
          score: 1
        },

        replies: [],
        replyCount: 0
      },
      {
        id: "comment-005",
        submissionId: "demo-submission-001",
        categoryId: 2,
        authorId: 5,
        content: "Die gewählte Perspektive macht es teilweise schwer, alle Details zu erkennen. Zusätzliche Ansichten (Draufsicht, Seitenansicht) wären hilfreich gewesen.",
        createdAt: new Date('2024-01-15T12:30:00Z'),
        updatedAt: new Date('2024-01-15T12:30:00Z'),

        author: {
          id: "anon-5",
          type: "anonymous",
          displayName: "Teilnehmer E",
          colorCode: "#00BCD4"
        },

        votes: [
          {
            id: "vote-005",
            commentId: "comment-005",
            userId: 4,
            voteType: "UP",
            createdAt: new Date('2024-01-15T12:45:00Z')
          }
        ],
        voteStats: {
          upVotes: 1,
          downVotes: 0,
          totalVotes: 1,
          score: 1
        },

        replies: [],
        replyCount: 0
      }
    ];
  }

  private createVergleichbarkeitComments(): EvaluationCommentDTO[] {
    return [
      {
        id: "comment-006",
        submissionId: "demo-submission-001",
        categoryId: 3,
        authorId: 3,
        content: "Standardisierte CAD-Symbole verwendet - das ist gut für Vergleiche mit anderen Entwürfen. Maßstab ist konsistent gewählt.",
        createdAt: new Date('2024-01-15T13:15:00Z'),
        updatedAt: new Date('2024-01-15T13:15:00Z'),

        author: {
          id: "anon-3",
          type: "anonymous",
          displayName: "Teilnehmer C",
          colorCode: "#FF9800"
        },

        votes: [
          {
            id: "vote-006",
            commentId: "comment-006",
            userId: 2,
            voteType: "UP",
            createdAt: new Date('2024-01-15T13:30:00Z')
          },
          {
            id: "vote-007",
            commentId: "comment-006",
            userId: 5,
            voteType: "UP",
            createdAt: new Date('2024-01-15T13:45:00Z')
          }
        ],
        voteStats: {
          upVotes: 2,
          downVotes: 0,
          totalVotes: 2,
          score: 2
        },

        replies: [],
        replyCount: 0
      }
    ];
  }

  private createKomplexitaetComments(): EvaluationCommentDTO[] {
    return [
      {
        id: "comment-007",
        submissionId: "demo-submission-001",
        categoryId: 4,
        authorId: 4,
        content: "Angemessene Komplexität für die Aufgabenstellung. Die Lösung ist nicht übertrieben komplex, aber zeigt trotzdem technisches Verständnis.",
        createdAt: new Date('2024-01-15T14:00:00Z'),
        updatedAt: new Date('2024-01-15T14:00:00Z'),

        author: {
          id: "anon-4",
          type: "anonymous",
          displayName: "Teilnehmer D",
          colorCode: "#9C27B0"
        },

        votes: [],
        voteStats: {
          upVotes: 0,
          downVotes: 0,
          totalVotes: 0,
          score: 0
        },

        replies: [],
        replyCount: 0
      },
      {
        id: "comment-008",
        submissionId: "demo-submission-001",
        categoryId: 4,
        authorId: 5,
        content: "Clevere Vereinfachung bei den Verbindungen. Die Lösung ist praxisgerecht und gut umsetzbar. Könnte aber noch weiter optimiert werden.",
        createdAt: new Date('2024-01-15T14:30:00Z'),
        updatedAt: new Date('2024-01-15T14:30:00Z'),

        author: {
          id: "anon-5",
          type: "anonymous",
          displayName: "Teilnehmer E",
          colorCode: "#00BCD4"
        },

        votes: [
          {
            id: "vote-008",
            commentId: "comment-008",
            userId: 3,
            voteType: "UP",
            createdAt: new Date('2024-01-15T14:45:00Z')
          }
        ],
        voteStats: {
          upVotes: 1,
          downVotes: 0,
          totalVotes: 1,
          score: 1
        },

        replies: [],
        replyCount: 0
      }
    ];
  }

  private createMockVoteLimits(): Map<number, {availableVotes: number}> {
    // Set all categories to full vote limits for comprehensive voting tests
    // Each user gets 3 votes per category (Ranking System)
    return new Map([
      [1, { availableVotes: 3 }], // Vollständigkeit - full limits for testing
      [2, { availableVotes: 3 }], // Grafische Darstellung - full limits for testing
      [3, { availableVotes: 3 }], // Vergleichbarkeit - full limits for testing
      [4, { availableVotes: 3 }]  // Komplexität - full limits for testing
    ]);
  }

  private createMockRatings(): EvaluationRatingDTO[] {
    return [
      // Some existing ratings from other users to show in stats
      {
        id: "rating-001",
        submissionId: "demo-submission-001",
        userId: 2,
        categoryId: 1,
        score: 7,
        createdAt: new Date('2024-01-15T15:00:00Z'),
        updatedAt: new Date('2024-01-15T15:00:00Z')
      },
      {
        id: "rating-002",
        submissionId: "demo-submission-001",
        userId: 3,
        categoryId: 1,
        score: 8,
        createdAt: new Date('2024-01-15T15:15:00Z'),
        updatedAt: new Date('2024-01-15T15:15:00Z')
      },
      {
        id: "rating-003",
        submissionId: "demo-submission-001",
        userId: 2,
        categoryId: 2,
        score: 9,
        createdAt: new Date('2024-01-15T15:30:00Z'),
        updatedAt: new Date('2024-01-15T15:30:00Z')
      }
    ];
  }

  private updateVoteLimits(categoryId: number, voteType: VoteType, isAddingVote: boolean): void {
    if (voteType === null) return;

    const currentLimits = new Map(this.mockVoteLimitsSubject.value);
    const categoryLimits = currentLimits.get(categoryId);

    if (!categoryLimits) return;

    const change = isAddingVote ? -1 : 1;

    // Ranking system: only UP votes affect available votes
    if (voteType === 'UP') {
      categoryLimits.availableVotes = Math.max(0, Math.min(3, categoryLimits.availableVotes + change));
    }

    currentLimits.set(categoryId, categoryLimits);
    this.mockVoteLimitsSubject.next(currentLimits);
  }
}
