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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles the CAS login process.
   *
   * @param req - The request object containing the user information.
   * @param res - The response object used to redirect the user.
   * @throws { UnauthorizedException } If the user email is not provided.
   * @returns { Promise<void> } A promise that resolves when the redirection is complete.
   */
  @ApiOperation({ summary: 'CAS Login', description: 'Handles the CAS authentication process' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with authentication tokens' })
  @ApiResponse({ status: 401, description: 'Unauthorized - User email not provided' })
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
    const tokens = await this.authService.loginCAS(req.user.email, req.user.currentDeviceId);

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
  async login(@Request() req: { user: UserDTO }, @Headers('device-id') deviceId: string) {
    // The LocalAuthGuard has already validated the user, so we can directly login
    return this.authService.login(req.user, deviceId);
  }

  /**
   * Logs out the user by invalidating their token.
   *
   * @param req - The request object containing the user information.
   * @param deviceId - The ID of the device from which the user is logging out.
   * @returns An object containing a success message if the logout is successful.
   * @throws { BadRequestException } If an error occurs during the logout process.
   */
  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logout(@Request() req: { user: User }, @Headers('device-id') deviceId: string) {
    try {
      await this.authService.logout(req.user, deviceId);
      return { message: 'Logout successful' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Logs out the user from all devices by invalidating all their tokens.
   *
   * @param req - The request object containing the user information.
   * @returns An object containing a success message if the logout is successful.
   * @throws { BadRequestException } If an error occurs during the logout process.
   */
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

  /**
   * Logs out all sessions for the authenticated user.
   *
   * @param req - The request object containing the authenticated user.
   * @returns A message indicating the success of the logout operation.
   * @throws { BadRequestException } If an error occurs during the logout process.
   */
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

  /**
   * Refreshes the authentication tokens for the user.
   *
   * @param req - The request object containing the user information.
   * @param req.user - The user object containing user details.
   * @param req.user.email - The email of the user.
   * @param req.user.refreshToken - The refresh token of the user.
   * @param deviceId - The device ID from the request headers.
   * @returns A promise that resolves with the new authentication tokens.
   * @throws { BadRequestException } If an error occurs during the token refresh process.
   */
  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Get('refresh')
  async refresh(@Request() req: { user: User }, @Headers('device-id') deviceId: string) {
    try {
      const email = req.user['email'];
      const refreshToken = req.user['refreshToken'];

      return await this.authService.refreshTokens(email, deviceId, refreshToken);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
