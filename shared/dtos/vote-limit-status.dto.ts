/**
 * DTO for vote limit status tracking
 *
 * @description Provides information about available votes for a user
 * in a specific discussion thread/category
 */
export interface VoteLimitStatusDTO {
  /**
   * Maximum number of votes allowed (equals total comments in thread)
   */
  maxVotes: number;

  /**
   * Number of votes remaining for the user
   */
  remainingVotes: number;

  /**
   * Array of comment IDs that the user has already voted on
   */
  votedCommentIds: number[];

  /**
   * Whether the user can still vote
   */
  canVote: boolean;

  /**
   * Display text for UI (e.g., "2/5 verfügbar")
   */
  displayText: string;
}

/**
 * DTO for vote limit response including updated status
 */
export interface VoteLimitResponseDTO {
  success: boolean;
  voteLimitStatus: VoteLimitStatusDTO;
  message?: string;

  /**
   * Number of votes the user has given to the specific comment
   * Used for frontend synchronization in multi-vote ranking system
   */
  userVoteCount?: number;
}

/**
 * DTO for enhanced comment voting request
 */
export interface VoteCommentRequestDTO {
  evaluationId: number;
  threadId: number;
  commentId: number;
  rating: number;
}
