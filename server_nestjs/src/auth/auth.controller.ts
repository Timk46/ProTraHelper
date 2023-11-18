import { Controller, Request, Res, Get, Post, UseGuards } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';
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

}
