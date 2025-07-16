import { IsString, IsOptional, IsInt } from "class-validator";
import { PeerReviewDTO } from "./peer-review.dto";

export class PeerSubmissionDTO {
  id!: string;
  sessionId!: string;
  fileUploadId!: number;
  title!: string;
  description?: string;
  submittedAt!: Date;

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

export class CreatePeerSubmissionDTO {
  @IsString()
  sessionId!: string;

  @IsInt()
  fileUploadId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePeerSubmissionDTO {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
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
