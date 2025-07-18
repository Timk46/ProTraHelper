import { UserDTO } from './user.dto';
import { EvaluationSubmissionDTO } from './evaluation-submission.dto';
import { EvaluationCategoryDTO } from './evaluation-category.dto';

export type VoteType = 'UP' | 'DOWN' | null;

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
  id: string;
  discussionId: string;
  categoryId: string;
  author: AuthorDTO;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Voting data
  upvotes: number;
  downvotes: number;
  userVote?: VoteType;
  
  // Threading
  parentId?: string;
  replies?: EvaluationCommentDTO[];
  replyCount: number;
  
  // Metadata
  isEdited?: boolean;
  editedAt?: Date;
  
  // Relations
  submission?: EvaluationSubmissionDTO;
  category?: EvaluationCategoryDTO;
}

export interface EvaluationDiscussionDTO {
  id: string;
  submissionId: string;
  categoryId: string;
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
  categoryId: string;
  content: string;
  parentId?: string;
  anonymousUserId?: string;
}

export interface UpdateCommentDTO {
  content: string;
}