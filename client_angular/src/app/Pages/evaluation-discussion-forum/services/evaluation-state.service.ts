import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';

import {
  EvaluationSubmissionDTO,
  EvaluationCategoryDTO,
  EvaluationDiscussionDTO,
  EvaluationCommentDTO,
  CommentStatsDTO,
  AnonymousEvaluationUserDTO,
  EvaluationPhase,
  VoteUpdateData,
  EvaluationRatingDTO,
  RatingStatsDTO
} from '@dtos';

import { EvaluationDiscussionService } from './evaluation-discussion.service';

@Injectable({
  providedIn: 'root'
})
export class EvaluationStateService {
  
  // Core state subjects
  private submissionSubject = new BehaviorSubject<EvaluationSubmissionDTO | null>(null);
  private categoriesSubject = new BehaviorSubject<EvaluationCategoryDTO[]>([]);
  private activeCategorySubject = new BehaviorSubject<string>('vollstaendigkeit');
  private commentStatsSubject = new BehaviorSubject<CommentStatsDTO | null>(null);
  private anonymousUserSubject = new BehaviorSubject<AnonymousEvaluationUserDTO | null>(null);
  
  // Discussion state by category (caching)
  private discussionCache = new Map<string, BehaviorSubject<EvaluationDiscussionDTO[]>>();
  
  // Rating state
  private ratingsSubject = new BehaviorSubject<EvaluationRatingDTO[]>([]);
  private ratingStatsCache = new Map<string, BehaviorSubject<RatingStatsDTO>>();
  
  // UI state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  
  constructor(private evaluationService: EvaluationDiscussionService) {}

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  get submission$(): Observable<EvaluationSubmissionDTO | null> {
    return this.submissionSubject.asObservable();
  }

  get categories$(): Observable<EvaluationCategoryDTO[]> {
    return this.categoriesSubject.asObservable();
  }

  get activeCategory$(): Observable<string> {
    return this.activeCategorySubject.asObservable();
  }

  get commentStats$(): Observable<CommentStatsDTO | null> {
    return this.commentStatsSubject.asObservable();
  }

  get anonymousUser$(): Observable<AnonymousEvaluationUserDTO | null> {
    return this.anonymousUserSubject.asObservable();
  }

  get loading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  get error$(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  // =============================================================================
  // SUBMISSION MANAGEMENT
  // =============================================================================

  loadSubmission(submissionId: string): void {
    this.setLoading(true);
    this.clearError();

    this.evaluationService.getSubmission(submissionId).subscribe({
      next: (submission) => {
        this.submissionSubject.next(submission);
        this.loadCommentStats(submissionId);
        this.loadAnonymousUser(submissionId);
        this.setLoading(false);
      },
      error: (error) => {
        this.setError('Fehler beim Laden der Abgabe');
        this.setLoading(false);
      }
    });
  }

  // =============================================================================
  // CATEGORY MANAGEMENT
  // =============================================================================

  loadCategories(): void {
    this.evaluationService.getCategories().subscribe({
      next: (categories) => {
        this.categoriesSubject.next(categories);
      },
      error: (error) => {
        this.setError('Fehler beim Laden der Kategorien');
      }
    });
  }

  setActiveCategory(categoryId: string): void {
    const currentCategory = this.activeCategorySubject.value;
    if (currentCategory !== categoryId) {
      this.activeCategorySubject.next(categoryId);
    }
  }

  get activeCategoryInfo$(): Observable<EvaluationCategoryDTO | null> {
    return combineLatest([
      this.categories$,
      this.activeCategory$
    ]).pipe(
      map(([categories, activeId]) => 
        categories.find(cat => cat.id === activeId) || null
      ),
      distinctUntilChanged()
    );
  }

  // =============================================================================
  // DISCUSSION MANAGEMENT
  // =============================================================================

  getDiscussionsForCategory(submissionId: string, categoryId: string): Observable<EvaluationDiscussionDTO[]> {
    const cacheKey = `${submissionId}-${categoryId}`;
    
    if (!this.discussionCache.has(cacheKey)) {
      const subject = new BehaviorSubject<EvaluationDiscussionDTO[]>([]);
      this.discussionCache.set(cacheKey, subject);
      
      // Initial load
      this.loadDiscussionsForCategory(submissionId, categoryId);
    }
    
    return this.discussionCache.get(cacheKey)!.asObservable();
  }

  private loadDiscussionsForCategory(submissionId: string, categoryId: string): void {
    const cacheKey = `${submissionId}-${categoryId}`;
    
    this.evaluationService.getDiscussionsByCategory(submissionId, categoryId).subscribe({
      next: (discussions) => {
        const subject = this.discussionCache.get(cacheKey);
        if (subject) {
          subject.next(discussions);
        }
      },
      error: (error) => {
        this.setError('Fehler beim Laden der Diskussionen');
      }
    });
  }

  get activeDiscussions$(): Observable<EvaluationDiscussionDTO[]> {
    return combineLatest([
      this.submission$,
      this.activeCategory$
    ]).pipe(
      map(([submission, categoryId]) => {
        if (!submission) return [];
        return this.getDiscussionsForCategory(submission.id, categoryId);
      }),
      switchMap(discussions$ => discussions$),
      shareReplay(1)
    );
  }

  // =============================================================================
  // COMMENT MANAGEMENT
  // =============================================================================

  addComment(submissionId: string, categoryId: string, content: string): Observable<EvaluationCommentDTO> {
    const anonymousUser = this.anonymousUserSubject.value;
    
    const createCommentDto = {
      submissionId,
      categoryId,
      content,
      anonymousUserId: anonymousUser?.id.toString()
    };

    return this.evaluationService.createComment(createCommentDto).pipe(
      map(comment => {
        // Update local cache
        this.handleCommentAdded(submissionId, categoryId, comment);
        this.refreshCommentStats(submissionId);
        return comment;
      })
    );
  }

  private handleCommentAdded(submissionId: string, categoryId: string, comment: EvaluationCommentDTO): void {
    const cacheKey = `${submissionId}-${categoryId}`;
    const subject = this.discussionCache.get(cacheKey);
    
    if (subject) {
      const currentDiscussions = subject.value;
      const updatedDiscussions = [...currentDiscussions];
      
      // Find or create discussion
      let discussion = updatedDiscussions.find(d => d.categoryId === categoryId);
      if (!discussion) {
        discussion = {
          id: `discussion-${submissionId}-${categoryId}`,
          submissionId,
          categoryId,
          comments: [],
          createdAt: new Date(),
          totalComments: 0,
          availableComments: 3,
          usedComments: 0
        };
        updatedDiscussions.push(discussion);
      }
      
      // Add comment
      discussion.comments = [comment, ...discussion.comments];
      discussion.totalComments = discussion.comments.length;
      discussion.usedComments = discussion.comments.length;
      
      subject.next(updatedDiscussions);
    }
  }

  // =============================================================================
  // VOTING MANAGEMENT
  // =============================================================================

  voteComment(commentId: string, voteType: 'UP' | 'DOWN' | null): Observable<any> {
    return this.evaluationService.voteComment(commentId, voteType).pipe(
      map(result => {
        this.handleVoteUpdate(commentId, {
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          userVote: result.userVote,
          netVotes: result.netVotes
        });
        return result;
      })
    );
  }

  private handleVoteUpdate(commentId: string, voteData: VoteUpdateData): void {
    // Update all cached discussions
    this.discussionCache.forEach((subject, key) => {
      const discussions = subject.value;
      let updated = false;
      
      const updatedDiscussions = discussions.map(discussion => ({
        ...discussion,
        comments: discussion.comments.map(comment => {
          if (comment.id === commentId) {
            updated = true;
            return {
              ...comment,
              upvotes: voteData.upvotes,
              downvotes: voteData.downvotes,
              userVote: voteData.userVote
            };
          }
          return comment;
        })
      }));
      
      if (updated) {
        subject.next(updatedDiscussions);
      }
    });
  }

  // =============================================================================
  // RATING MANAGEMENT
  // =============================================================================

  getRatingStats(submissionId: string, categoryId: string): Observable<RatingStatsDTO> {
    const cacheKey = `${submissionId}-${categoryId}`;
    
    if (!this.ratingStatsCache.has(cacheKey)) {
      const subject = new BehaviorSubject<RatingStatsDTO>({
        submissionId,
        categoryId,
        averageScore: 0,
        totalRatings: 0,
        scoreDistribution: [],
        userHasRated: false
      });
      this.ratingStatsCache.set(cacheKey, subject);
      
      // Load initial data
      this.loadRatingStats(submissionId, categoryId);
    }
    
    return this.ratingStatsCache.get(cacheKey)!.asObservable();
  }

  private loadRatingStats(submissionId: string, categoryId: string): void {
    const cacheKey = `${submissionId}-${categoryId}`;
    
    this.evaluationService.getRatingStats(submissionId, categoryId).subscribe({
      next: (stats) => {
        const subject = this.ratingStatsCache.get(cacheKey);
        if (subject) {
          subject.next(stats);
        }
      },
      error: (error) => {
        this.setError('Fehler beim Laden der Bewertungsstatistiken');
      }
    });
  }

  submitRating(submissionId: string, categoryId: string, score: number): Observable<EvaluationRatingDTO> {
    const createRatingDto = {
      submissionId,
      categoryId,
      score
    };

    return this.evaluationService.createRating(createRatingDto).pipe(
      map(rating => {
        // Update local cache
        this.refreshRatingStats(submissionId, categoryId);
        return rating;
      })
    );
  }

  private refreshRatingStats(submissionId: string, categoryId: string): void {
    this.loadRatingStats(submissionId, categoryId);
  }

  // =============================================================================
  // PHASE MANAGEMENT
  // =============================================================================

  get currentPhase$(): Observable<EvaluationPhase | null> {
    return this.submission$.pipe(
      map(submission => submission?.phase || null),
      distinctUntilChanged()
    );
  }

  switchPhase(submissionId: string, targetPhase: EvaluationPhase): Observable<any> {
    const request = {
      submissionId,
      targetPhase
    };

    return this.evaluationService.switchPhase(request).pipe(
      map(response => {
        // Update submission state
        const currentSubmission = this.submissionSubject.value;
        if (currentSubmission) {
          this.submissionSubject.next({
            ...currentSubmission,
            phase: targetPhase
          });
        }
        return response;
      })
    );
  }

  // =============================================================================
  // STATISTICS AND AGGREGATION
  // =============================================================================

  private loadCommentStats(submissionId: string): void {
    this.evaluationService.getCommentStats(submissionId).subscribe({
      next: (stats) => {
        this.commentStatsSubject.next(stats);
      },
      error: (error) => {
        this.setError('Fehler beim Laden der Kommentarstatistiken');
      }
    });
  }

  private refreshCommentStats(submissionId: string): void {
    this.loadCommentStats(submissionId);
  }

  get commentStatsForActiveCategory$(): Observable<any> {
    return combineLatest([
      this.commentStats$,
      this.activeCategory$
    ]).pipe(
      map(([stats, categoryId]) => {
        if (!stats) return null;
        return stats.categories.find(cat => cat.categoryId === categoryId) || null;
      }),
      distinctUntilChanged()
    );
  }

  // =============================================================================
  // ANONYMOUS USER MANAGEMENT
  // =============================================================================

  private loadAnonymousUser(submissionId: string): void {
    this.evaluationService.getOrCreateAnonymousUser(submissionId).subscribe({
      next: (user) => {
        this.anonymousUserSubject.next(user);
      },
      error: (error) => {
        this.setError('Fehler beim Laden des anonymen Benutzers');
      }
    });
  }

  // =============================================================================
  // UI STATE MANAGEMENT
  // =============================================================================

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private setError(error: string): void {
    this.errorSubject.next(error);
  }

  private clearError(): void {
    this.errorSubject.next(null);
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  clearCache(): void {
    this.discussionCache.clear();
    this.ratingStatsCache.clear();
  }

  refreshAll(submissionId: string): void {
    this.loadSubmission(submissionId);
    this.loadCategories();
    this.clearCache();
  }

  // =============================================================================
  // REAL-TIME UPDATES
  // =============================================================================

  handleRealtimeUpdate(update: any): void {
    switch (update.type) {
      case 'comment-added':
        this.handleCommentAdded(update.submissionId, update.categoryId, update.comment);
        this.refreshCommentStats(update.submissionId);
        break;
      case 'vote-changed':
        this.handleVoteUpdate(update.commentId, update.voteData);
        break;
      case 'phase-switched':
        this.loadSubmission(update.submissionId);
        break;
      case 'rating-submitted':
        this.refreshRatingStats(update.submissionId, update.categoryId);
        break;
    }
  }
}

// Re-export switchMap for the activeDiscussions$ observable
import { switchMap } from 'rxjs/operators';