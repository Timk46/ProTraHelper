import { VoteLimitStatusDTO } from "./vote-limit-status.dto";

/**
 * DTO for resetting user votes in a specific category
 *
 * @description Used to reset all positive, negative, or all votes
 * of a user in a specific category of a submission
 */
export class ResetVotesDTO {
  /**
   * The submission ID where votes should be reset
   */
  submissionId!: string;

  /**
   * The category ID where votes should be reset
   */
  categoryId!: number;

  /**
   * The type of votes to reset (Ranking System: UP or ALL only)
   */
  voteType!: "UP" | "ALL";
}

/**
 * DTO for the response after resetting votes
 *
 * @description Contains information about the reset operation
 * and updated vote limit status
 */
export class ResetVotesResponseDTO {
  /**
   * Whether the reset operation was successful
   */
  success!: boolean;

  /**
   * The number of votes that were reset
   */
  resetCount!: number;

  /**
   * Updated vote limit status after the reset
   */
  voteLimitStatus!: VoteLimitStatusDTO;

  /**
   * Optional message describing the result
   */
  message?: string;

  /**
   * Array of comment IDs that were affected by the reset
   */
  affectedCommentIds?: string[];
}
