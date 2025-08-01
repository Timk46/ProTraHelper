import { UserDTO } from './user.dto';
import { EvaluationCommentDTO, VoteType } from './evaluation-comment.dto';

export interface EvaluationVoteDTO {
  id: string;
  commentId: string;
  userId: number;
  voteType: VoteType;
  createdAt: Date;
  
  // Relations
  comment?: EvaluationCommentDTO;
  user?: UserDTO;
}

export interface VoteResultDTO {
  commentId: string;
  upvotes: number;
  downvotes: number;
  userVote: VoteType;
  netVotes: number; // upvotes - downvotes
}

export interface VoteUpdateData {
  voteStats: {
    upVotes: number;
    downVotes: number;
    totalVotes: number;
    score: number;
  };
  userVote?: VoteType;
  netVotes: number;
}

export interface VoteRequestDTO {
  commentId: string;
  voteType: VoteType;
}

// Extended vote information with color indicators
export interface VoteDisplayData {
  upvotes: number;
  downvotes: number;
  userVote: VoteType;
  netVotes: number;
  
  // UI Display properties
  upvoteColor: 'success' | 'primary' | 'default';
  downvoteColor: 'warn' | 'primary' | 'default';
  showAnimation?: boolean;
}