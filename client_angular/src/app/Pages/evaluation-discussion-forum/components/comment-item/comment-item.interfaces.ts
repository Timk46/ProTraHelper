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
  
  /** Whether user can vote up for this comment */
  canVoteUp: boolean;
  
  /** Whether user can vote down for this comment */
  canVoteDown: boolean;
  
  /** Number of available upvotes for this category */
  availableUpvotes: number;
  
  /** Number of available downvotes for this category */
  availableDownvotes: number;
}

/**
 * Interface for vote events emitted by comment-item component
 * 
 * @interface VoteEvent
 */
export interface VoteEvent {
  /** ID of the comment being voted on */
  commentId: string;
  
  /** Type of vote ('UP' or 'DOWN') */
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