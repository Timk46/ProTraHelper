import { PeerSubmissionDTO } from "./peer-submission.dto";

export enum PeerReviewStatus {
  CREATED = "CREATED",
  SUBMISSION_OPEN = "SUBMISSION_OPEN",
  SUBMISSION_CLOSED = "SUBMISSION_CLOSED",
  REVIEW_OPEN = "REVIEW_OPEN",
  REVIEW_CLOSED = "REVIEW_CLOSED",
  DISCUSSION_OPEN = "DISCUSSION_OPEN",
  DISCUSSION_CLOSED = "DISCUSSION_CLOSED",
  COMPLETED = "COMPLETED",
}

export interface PeerReviewSessionDTO {
  id: string;
  title: string;
  description?: string;
  moduleId: number;
  createdById: number;
  submissionDeadline: Date;
  reviewDeadline: Date;
  discussionDeadline: Date;
  status: PeerReviewStatus;
  createdAt: Date;
  updatedAt: Date;

  // Populated relationships
  module?: {
    id: number;
    name: string;
    description: string;
  };
  creator?: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
  };
  submissions?: PeerSubmissionDTO[];

  // Calculated fields
  submissionCount?: number;
  completedReviewCount?: number;
  totalReviewCount?: number;
}

export interface CreatePeerReviewSessionDTO {
  title: string;
  description?: string;
  moduleId: number;
  submissionDeadline: Date;
  reviewDeadline: Date;
  discussionDeadline: Date;
}

export interface UpdatePeerReviewSessionDTO {
  title?: string;
  description?: string;
  submissionDeadline?: Date;
  reviewDeadline?: Date;
  discussionDeadline?: Date;
  status?: PeerReviewStatus;
}
