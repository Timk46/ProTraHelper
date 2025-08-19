/**
 * Response DTO for user vote status on evaluation comments
 * Wraps the primitive vote type in a proper JSON structure
 */
export interface UserVoteResponseDTO {
  /**
   * The user's vote type on the comment
   * - 'UP' for upvote
   * - 'DOWN' for downvote  
   * - null if the user hasn't voted
   */
  voteType: 'UP' | 'DOWN' | null;
}