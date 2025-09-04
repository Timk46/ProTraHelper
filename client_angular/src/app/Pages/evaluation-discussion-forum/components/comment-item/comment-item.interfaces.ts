import { VoteType } from '@DTOs/index';

/**
 * Interface for vote-related data passed to comment-item component
 * 
 * @interface CommentVoteData
 */
export interface CommentVoteData {
  /** Current user's vote status for this comment */
  userVoteStatus: VoteType | null;
  
  /** Whether vote status is currently loading */
  isVoteLoading: boolean;
  
  /** Whether user can vote for this comment (ranking system) */
  canVote: boolean;
  
  /** Number of available votes for this category (ranking system) */
  availableVotes: number;
}

/**
 * Interface for vote events emitted by comment-item component
 * 
 * @interface VoteEvent
 */
export interface VoteEvent {
  /** ID of the comment being voted on */
  commentId: string;
  
  /** Type of vote ('UP' only in ranking system) */
  voteType: VoteType;
}

/**
 * Interface for reply events emitted by comment-item component
 * 
 * @interface ReplyEvent  
 */
export interface ReplyEvent {
  /** ID of the comment being replied to */
  commentId: string;
}