import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This class is used to protect routes with local (password) authentication
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
