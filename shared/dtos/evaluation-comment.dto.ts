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
  id: string;
  submissionId: string;
  categoryId: number | null;
  authorId: number;
  content: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Display info
  author: AuthorDTO;
  category?: EvaluationCategoryDTO;
  
  // Voting data
  votes: Array<{
    id: string;
    commentId: string;
    userId: number;
    voteType: VoteType;
    createdAt: Date;
  }>;
  voteStats: {
    upVotes: number;
    downVotes: number; // @deprecated - kept for backward compatibility, always 0
    totalVotes: number;
    score: number; // Now equals upVotes in ranking system
  };
  
  // Threading
  replies: EvaluationCommentDTO[];
  replyCount: number;
  
  // Relations
  submission?: EvaluationSubmissionDTO;
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