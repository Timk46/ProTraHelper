import { Controller, Request, Res, Get, Post, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { CasAuthGuard } from './cas-auth.guard';
import { Public } from '../public.decorator';
import { UserDTO } from '../../../shared/dtos/user.dto';

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
    @Request() req: { user?: Partial<UserDTO> },
    @Res() res: ExpressResponse,
  ): Promise<void> {
    if (!req.user || !req.user.email) {
      throw new UnauthorizedException('User email not provided');
    }
    const tokens = await this.authService.loginCAS(req.user.email);

    // Redirect to the website with tokens as URL parameters - not super secure, but cant send in body because its not a request by the client
    res.redirect(
      `${process.env.WEBSITE_URL}/login?accessToken=${tokens.accessToken}`,
    );
  }

  /**
   * Login route (local strategy)
   * @param req the request object
   * @returns the access and refresh tokens
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: { user: UserDTO }) {
    // The LocalAuthGuard has already validated the user, so we can directly login
    return this.authService.login(req.user);
  }
}
