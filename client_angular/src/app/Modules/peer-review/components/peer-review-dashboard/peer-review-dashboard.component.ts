import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PeerReviewService } from '../../services/peer-review.service';
import { PeerSubmissionService } from '../../services/peer-submission.service';
import { PeerReviewSessionService } from '../../services/peer-review-session.service';
import {
  PeerReviewDashboardDTO,
  PeerReviewDTO,
  CreatePeerReviewDTO,
  UpdatePeerReviewDTO,
  PeerSubmissionDTO,
  CreatePeerSubmissionDTO,
  PeerReviewSessionDTO,
  CreatePeerReviewSessionDTO,
  PeerReviewStatus,
} from '../../../../../../../shared/dtos';

@Component({
  selector: 'app-peer-review-dashboard',
  templateUrl: './peer-review-dashboard.component.html',
  styleUrls: ['./peer-review-dashboard.component.scss'],
})
export class PeerReviewDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Loading states
  loading$ = new BehaviorSubject<boolean>(true);
  actionLoading$ = new BehaviorSubject<boolean>(false);

  // Dashboard data
  dashboardData$: Observable<PeerReviewDashboardDTO> | undefined;

  // Mock data for testing
  mockDashboardData: PeerReviewDashboardDTO = {
    activeSessions: [
      {
        id: 'session-1',
        title: 'Architektur Entwurf Semester 1',
        description: 'Peer Review für Architektur-Entwürfe',
        moduleId: 1,
        createdById: 1,
        submissionDeadline: new Date('2025-01-20'),
        reviewDeadline: new Date('2025-01-25'),
        discussionDeadline: new Date('2025-01-30'),
        status: PeerReviewStatus.SUBMISSION_OPEN,
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15'),
        submissionCount: 8,
        completedReviewCount: 3,
        totalReviewCount: 15,
      },
      {
        id: 'session-2',
        title: 'Konstruktionsdetails Workshop',
        description: 'Bewertung von Konstruktionsdetails',
        moduleId: 1,
        createdById: 1,
        submissionDeadline: new Date('2025-01-18'),
        reviewDeadline: new Date('2025-01-28'),
        discussionDeadline: new Date('2025-02-02'),
        status: PeerReviewStatus.REVIEW_OPEN,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-18'),
        submissionCount: 12,
        completedReviewCount: 8,
        totalReviewCount: 24,
      },
    ],
    mySubmissions: [
      {
        id: 'submission-1',
        sessionId: 'session-1',
        fileUploadId: 1,
        title: 'Wohnhaus Entwurf - Grundriss',
        description: 'Entwurf eines Einfamilienhauses mit Fokus auf nachhaltiges Bauen',
        submittedAt: new Date('2025-01-16'),
        averageRating: 4.2,
        reviewCount: 3,
        isOwnSubmission: true,
        userHasReviewed: false,
      },
      {
        id: 'submission-2',
        sessionId: 'session-2',
        fileUploadId: 2,
        title: 'Dachdetail Holzkonstruktion',
        description: 'Konstruktionsdetail für Holzdach mit Wärmedämmung',
        submittedAt: new Date('2025-01-17'),
        averageRating: 3.8,
        reviewCount: 2,
        isOwnSubmission: true,
        userHasReviewed: false,
      },
    ],
    assignedReviews: [
      {
        id: 'review-1',
        sessionId: 'session-1',
        submissionId: 'submission-3',
        reviewerId: 1,
        anonymousReviewerId: 1,
        rating: undefined,
        comment: '',
        isComplete: false,
        completedAt: undefined,
        createdAt: new Date('2025-01-16'),
        updatedAt: new Date('2025-01-16'),
        session: {
          id: 'session-1',
          title: 'Architektur Entwurf Semester 1',
          status: 'REVIEW_OPEN',
        },
        submission: {
          id: 'submission-3',
          title: 'Bürogebäude Konzept',
          description: 'Entwurf eines nachhaltigen Bürogebäudes',
          fileUpload: {
            file: {
              id: 3,
              name: 'buerogebaeude-entwurf.pdf',
              path: '/uploads/buerogebaeude-entwurf.pdf',
              type: 'pdf',
              uniqueIdentifier: 'file-3',
            },
          },
        },
        isOwnReview: true,
        canEdit: true,
      },
    ],
    completedReviews: [
      {
        id: 'review-2',
        sessionId: 'session-2',
        submissionId: 'submission-4',
        reviewerId: 1,
        anonymousReviewerId: 1,
        rating: 4,
        comment: 'Sehr gute Lösung für die Wärmedämmung. Die Details sind gut durchdacht.',
        isComplete: true,
        completedAt: new Date('2025-01-18'),
        createdAt: new Date('2025-01-17'),
        updatedAt: new Date('2025-01-18'),
        session: {
          id: 'session-2',
          title: 'Konstruktionsdetails Workshop',
          status: 'REVIEW_OPEN',
        },
        submission: {
          id: 'submission-4',
          title: 'Fassadendetail Glas',
          description: 'Glasfassade mit Sonnenschutz',
          fileUpload: {
            file: {
              id: 4,
              name: 'fassadendetail-glas.pdf',
              path: '/uploads/fassadendetail-glas.pdf',
              type: 'pdf',
              uniqueIdentifier: 'file-4',
            },
          },
        },
        isOwnReview: true,
        canEdit: false,
      },
    ],
    stats: {
      totalReviewsCompleted: 1,
      totalReviewsAssigned: 2,
      averageRatingReceived: 4.0,
      averageRatingGiven: 4.0,
      pendingReviews: 1,
      overdueReviews: 0,
      newDiscussions: 0,
    },
  };

  // Current selected tab
  selectedTabIndex = 0;

  constructor(
    private peerReviewService: PeerReviewService,
    private submissionService: PeerSubmissionService,
    private sessionService: PeerReviewSessionService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.loading$.next(true);

    // For now, use mock data for testing
    // In production, uncomment the following line:
    // this.dashboardData$ = this.peerReviewService.getDashboard()

    // Mock data simulation
    setTimeout(() => {
      this.loading$.next(false);
    }, 1000);
  }

  refreshDashboard(): void {
    this.loadDashboard();
    this.snackBar.open('Dashboard aktualisiert', 'Schließen', {
      duration: 2000,
    });
  }

  // Session actions
  getSessionStatusText(status: PeerReviewStatus): string {
    return this.sessionService.getStatusDisplayText(status);
  }

  getSessionStatusColor(status: PeerReviewStatus): string {
    return this.sessionService.getStatusColor(status);
  }

  canUserSubmit(status: PeerReviewStatus): boolean {
    return this.sessionService.canUserSubmit(status);
  }

  canUserReview(status: PeerReviewStatus): boolean {
    return this.sessionService.canUserReview(status);
  }

  // Submission actions
  getSubmissionStatus(submission: PeerSubmissionDTO): any {
    return this.submissionService.getSubmissionStatus(submission);
  }

  getFileIcon(fileType: string): string {
    return this.submissionService.getFileIcon(fileType);
  }

  // Review actions
  getRatingStars(rating: number): string[] {
    return this.peerReviewService.getRatingStars(rating);
  }

  getRatingColor(rating: number): string {
    return this.peerReviewService.getRatingColor(rating);
  }

  getReviewStatusText(review: PeerReviewDTO): string {
    return this.peerReviewService.getReviewStatusText(review);
  }

  getReviewStatusColor(review: PeerReviewDTO): string {
    return this.peerReviewService.getReviewStatusColor(review);
  }

  getReviewSummary(review: PeerReviewDTO): string {
    return this.peerReviewService.getReviewSummary(review);
  }

  // Action handlers
  onViewSession(sessionId: string): void {
    this.snackBar.open(`Navigiere zu Session: ${sessionId}`, 'Schließen', {
      duration: 2000,
    });
  }

  onViewSubmission(submissionId: string): void {
    this.snackBar.open(`Navigiere zu Submission: ${submissionId}`, 'Schließen', {
      duration: 2000,
    });
  }

  onStartReview(reviewId: string): void {
    this.snackBar.open(`Starte Review: ${reviewId}`, 'Schließen', {
      duration: 2000,
    });
  }

  onEditReview(reviewId: string): void {
    this.snackBar.open(`Bearbeite Review: ${reviewId}`, 'Schließen', {
      duration: 2000,
    });
  }

  onViewReview(reviewId: string): void {
    this.snackBar.open(`Zeige Review: ${reviewId}`, 'Schließen', {
      duration: 2000,
    });
  }

  // Helper methods
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isDeadlineApproaching(deadline: Date): boolean {
    const now = new Date();
    const timeUntilDeadline = new Date(deadline).getTime() - now.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    return timeUntilDeadline > 0 && timeUntilDeadline < dayInMs;
  }

  isDeadlinePassed(deadline: Date): boolean {
    return new Date(deadline).getTime() < new Date().getTime();
  }

  // Get mock data for template
  get mockData(): PeerReviewDashboardDTO {
    return this.mockDashboardData;
  }
}
