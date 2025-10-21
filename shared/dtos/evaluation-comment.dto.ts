import { UserDTO } from './user.dto';
import { EvaluationSubmissionDTO } from './evaluation-submission.dto';
import { EvaluationCategoryDTO } from './evaluation-category.dto';

// Updated for ranking system: only positive votes allowed
export type VoteType = 'UP' | null;

export interface AuthorDTO {
  id: string;
  type: 'user' | 'anonymous';
  displayName: string;
  firstname?: string;
  lastname?: string;
  avatar?: string;
  colorCode?: string; // For anonymous users
}

export interface EvaluationCommentDTO {
  id: number;
  submissionId: number;
  categoryId: number;
  authorId?: number;
  authorNickname?: string; // For anonymous users
  content: string;
  parentId?: number;
  voteCount: number; // Total number of votes excluding user's votes
  userVoteCount: number; // Number of votes the current user has given to this comment
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationDiscussionDTO {
  id: string;
  submissionId: string;
  categoryId: number;
  comments: EvaluationCommentDTO[];
  createdAt: Date;
  
  // Statistics
  totalComments: number;
  availableComments: number;
  usedComments: number;
  
  // Relations
  submission?: EvaluationSubmissionDTO;
  category?: EvaluationCategoryDTO;
}

export interface CreateCommentDTO {
  submissionId: string;
  categoryId?: number;
  content: string;
  parentId?: string;
  anonymousUserId?: string;
}

export interface UpdateCommentDTO {
  content: string;
}