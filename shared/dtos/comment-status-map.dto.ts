/**
 * DTO for user comment status across all categories
 *
 * @description Maps category IDs to boolean values indicating whether
 * the user has commented in that category. This includes both manual
 * comments and auto-generated rating comments.
 *
 * Used for state initialization after page refreshes and for determining
 * which categories have user participation.
 *
 * @example
 * ```typescript
 * {
 *   1: true,   // User has commented in category 1
 *   2: false,  // User has not commented in category 2
 *   3: true    // User has commented in category 3
 * }
 * ```
 */
export interface CommentStatusMapDTO {
  [categoryId: number]: boolean;
}

/**
 * Response DTO for the comment status endpoint
 *
 * @description Returned by GET /evaluation-comments/comment-status/:submissionId
 * Contains a map of all categories and their comment status for the current user.
 */
export type CommentStatusResponseDTO = CommentStatusMapDTO;
