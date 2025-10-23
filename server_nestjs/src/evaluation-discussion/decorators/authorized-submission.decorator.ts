import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that validates submission access and returns the submission ID
 *
 * @description Automatically checks if the authenticated user has access to the
 * evaluation submission specified in the route parameter ':id'. If access is denied,
 * throws a ForbiddenException. If access is granted, returns the submission ID.
 *
 * **Authorization Logic**:
 * - Extracts submission ID from route params
 * - Extracts user ID from JWT token (req.user)
 * - Calls EvaluationAuthorizationService.checkAccessOrThrow()
 * - Throws ForbiddenException if user lacks access
 * - Returns submission ID if access is granted
 *
 * **Usage**: Place this decorator AFTER @UseGuards(JwtAuthGuard) to ensure user is authenticated.
 *
 * @example
 * ```typescript
 * @Get(':id/pdf')
 * @roles('ANY')
 * async getPdf(@AuthorizedSubmission() submissionId: number, @Res() res: Response) {
 *   // Authorization already checked - submissionId is valid and user has access
 *   return this.submissionService.getPdf(submissionId);
 * }
 * ```
 *
 * @returns {number} The submission ID if access is granted
 * @throws {ForbiddenException} If user does not have access to the submission
 * @throws {NotFoundException} If submission does not exist
 */
export const AuthorizedSubmission = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext): Promise<number> => {
    const request = ctx.switchToHttp().getRequest();
    const submissionId = parseInt(request.params.id, 10);
    const userId = request.user?.id;

    // Get authorization service from application context
    const authService = request.app.get('EvaluationAuthorizationService');

    // Perform authorization check - throws if access denied
    await authService.checkAccessOrThrow(submissionId, userId);

    return submissionId;
  },
);
