import { UserDTO } from './user.dto';
import { EvaluationCommentDTO, VoteType } from './evaluation-comment.dto';

export interface EvaluationVoteDTO {
  id: number;
  commentId: number;
  userId: number;
  voteType: VoteType;
  createdAt: Date;

  // Relations
  comment?: EvaluationCommentDTO;
  user?: UserDTO;
}

export interface VoteCountResponseDTO {
  foreignVoteCount: number;
  userVoteCount: number; // Number of votes the user has given to this comment
}

export interface VoteResultDTO {
  commentId: number;
  upvotes: number;
  downvotes: number; // @deprecated - kept for compatibility, always 0
  userVote: VoteType;
  userVoteCount?: number; // Number of votes the user has given to this comment
  netVotes: number; // Now equals upvotes (no downvotes in ranking system)
  // Added voteStats to match frontend expectations
  voteStats: {
    upVotes: number;
    downVotes: number; // @deprecated - always 0 in ranking system
    totalVotes: number; // Now equals upVotes
    score: number; // Now equals upVotes
  };
}

export interface VoteUpdateData {
  voteStats: {
    upVotes: number;
    downVotes: number; // @deprecated - always 0 in ranking system
    totalVotes: number; // Now equals upVotes
    score: number; // Now equals upVotes
  };
  userVote?: VoteType;
  netVotes: number; // Now equals upVotes
}

export interface VoteRequestDTO {
  commentId: number;
  voteType: VoteType;
}

// Extended vote information for ranking display
export interface VoteDisplayData {
  upvotes: number;
  downvotes: number; // @deprecated - always 0 in ranking system
  userVote: VoteType;
  netVotes: number; // Now equals upvotes
  
  // UI Display properties (updated for ranking system)
  voteColor: 'success' | 'primary' | 'default';
  downvoteColor?: 'warn' | 'primary' | 'default'; // @deprecated - not used in ranking system
  showAnimation?: boolean;
  rank?: number; // New: comment ranking position
}