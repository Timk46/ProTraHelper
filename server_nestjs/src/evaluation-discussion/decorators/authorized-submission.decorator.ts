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
 * 1. Decorator sets metadata indicating where to find the submission ID (params or body)
 * 2. SubmissionAuthorizationGuard reads this metadata during request processing
 * 3. Guard extracts submission ID from the specified source
 * 4. Guard calls EvaluationAuthorizationService to verify access
 * 5. Request proceeds if authorized, otherwise ForbiddenException is thrown
 *
 * **Prerequisites**:
 * - Controller must use `@UseGuards(SubmissionAuthorizationGuard)`
 * - Route/body must contain the submission ID
 * - User must be authenticated (enforced by RolesGuard/JwtAuthGuard)
 *
 * @param paramName - Name of the parameter/property containing the submission ID (default: 'submissionId')
 * @param source - Where to find the submission ID: 'params' for route parameters, 'body' for request body (default: 'params')
 *
 * @example
 * ```typescript
 * // Route parameters (default)
 * @Controller('evaluation-comments')
 * @UseGuards(RolesGuard, SubmissionAuthorizationGuard)
 * export class EvaluationCommentController {
 *   @Get('get/:submissionId/:categoryId')
 *   @roles('ANY')
 *   @AuthorizedSubmission() // Checks params.submissionId
 *   async getAllByCategory(
 *     @Param('submissionId', ParseIntPipe) submissionId: number
 *   ) {
 *     return this.service.getComments(submissionId);
 *   }
 *
 *   // Request body
 *   @Post('create')
 *   @roles('ANY')
 *   @AuthorizedSubmission('submissionId', 'body') // Checks body.submissionId
 *   async create(@Body() createDto: CreateCommentDTO) {
 *     // createDto.submissionId is verified before this executes
 *     return this.service.create(createDto);
 *   }
 *
 *   // Custom parameter name
 *   @Get('custom/:evalSubmissionId/data')
 *   @AuthorizedSubmission('evalSubmissionId') // Checks params.evalSubmissionId
 *   async getCustomData(@Param('evalSubmissionId') id: number) {
 *     return this.service.getData(id);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Combining with validation pipes
 * @Controller('submissions')
 * @UseGuards(RolesGuard, SubmissionAuthorizationGuard)
 * export class SubmissionController {
 *   @Post('update')
 *   @AuthorizedSubmission('submissionId', 'body')
 *   async update(
 *     @Body(ValidationPipe) updateDto: UpdateSubmissionDTO
 *   ) {
 *     // Authorization checked AFTER validation
 *     return this.service.update(updateDto);
 *   }
 * }
 * ```
 *
 * @throws {BadRequestException} If the specified parameter/property is missing or invalid
 * @throws {ForbiddenException} If user lacks access to the submission
 * @throws {NotFoundException} If the submission doesn't exist
 *
 * @see {@link SubmissionAuthorizationGuard} for the guard implementation
 * @see {@link EvaluationAuthorizationService} for authorization logic
 *
 * @public
 */
export const AuthorizedSubmission = (
  paramName = 'submissionId',
  source: 'params' | 'body' = 'params',
) => SetMetadata(SUBMISSION_AUTH_KEY, { paramName, source });
