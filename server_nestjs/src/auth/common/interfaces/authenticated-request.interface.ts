import { Request } from 'express';
import { User } from '@prisma/client';

/**
 * Authenticated request interface
 *
 * @description Extends Express Request with authenticated user information.
 * The user object is populated by the JWT authentication strategy after successful token validation.
 * This interface ensures type safety when accessing req.user in protected routes.
 *
 * @interface AuthenticatedRequest
 * @extends {Request}
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@Req() req: AuthenticatedRequest) {
 *   const userId = req.user.id;
 *   const userEmail = req.user.email;
 *   return this.userService.findOne(userId);
 * }
 * ```
 */
export interface AuthenticatedRequest extends Request {
  /**
   * Authenticated user object populated by JWT strategy
   * Contains the full User model from Prisma
   */
  user: User;
}
