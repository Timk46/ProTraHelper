import { IsNumber, IsArray, IsBoolean } from 'class-validator';

/**
 * DTO for vote limit status tracking
 * 
 * @description Provides information about available votes for a user
 * in a specific discussion thread/category
 */
export class VoteLimitStatusDTO {
  /**
   * Maximum number of votes allowed (equals total comments in thread)
   */
  @IsNumber()
  maxVotes!: number;

  /**
   * Number of votes remaining for the user
   */
  @IsNumber()
  remainingVotes!: number;

  /**
   * Array of comment IDs that the user has already voted on
   */
  @IsArray()
  @IsNumber({}, { each: true })
  votedCommentIds!: number[];

  /**
   * Whether the user can still vote
   */
  @IsBoolean()
  canVote!: boolean;

  /**
   * Display text for UI (e.g., "2/5 verfügbar")
   */
  displayText!: string;
}

/**
 * DTO for vote limit response including updated status
 */
export class VoteLimitResponseDTO {
  @IsBoolean()
  success!: boolean;

  voteLimitStatus!: VoteLimitStatusDTO;

  message?: string;
}

/**
 * DTO for enhanced comment voting request
 */
export class VoteCommentRequestDTO {
  @IsNumber()
  evaluationId!: number;

  @IsNumber()
  threadId!: number;

  @IsNumber()
  commentId!: number;

  @IsNumber()
  rating!: number;
}