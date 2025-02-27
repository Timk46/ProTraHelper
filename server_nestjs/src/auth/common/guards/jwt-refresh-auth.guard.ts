import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This guard is used to protect routes that require a valid JWT refresh token.
 */

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {}
