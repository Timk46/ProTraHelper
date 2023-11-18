import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This class is used to protect routes with JWT authentication
 */
@Injectable()
export class CasAuthGuard extends AuthGuard('cas') {}
