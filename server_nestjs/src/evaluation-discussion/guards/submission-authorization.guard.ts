import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@prisma/client';
import { EvaluationAuthorizationService } from '../evaluation-authorization.service';

/**
 * Metadata key for submission authorization decorator
 * @internal
 */
export const SUBMISSION_AUTH_KEY = 'submissionAuth';

/**
 * Metadata configuration for submission authorization
 */
interface SubmissionAuthMetadata {
  /**
   * Name of the route parameter containing the submission ID
   * @default 'submissionId'
   */
  paramName: string;

  /**
   * Source location of the submission ID
   * @default 'params' - read from route parameters
   * 'body' - read from request body
   */
  source?: 'params' | 'body';
}

/**
 * Guard that enforces group-based access control for evaluation submissions
 *
 * @description
 * This guard extracts the submission ID from route parameters and verifies that
 * the requesting user has permission to access the submission. Access is granted if:
 * - User is a TEACHER or ADMIN (bypass), OR
 * - User shares at least one UserGroup with the submission author
 *
 * **Usage**:
 * Apply this guard to controller methods that operate on specific submissions.
 * The guard requires the submission ID to be present in route parameters.
 *
 * **Integration with @AuthorizedSubmission decorator**:
 * This guard reads metadata set by the @AuthorizedSubmission decorator to determine
 * which route parameter contains the submission ID.
 *
 * @example
 * ```typescript
 * @Controller('evaluation-comments')
 * @UseGuards(RolesGuard, SubmissionAuthorizationGuard)
 * export class EvaluationCommentController {
 *   @Get('get/:submissionId/:categoryId')
 *   @roles('ANY')
 *   @AuthorizedSubmission() // Uses default paramName: 'submissionId'
 *   async getAllByCategory(
 *     @Param('submissionId', ParseIntPipe) submissionId: number,
 *     @Param('categoryId', ParseIntPipe) categoryId: number,
 *     @GetUser() user: User
 *   ) {
 *     // Only executes if user has access to submission
 *     return this.service.getAllByCategory(submissionId, categoryId, user.id);
 *   }
 *
 *   @Get('custom/:evalSubmissionId/data')
 *   @AuthorizedSubmission('evalSubmissionId') // Custom parameter name
 *   async getCustomData(@Param('evalSubmissionId') id: number) {
 *     // Guard checks 'evalSubmissionId' parameter
 *   }
 * }
 * ```
 *
 * @see {@link EvaluationAuthorizationService} for authorization logic
 * @see {@link AuthorizedSubmission} decorator for applying this guard
 */
@Injectable()
export class SubmissionAuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(SubmissionAuthorizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: EvaluationAuthorizationService,
  ) {}

  /**
   * Validates user access to the submission specified in route parameters
   *
   * @param context - Execution context containing request information
   * @returns Promise resolving to true if access granted, false otherwise
   * @throws {BadRequestException} If submission ID parameter is missing or invalid
   * @throws {ForbiddenException} If user lacks access (thrown by authorizationService)
   * @throws {NotFoundException} If submission doesn't exist (thrown by authorizationService)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route requires submission authorization
    const metadata = this.reflector.get<SubmissionAuthMetadata>(
      SUBMISSION_AUTH_KEY,
      context.getHandler(),
    );

    // If no metadata set, skip authorization (route doesn't use @AuthorizedSubmission)
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: User;
      params: Record<string, string>;
      body: Record<string, any>;
      url: string;
    }>();
    const { user, params, body } = request;

    // Determine source location (params or body)
    const source = metadata.source || 'params';

    // Extract submission ID from specified source
    const sourceData = source === 'body' ? body : params;
    const submissionIdValue = sourceData[metadata.paramName];

    if (submissionIdValue === undefined || submissionIdValue === null) {
      this.logger.error(`Missing submission ID in ${source}`, {
        paramName: metadata.paramName,
        source,
        availableKeys: Object.keys(sourceData),
        route: request.url,
      });

      throw new BadRequestException(
        `${source === 'body' ? 'Body property' : 'Route parameter'} '${
          metadata.paramName
        }' is required for submission authorization`,
      );
    }

    // Parse and validate submission ID (handle both string and number)
    const submissionId =
      typeof submissionIdValue === 'number'
        ? submissionIdValue
        : parseInt(String(submissionIdValue), 10);

    if (isNaN(submissionId) || submissionId <= 0) {
      this.logger.error('Invalid submission ID format', {
        paramName: metadata.paramName,
        source,
        value: submissionIdValue,
        route: request.url,
      });

      throw new BadRequestException(
        `Invalid submission ID: '${submissionIdValue}' must be a positive integer`,
      );
    }

    // Perform authorization check (throws ForbiddenException if denied)
    await this.authorizationService.checkAccessOrThrow(submissionId, user.id);

    // Log successful authorization for audit trail
    this.logger.debug('Submission access granted', {
      userId: user.id,
      submissionId,
      route: request.url,
    });

    return true;
  }
}
