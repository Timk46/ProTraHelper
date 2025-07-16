import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
} from "class-validator";
import { Transform, Type } from "class-transformer";
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

export class PeerReviewSessionDTO {
  id!: string;
  title!: string;
  description?: string;
  moduleId!: number;
  createdById!: number;
  submissionDeadline!: Date;
  reviewDeadline!: Date;
  discussionDeadline!: Date;
  status!: PeerReviewStatus;
  createdAt!: Date;
  updatedAt!: Date;

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

export class CreatePeerReviewSessionDTO {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  moduleId!: number;

  @IsDateString()
  submissionDeadline!: Date;

  @IsDateString()
  reviewDeadline!: Date;

  @IsDateString()
  discussionDeadline!: Date;
}

export class UpdatePeerReviewSessionDTO {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  submissionDeadline?: Date;

  @IsOptional()
  @IsDateString()
  reviewDeadline?: Date;

  @IsOptional()
  @IsDateString()
  discussionDeadline?: Date;

  @IsOptional()
  @IsEnum(PeerReviewStatus)
  status?: PeerReviewStatus;
}

// Import for PeerSubmissionDTO - will be defined in separate file
/*
export interface PeerSubmissionDTO {
  id: string;
  sessionId: string;
  fileUploadId: number;
  title: string;
  description?: string;
  submittedAt: Date;
}
*/
