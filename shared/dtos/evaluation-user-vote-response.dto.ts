/**
 * Response DTO for user vote status on evaluation comments (Ranking System)
 * Wraps the primitive vote type in a proper JSON structure
 */
export interface UserVoteResponseDTO {
  /**
   * The user's vote type on the comment (Updated for ranking system)
   * - 'UP' for positive vote (used in ranking)
   * - null if the user hasn't voted
   * Note: Downvotes removed in favor of ranking-only system
   */
  voteType: 'UP' | null;
}