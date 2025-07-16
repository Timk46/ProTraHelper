import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  PeerReviewDTO, 
  CreatePeerReviewDTO, 
  UpdatePeerReviewDTO,
  PeerReviewDashboardDTO
} from '../../../../../../shared/dtos';

@Injectable({
  providedIn: 'root'
})
export class PeerReviewService {
  private readonly baseUrl = '/api/peer-review';

  constructor(private http: HttpClient) {}

  // Review operations
  createReview(review: CreatePeerReviewDTO): Observable<PeerReviewDTO> {
    return this.http.post<PeerReviewDTO>(`${this.baseUrl}/reviews`, review);
  }

  getReview(id: string): Observable<PeerReviewDTO> {
    return this.http.get<PeerReviewDTO>(`${this.baseUrl}/reviews/${id}`);
  }

  getReviewsBySession(sessionId: string): Observable<PeerReviewDTO[]> {
    return this.http.get<PeerReviewDTO[]>(`${this.baseUrl}/reviews?sessionId=${sessionId}`);
  }

  getReviewsBySubmission(submissionId: string): Observable<PeerReviewDTO[]> {
    return this.http.get<PeerReviewDTO[]>(`${this.baseUrl}/reviews?submissionId=${submissionId}`);
  }

  getUserReviews(): Observable<PeerReviewDTO[]> {
    return this.http.get<PeerReviewDTO[]>(`${this.baseUrl}/reviews?myReviews=true`);
  }

  updateReview(id: string, review: UpdatePeerReviewDTO): Observable<PeerReviewDTO> {
    return this.http.put<PeerReviewDTO>(`${this.baseUrl}/reviews/${id}`, review);
  }

  deleteReview(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/reviews/${id}`);
  }

  // Dashboard operations
  getDashboard(): Observable<PeerReviewDashboardDTO> {
    return this.http.get<PeerReviewDashboardDTO>(`${this.baseUrl}/dashboard`);
  }

  // Helper methods
  getRatingStars(rating: number): string[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push('star');
      } else if (i - 0.5 <= rating) {
        stars.push('star_half');
      } else {
        stars.push('star_border');
      }
    }
    return stars;
  }

  getRatingColor(rating: number): string {
    if (rating >= 4) {
      return 'primary';
    } else if (rating >= 3) {
      return 'accent';
    } else {
      return 'warn';
    }
  }

  getReviewStatusText(review: PeerReviewDTO): string {
    if (review.isComplete) {
      return 'Abgeschlossen';
    } else if (review.rating || review.comment) {
      return 'Entwurf';
    } else {
      return 'Offen';
    }
  }

  getReviewStatusColor(review: PeerReviewDTO): string {
    if (review.isComplete) {
      return 'primary';
    } else if (review.rating || review.comment) {
      return 'accent';
    } else {
      return 'warn';
    }
  }

  // Check if review has content
  hasReviewContent(review: PeerReviewDTO): boolean {
    return !!(review.rating || (review.comment && review.comment.trim().length > 0));
  }

  // Format review summary
  getReviewSummary(review: PeerReviewDTO): string {
    if (!this.hasReviewContent(review)) {
      return 'Keine Bewertung';
    }

    const parts = [];
    if (review.rating) {
      parts.push(`${review.rating}/5 Sterne`);
    }
    if (review.comment && review.comment.trim().length > 0) {
      const commentPreview = review.comment.length > 50 
        ? review.comment.substring(0, 50) + '...'
        : review.comment;
      parts.push(`"${commentPreview}"`);
    }

    return parts.join(' - ');
  }
}