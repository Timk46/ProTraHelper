import { PeerReviewDTO } from "./peer-review.dto";

export interface PeerSubmissionDTO {
  id: string;
  sessionId: string;
  fileUploadId: number;
  title: string;
  description?: string;
  submittedAt: Date;

  // Populated relationships
  session?: {
    id: string;
    title: string;
    status: string;
  };
  fileUpload?: {
    id: number;
    userId: number;
    file: {
      id: number;
      name: string;
      path: string;
      type: string;
      uniqueIdentifier: string;
    };
    user: {
      id: number;
      firstname: string;
      lastname: string;
    };
  };
  reviews?: PeerReviewDTO[];
  discussions?: {
    id: number;
    title: string;
    createdAt: Date;
    messagesCount: number;
  }[];

  // Calculated fields
  averageRating?: number;
  reviewCount?: number;
  isOwnSubmission?: boolean;
  userHasReviewed?: boolean;
}

export interface CreatePeerSubmissionDTO {
  sessionId: string;
  fileUploadId: number;
  title: string;
  description?: string;
}

export interface UpdatePeerSubmissionDTO {
  title?: string;
  description?: string;
}

// Import for PeerReviewDTO - will be defined in separate file
/*
export interface PeerReviewDTO {
  id: string;
  sessionId: string;
  submissionId: string;
  reviewerId: number;
  rating?: number;
  comment?: string;
  isComplete: boolean;
  completedAt?: Date;
  createdAt: Date;
}
*/
