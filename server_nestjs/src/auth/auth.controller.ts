import {
  Controller,
  Request,
  Res,
  Get,
  Post,
  UseGuards,
  UnauthorizedException,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { LocalAuthGuard } from './common/guards/local-auth.guard';
import { AuthService } from './auth.service';
import { CasAuthGuard } from './common/guards/cas-auth.guard';
import { Public } from '@/public.decorator';
import { UserDTO } from '@DTOs/user.dto';
import { JwtAuthGuard } from '@/auth/common/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '@/auth/common/guards/jwt-refresh-auth.guard';
import { User } from '@prisma/client';
import { roles } from '@/auth/common/guards/roles.guard';

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
    const tokens = await this.authService.loginCAS(
      req.user.email,
      req.user.currentDeviceId,
    );

    // Redirect to the website with tokens as URL parameters - not super secure, but cant send in body because its not a request by the client
    res.redirect(
      `${process.env.WEBSITE_URL}/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  /**
   * Login route (local strategy)
   * @param req the request object
   * @param deviceId
   * @returns the access and refresh tokens
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: { user: UserDTO },
    @Headers('device-id') deviceId: string,
  ) {
    // The LocalAuthGuard has already validated the user, so we can directly login
    return this.authService.login(req.user, deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logout(
    @Request() req: { user: User },
    @Headers('device-id') deviceId: string,
  ) {
    try {
      await this.authService.logout(req.user, deviceId);
      return { message: 'Logout successful' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('logoutAllUserDevices')
  async logoutAllUserDevices(@Request() req: { user: User }) {
    try {
      await this.authService.logoutAllUserDevices(req.user);
      return { message: 'Logout from all devices successful' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @roles('ADMIN')
  @Get('logoutAllUser')
  async logoutAllUser(@Request() req: { user: User }) {
    try {
      await this.authService.logoutAllUser(req.user);
      return { message: 'All user logout out successful' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  async refresh(
    @Request() req: { user: User },
    @Headers('device-id') deviceId: string,
  ) {
    try {
      const email = req.user['email'];
      const refreshToken = req.user['refreshToken'];

      return await this.authService.refreshTokens(
        email,
        deviceId,
        refreshToken,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
