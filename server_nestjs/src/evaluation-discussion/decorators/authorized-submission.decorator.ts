import { SetMetadata } from '@nestjs/common';
import { SUBMISSION_AUTH_KEY } from '../guards/submission-authorization.guard';

/**
 * Decorator that enforces group-based access control for evaluation submissions
 *
 * @description
 * Apply this decorator to controller methods that operate on specific evaluation submissions
 * to ensure users can only access submissions they have permission to view.
 *
 * **Authorization Rules**:
 * - TEACHER and ADMIN users can access all submissions (global bypass)
 * - Regular users can only access submissions if they share at least one UserGroup with the author
 * - Submission authors do NOT get automatic access (must be in a group)
 *
 * **How it works**:
 * 1. Decorator sets metadata indicating which route parameter contains the submission ID
 * 2. SubmissionAuthorizationGuard reads this metadata during request processing
 * 3. Guard extracts submission ID from route parameters
 * 4. Guard calls EvaluationAuthorizationService to verify access
 * 5. Request proceeds if authorized, otherwise ForbiddenException is thrown
 *
 * **Prerequisites**:
 * - Controller must use `@UseGuards(SubmissionAuthorizationGuard)`
 * - Route must have a parameter containing the submission ID
 * - User must be authenticated (enforced by RolesGuard/JwtAuthGuard)
 *
 * @param paramName - Name of the route parameter containing the submission ID (default: 'submissionId')
 *
 * @example
 * ```typescript
 * // Basic usage with default parameter name
 * @Controller('evaluation-comments')
 * @UseGuards(RolesGuard, SubmissionAuthorizationGuard)
 * export class EvaluationCommentController {
 *   @Get('get/:submissionId/:categoryId')
 *   @roles('ANY')
 *   @AuthorizedSubmission() // Checks 'submissionId' parameter
 *   async getAllByCategory(
 *     @Param('submissionId', ParseIntPipe) submissionId: number,
 *     @GetUser() user: User
 *   ) {
 *     // User has verified access to this submission
 *     return this.service.getComments(submissionId);
 *   }
 *
 *   // Custom parameter name
 *   @Get('custom/:evalSubmissionId/data')
 *   @AuthorizedSubmission('evalSubmissionId') // Checks custom parameter
 *   async getCustomData(@Param('evalSubmissionId') id: number) {
 *     return this.service.getData(id);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Multiple endpoints with different submission parameters
 * @Controller('evaluations')
 * @UseGuards(RolesGuard, SubmissionAuthorizationGuard)
 * export class EvaluationController {
 *   @Get('submissions/:submissionId/ratings')
 *   @AuthorizedSubmission() // Default: 'submissionId'
 *   async getRatings(@Param('submissionId') id: number) { }
 *
 *   @Get('reviews/:reviewId/submission/:submissionId')
 *   @AuthorizedSubmission('submissionId') // Explicit parameter name
 *   async getReview(@Param('submissionId') id: number) { }
 * }
 * ```
 *
 * @throws {BadRequestException} If the specified parameter is missing from the route
 * @throws {ForbiddenException} If user lacks access to the submission
 * @throws {NotFoundException} If the submission doesn't exist
 *
 * @see {@link SubmissionAuthorizationGuard} for the guard implementation
 * @see {@link EvaluationAuthorizationService} for authorization logic
 *
 * @public
 */
export const AuthorizedSubmission = (paramName: string = 'submissionId') =>
  SetMetadata(SUBMISSION_AUTH_KEY, { paramName });
