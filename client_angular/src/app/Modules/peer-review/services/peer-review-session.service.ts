import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  PeerReviewSessionDTO, 
  CreatePeerReviewSessionDTO, 
  UpdatePeerReviewSessionDTO,
  PeerReviewStatus,
  PeerReviewStatsDTO
} from '../../../../../../shared/dtos';

@Injectable({
  providedIn: 'root'
})
export class PeerReviewSessionService {
  private readonly baseUrl = '/api/peer-review/sessions';

  constructor(private http: HttpClient) {}

  createSession(session: CreatePeerReviewSessionDTO): Observable<PeerReviewSessionDTO> {
    return this.http.post<PeerReviewSessionDTO>(this.baseUrl, session);
  }

  getSession(id: string): Observable<PeerReviewSessionDTO> {
    return this.http.get<PeerReviewSessionDTO>(`${this.baseUrl}/${id}`);
  }

  getSessionsByModule(moduleId: number): Observable<PeerReviewSessionDTO[]> {
    return this.http.get<PeerReviewSessionDTO[]>(`${this.baseUrl}?moduleId=${moduleId}`);
  }

  updateSession(id: string, session: UpdatePeerReviewSessionDTO): Observable<PeerReviewSessionDTO> {
    return this.http.put<PeerReviewSessionDTO>(`${this.baseUrl}/${id}`, session);
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSessionStats(id: string): Observable<PeerReviewStatsDTO> {
    return this.http.get<PeerReviewStatsDTO>(`${this.baseUrl}/${id}/stats`);
  }

  // Helper method to get status display text
  getStatusDisplayText(status: PeerReviewStatus): string {
    switch (status) {
      case PeerReviewStatus.CREATED:
        return 'Erstellt';
      case PeerReviewStatus.SUBMISSION_OPEN:
        return 'Einreichungen offen';
      case PeerReviewStatus.SUBMISSION_CLOSED:
        return 'Einreichungen geschlossen';
      case PeerReviewStatus.REVIEW_OPEN:
        return 'Bewertungen offen';
      case PeerReviewStatus.REVIEW_CLOSED:
        return 'Bewertungen geschlossen';
      case PeerReviewStatus.DISCUSSION_OPEN:
        return 'Diskussionen offen';
      case PeerReviewStatus.DISCUSSION_CLOSED:
        return 'Diskussionen geschlossen';
      case PeerReviewStatus.COMPLETED:
        return 'Abgeschlossen';
      default:
        return 'Unbekannt';
    }
  }

  // Helper method to get status color
  getStatusColor(status: PeerReviewStatus): string {
    switch (status) {
      case PeerReviewStatus.CREATED:
        return 'primary';
      case PeerReviewStatus.SUBMISSION_OPEN:
        return 'accent';
      case PeerReviewStatus.SUBMISSION_CLOSED:
        return 'warn';
      case PeerReviewStatus.REVIEW_OPEN:
        return 'accent';
      case PeerReviewStatus.REVIEW_CLOSED:
        return 'warn';
      case PeerReviewStatus.DISCUSSION_OPEN:
        return 'accent';
      case PeerReviewStatus.DISCUSSION_CLOSED:
        return 'warn';
      case PeerReviewStatus.COMPLETED:
        return 'primary';
      default:
        return 'basic';
    }
  }

  // Helper method to check if user can perform actions
  canUserSubmit(status: PeerReviewStatus): boolean {
    return status === PeerReviewStatus.SUBMISSION_OPEN;
  }

  canUserReview(status: PeerReviewStatus): boolean {
    return status === PeerReviewStatus.REVIEW_OPEN;
  }

  canUserDiscuss(status: PeerReviewStatus): boolean {
    return status === PeerReviewStatus.DISCUSSION_OPEN;
  }
}