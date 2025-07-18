import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';

// Import all evaluation DTOs
import {
  EvaluationSubmissionDTO,
  EvaluationStatus,
  EvaluationPhase,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  CreateCommentDTO,
  VoteType,
  VoteResultDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  CreateAnonymousUserDTO,
  EvaluationRatingDTO,
  CreateRatingDTO,
  RatingStatsDTO,
  PhaseSwitchRequestDTO,
  PhaseSwitchResponseDTO,
  EVALUATION_CATEGORIES,
  DEFAULT_ANONYMOUS_CONFIG
} from '@dtos';

@Injectable({
  providedIn: 'root'
})
export class EvaluationDiscussionService {
  private apiUrl = '/api/evaluation-discussion';
  
  // Mock data storage
  private mockSubmissions: EvaluationSubmissionDTO[] = [];
  private mockCategories: EvaluationCategoryDTO[] = [];
  private mockDiscussions: EvaluationDiscussionDTO[] = [];
  private mockComments: EvaluationCommentDTO[] = [];
  private mockAnonymousUsers: AnonymousEvaluationUserDTO[] = [];
  private mockRatings: EvaluationRatingDTO[] = [];
  
  // State subjects for real-time updates
  private commentsSubject = new BehaviorSubject<EvaluationCommentDTO[]>([]);
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);
  
  constructor(private http: HttpClient) {
    this.initializeMockData();
  }

  // =============================================================================
  // CORE API METHODS
  // =============================================================================

  getSubmission(submissionId: string): Observable<EvaluationSubmissionDTO> {
    return of(this.mockSubmissions.find(s => s.id === submissionId)!).pipe(
      delay(300), // Simulate network delay
      tap(submission => {
        if (!submission) {
          throw new Error(`Submission with ID ${submissionId} not found`);
        }
      })
    );
  }

  getCategories(): Observable<EvaluationCategoryDTO[]> {
    return of(this.mockCategories).pipe(
      delay(200)
    );
  }

  getDiscussionsByCategory(
    submissionId: string, 
    categoryId: string
  ): Observable<EvaluationDiscussionDTO[]> {
    const discussions = this.mockDiscussions.filter(
      d => d.submissionId === submissionId && d.categoryId === categoryId
    );
    
    return of(discussions).pipe(
      delay(250),
      map(discussions => discussions.map(discussion => ({
        ...discussion,
        comments: this.mockComments.filter(c => c.discussionId === discussion.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })))
    );
  }

  createComment(comment: CreateCommentDTO): Observable<EvaluationCommentDTO> {
    const newComment: EvaluationCommentDTO = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      discussionId: `discussion-${comment.submissionId}-${comment.categoryId}`,
      categoryId: comment.categoryId,
      author: {
        id: comment.anonymousUserId || 'user-1',
        type: comment.anonymousUserId ? 'anonymous' : 'user',
        displayName: comment.anonymousUserId ? 'Teilnehmer 1' : 'Max Mustermann',
        colorCode: comment.anonymousUserId ? '#2196F3' : undefined
      },
      content: comment.content,
      createdAt: new Date(),
      updatedAt: new Date(),
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      replyCount: 0,
      parentId: comment.parentId
    };

    this.mockComments.push(newComment);
    this.commentsSubject.next(this.mockComments);
    
    return of(newComment).pipe(
      delay(400)
    );
  }

  voteComment(commentId: string, vote: VoteType): Observable<VoteResultDTO> {
    const comment = this.mockComments.find(c => c.id === commentId);
    if (!comment) {
      return throwError('Comment not found');
    }

    // Simulate vote logic
    const previousVote = comment.userVote;
    
    if (previousVote === vote) {
      // Remove vote
      comment.userVote = null;
      if (vote === 'UP') comment.upvotes--;
      if (vote === 'DOWN') comment.downvotes--;
    } else {
      // Change or add vote
      comment.userVote = vote;
      
      if (previousVote === 'UP') comment.upvotes--;
      if (previousVote === 'DOWN') comment.downvotes--;
      
      if (vote === 'UP') comment.upvotes++;
      if (vote === 'DOWN') comment.downvotes++;
    }

    const result: VoteResultDTO = {
      commentId,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      userVote: comment.userVote,
      netVotes: comment.upvotes - comment.downvotes
    };

    return of(result).pipe(
      delay(200)
    );
  }

  getCommentStats(submissionId: string): Observable<CommentStatsDTO> {
    const stats: CommentStatsDTO = {
      submissionId,
      totalAvailable: 12,
      totalUsed: 8,
      categories: Object.values(EVALUATION_CATEGORIES).map(cat => ({
        categoryId: cat.id,
        categoryName: cat.displayName,
        availableComments: 3,
        usedComments: Math.floor(Math.random() * 4), // 0-3 random usage
        isLimitReached: Math.random() > 0.7,
        indicatorColor: Math.random() > 0.5 ? 'success' : 'warn',
        availabilityText: `${Math.floor(Math.random() * 3 + 1)}/3 verfügbar`,
        availabilityIcon: Math.random() > 0.5 ? 'add' : 'remove'
      })),
      overallProgress: 67,
      averageUsage: 2.0,
      userLimits: {
        userId: 1,
        totalLimit: 12,
        totalUsed: 8,
        canComment: true
      }
    };

    return of(stats).pipe(
      delay(300)
    );
  }

  // =============================================================================
  // ANONYMOUS USER MANAGEMENT
  // =============================================================================

  getOrCreateAnonymousUser(submissionId: string): Observable<AnonymousEvaluationUserDTO> {
    let existingUser = this.mockAnonymousUsers.find(u => u.submissionId === submissionId);
    
    if (!existingUser) {
      existingUser = {
        id: this.mockAnonymousUsers.length + 1,
        userId: 1, // Current user
        submissionId,
        displayName: this.generateAnonymousDisplayName(),
        colorCode: this.generateRandomColor(),
        createdAt: new Date()
      };
      this.mockAnonymousUsers.push(existingUser);
    }

    return of(existingUser).pipe(
      delay(200)
    );
  }

  // =============================================================================
  // RATING SYSTEM
  // =============================================================================

  createRating(rating: CreateRatingDTO): Observable<EvaluationRatingDTO> {
    const newRating: EvaluationRatingDTO = {
      id: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submissionId: rating.submissionId,
      userId: 1, // Current user
      categoryId: rating.categoryId,
      score: rating.score,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Remove existing rating for this user/category
    this.mockRatings = this.mockRatings.filter(
      r => !(r.userId === 1 && r.categoryId === rating.categoryId && r.submissionId === rating.submissionId)
    );
    
    this.mockRatings.push(newRating);
    this.ratingsSubject.next(this.mockRatings);
    
    return of(newRating).pipe(
      delay(400)
    );
  }

  getRatingStats(submissionId: string, categoryId: string): Observable<RatingStatsDTO> {
    const categoryRatings = this.mockRatings.filter(
      r => r.submissionId === submissionId && r.categoryId === categoryId
    );
    
    const userRating = categoryRatings.find(r => r.userId === 1);
    const averageScore = categoryRatings.length > 0 
      ? categoryRatings.reduce((sum, r) => sum + r.score, 0) / categoryRatings.length
      : 0;

    const stats: RatingStatsDTO = {
      submissionId,
      categoryId,
      averageScore,
      totalRatings: categoryRatings.length,
      scoreDistribution: this.generateScoreDistribution(categoryRatings),
      userRating: userRating?.score,
      userHasRated: !!userRating
    };

    return of(stats).pipe(
      delay(300)
    );
  }

  // =============================================================================
  // PHASE MANAGEMENT
  // =============================================================================

  switchPhase(request: PhaseSwitchRequestDTO): Observable<PhaseSwitchResponseDTO> {
    const submission = this.mockSubmissions.find(s => s.id === request.submissionId);
    if (!submission) {
      return throwError('Submission not found');
    }

    const previousPhase = submission.phase;
    submission.phase = request.targetPhase;

    const response: PhaseSwitchResponseDTO = {
      submissionId: request.submissionId,
      previousPhase,
      currentPhase: request.targetPhase,
      switchedAt: new Date(),
      canSwitch: true,
      restrictions: {
        discussionPhase: {
          canComment: request.targetPhase === EvaluationPhase.DISCUSSION,
          canVote: request.targetPhase === EvaluationPhase.DISCUSSION,
          canViewComments: true
        },
        evaluationPhase: {
          canRate: request.targetPhase === EvaluationPhase.EVALUATION,
          canFinalizeRating: request.targetPhase === EvaluationPhase.EVALUATION,
          canViewRatings: request.targetPhase === EvaluationPhase.EVALUATION
        }
      }
    };

    return of(response).pipe(
      delay(300)
    );
  }

  // =============================================================================
  // REAL-TIME UPDATES SIMULATION
  // =============================================================================

  subscribeToDiscussionUpdates(submissionId: string): Observable<any> {
    // Simulate real-time updates
    return this.commentsSubject.asObservable().pipe(
      map(comments => ({
        type: 'comment-added',
        submissionId,
        comments: comments.filter(c => c.discussionId.includes(submissionId))
      }))
    );
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private initializeMockData(): void {
    this.initializeMockSubmissions();
    this.initializeMockCategories();
    this.initializeMockDiscussions();
    this.initializeMockComments();
  }

  private initializeMockSubmissions(): void {
    this.mockSubmissions = [
      {
        id: 'submission-1',
        title: 'Architektur-Entwurf Hochhaus',
        authorId: 2,
        pdfFileId: 1,
        moduleId: 1,
        status: EvaluationStatus.DISCUSSION,
        phase: EvaluationPhase.DISCUSSION,
        submittedAt: new Date('2024-01-15'),
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        author: {
          id: 2,
          firstname: 'Anna',
          lastname: 'Schmidt',
          email: 'anna.schmidt@example.com',
          role: 'STUDENT'
        },
        pdfMetadata: {
          pageCount: 4,
          fileSize: 2048000,
          downloadUrl: '/api/files/download/hochhaus-entwurf.pdf'
        }
      }
    ];
  }

  private initializeMockCategories(): void {
    this.mockCategories = Object.values(EVALUATION_CATEGORIES);
  }

  private initializeMockDiscussions(): void {
    this.mockDiscussions = Object.values(EVALUATION_CATEGORIES).map(category => ({
      id: `discussion-submission-1-${category.id}`,
      submissionId: 'submission-1',
      categoryId: category.id,
      comments: [],
      createdAt: new Date(),
      totalComments: 0,
      availableComments: 3,
      usedComments: 0
    }));
  }

  private initializeMockComments(): void {
    // Add some sample comments for each category
    const sampleComments = [
      {
        categoryId: 'vollstaendigkeit',
        content: 'Die Grundrisse sind sehr detailliert ausgearbeitet. Besonders die Konstruktionsdetails sind gut durchdacht.',
        author: 'Teilnehmer 1',
        upvotes: 5,
        downvotes: 1
      },
      {
        categoryId: 'vollstaendigkeit',
        content: 'Es fehlen noch die Sanitäranlagen in den Obergeschossen. Dies sollte ergänzt werden.',
        author: 'Teilnehmer 2',
        upvotes: 3,
        downvotes: 0
      },
      {
        categoryId: 'grafische_darstellung',
        content: 'Die Zeichnungen sind sehr sauber und professionell erstellt. Gute Linienstärken und Beschriftung.',
        author: 'Teilnehmer 3',
        upvotes: 7,
        downvotes: 0
      },
      {
        categoryId: 'vergleichbarkeit',
        content: 'Im Vergleich zu anderen Entwürfen ist dieser besonders innovativ in der Fassadengestaltung.',
        author: 'Teilnehmer 1',
        upvotes: 4,
        downvotes: 2
      },
      {
        categoryId: 'komplexitaet',
        content: 'Die statischen Berechnungen sind angemessen komplex und gut dokumentiert.',
        author: 'Teilnehmer 4',
        upvotes: 6,
        downvotes: 1
      }
    ];

    this.mockComments = sampleComments.map((comment, index) => ({
      id: `comment-${index + 1}`,
      discussionId: `discussion-submission-1-${comment.categoryId}`,
      categoryId: comment.categoryId,
      author: {
        id: `anonymous-${index + 1}`,
        type: 'anonymous' as const,
        displayName: comment.author,
        colorCode: DEFAULT_ANONYMOUS_CONFIG.colors[index % DEFAULT_ANONYMOUS_CONFIG.colors.length]
      },
      content: comment.content,
      createdAt: new Date(Date.now() - (index * 3600000)), // Spread over hours
      updatedAt: new Date(Date.now() - (index * 3600000)),
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      userVote: null,
      replyCount: 0,
      parentId: undefined
    }));
  }

  private generateAnonymousDisplayName(): string {
    const prefixes = DEFAULT_ANONYMOUS_CONFIG.namePrefixes;
    const randomIndex = Math.floor(Math.random() * prefixes.length);
    const number = this.mockAnonymousUsers.length + 1;
    return `${prefixes[randomIndex]} ${number}`;
  }

  private generateRandomColor(): string {
    const colors = DEFAULT_ANONYMOUS_CONFIG.colors;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private generateScoreDistribution(ratings: EvaluationRatingDTO[]): { score: number; count: number; }[] {
    const distribution: { score: number; count: number; }[] = [];
    
    for (let score = 0; score <= 10; score++) {
      const count = ratings.filter(r => r.score === score).length;
      distribution.push({ score, count });
    }
    
    return distribution;
  }
}