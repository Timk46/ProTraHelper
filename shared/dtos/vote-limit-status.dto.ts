/**
 * DTO for vote limit status in a category
 *
 * @description Tracks the voting limits and current usage for a user
 * in a specific category of an evaluation submission
 */
export interface VoteLimitStatusDTO {
  /**
   * Maximum number of votes allowed in this category
   */
  maxVotes: number;

  /**
   * Number of votes remaining for the user
   */
  remainingVotes: number;

  /**
   * Array of comment IDs that the user has voted on
   */
  votedCommentIds: number[];

  /**
   * Whether the user can still vote (remainingVotes > 0)
   */
  canVote: boolean;

  /**
   * Display text for UI (e.g., "7/10 verfügbar")
   */
  displayText: string;
}

/**
 * DTO for vote limit response after voting
 *
 * @description Contains the result of a vote operation along with
 * updated vote limit status
 */
export interface VoteLimitResponseDTO {
  /**
   * Whether the vote operation was successful
   */
  success: boolean;

  /**
   * Updated vote limit status after the vote
   */
  voteLimitStatus: VoteLimitStatusDTO;

  /**
   * The user's total vote count for this comment
   */
  userVoteCount: number;

  /**
   * Optional message about the vote operation
   */
  message?: string;
}
