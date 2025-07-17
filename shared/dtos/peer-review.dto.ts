import { PeerReviewSessionDTO } from "./peer-review-session.dto";
import { PeerSubmissionDTO } from "./peer-submission.dto";

export interface PeerReviewDTO {
  id: string;
  sessionId: string;
  submissionId: string;
  reviewerId: number;
  anonymousReviewerId: number;
  rating?: number; // 1-5 stars
  comment?: string;
  isComplete: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Populated relationships
  session?: {
    id: string;
    title: string;
    status: string;
  };
  submission?: {
    id: string;
    title: string;
    description?: string;
    fileUpload: {
      file: {
        id: number;
        name: string;
        path: string;
        type: string;
        uniqueIdentifier: string;
      };
    };
  };
  reviewer?: {
    id: number;
    firstname: string;
    lastname: string;
  };
  anonymousReviewer?: {
    id: number;
    anonymousName: string;
  };

  // Calculated fields
  isOwnReview?: boolean;
  canEdit?: boolean;
}

export interface CreatePeerReviewDTO {
  sessionId: string;
  submissionId: string;
  rating?: number;
  comment?: string;
  isComplete?: boolean;
}

export interface UpdatePeerReviewDTO {
  rating?: number;
  comment?: string;
  isComplete?: boolean;
}

export interface PeerReviewStatsDTO {
  sessionId: string;

  // Submission statistics
  totalSubmissions: number;
  submissionRate: number;

  // Review statistics
  totalReviews: number;
  completedReviews: number;
  reviewCompletionRate: number;
  averageReviewsPerSubmission: number;

  // Rating statistics
  averageRating: number;
  ratingDistribution: { [rating: number]: number };

  // User statistics
  totalParticipants: number;
  activeReviewers: number;

  // Timeline statistics
  submissionTimeline: { date: Date; count: number }[];
  reviewTimeline: { date: Date; count: number }[];

  // Discussion statistics
  totalDiscussions: number;
  averageMessagesPerDiscussion: number;
  activeDiscussions: number;
}

export interface PeerReviewDashboardDTO {
  // Current user's sessions
  activeSessions: PeerReviewSessionDTO[];

  // Current user's submissions
  mySubmissions: PeerSubmissionDTO[];

  // Reviews assigned to current user
  assignedReviews: PeerReviewDTO[];

  // Reviews completed by current user
  completedReviews: PeerReviewDTO[];

  // Quick stats
  stats: {
    totalReviewsCompleted: number;
    totalReviewsAssigned: number;
    averageRatingReceived?: number;
    averageRatingGiven?: number;
    pendingReviews: number;
    overdueReviews: number;
    newDiscussions: number;
  };
}
