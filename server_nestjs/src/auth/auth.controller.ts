import { Controller, Request, Res, Get, Post, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CasAuthGuard } from './cas-auth.guard';
import { Public } from '../public.decorator';

/**
 * This class is used to define the auth routes of the application
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(CasAuthGuard)
  @Get('cas')
  async casLogin(
    @Request() req: { user: User },
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const tokens = await this.authService.loginCAS(req.user.id.toString());

    // Redirect to the website with tokens as URL parameters - not super secure, but cant send in body because its not a request by the client
    res.redirect(
      `${process.env.WEBSITE_URL}/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  /**
   * Login route (local strategy)
   * @param req the request object
   * @returns the access and refresh tokens
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: { user: User }) {
    return this.authService.login(req.user);
  }

  /**
   * Logout route (JWT strategy)
   * @param req the request object
   * @returns a message whether the logout was successful or not
   */
  @UseGuards(JwtAuthGuard)
  @Get('logout')
  logout(@Request() req: { user: User }) {
    if (this.authService.logout(req.user) != null) {
      return { message: 'Logout successful' };
    } else {
      return { message: 'Logout failed' };
    }
  }

  /**
   * Refresh tokens route (JWT refresh strategy)
   * @param req the request object
   * @returns the updated access and refresh tokens
   */
  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  refreshTokens(@Request() req: { user: User }) {
    const email = req.user['email'];
    const refreshToken = req.user['refreshToken'];
    return this.authService.refreshTokens(email, refreshToken);
  }
}
