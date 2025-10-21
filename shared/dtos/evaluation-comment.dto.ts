import { UserDTO } from './user.dto';
import { EvaluationSubmissionDTO } from './evaluation-submission.dto';
import { EvaluationCategoryDTO } from './evaluation-category.dto';

// Updated for ranking system: only positive votes allowed
export type VoteType = 'UP' | null;

export interface AuthorDTO {
  id: number;
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
  categoryId: number | null;
  authorId: number;
  content: string;
  parentId?: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Display info
  author: AuthorDTO;
  category?: EvaluationCategoryDTO;
  
  // Voting data
  votes: Array<{
    id: number;
    commentId: number;
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
  
  // Number of votes the current user has given to this comment (for ranking system)
  userVoteCount?: number;
  
  // Threading
  replies: EvaluationCommentDTO[];
  replyCount: number;
  
  // Relations
  submission?: EvaluationSubmissionDTO;
}

export interface EvaluationDiscussionDTO {
  id: number;
  submissionId: number;
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
  submissionId: number;
  categoryId?: number;
  content: string;
  parentId?: number;
  anonymousUserId?: number;
}

export interface UpdateCommentDTO {
  content: string;
}