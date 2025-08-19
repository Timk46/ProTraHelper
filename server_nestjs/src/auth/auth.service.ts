/* eslint-disable prettier/prettier */
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { EventLogService } from '../EventLog/event-log.service';
import { UserDTO } from '@DTOs/user.dto';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

/**
 * Provides authentication services
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Constructor
   * @param usersService user service
   * @param jwtService jwt service
   * @param eventLogService event log service
   */
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly eventLogService: EventLogService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Handles the login process using CAS (Central Authentication Service).
   *
   * @param email - The email of the user attempting to log in.
   * @param deviceId - The device ID from which the login attempt is made.
   * @returns An object containing the generated tokens.
   */
  async loginCAS(email: string, deviceId: string) {
    //this.logger.debug(`Attempting CAS login for email: ${email}`);
    let user = await this.usersService.findOne(email);
    if (user) {
      //this.logger.debug(`User found for CAS login: ${JSON.stringify(user)}`);
      this.eventLogService.log('info', 'login', user.id, 'User logged in', {
        email: user.email,
        role: user.globalRole,
      });
    } else {
      // If the user doesn't exist, create a new one
      this.logger.debug(`User not found for CAS login, creating new user`);
      user = await this.usersService.createCASuser(email);
      this.eventLogService.log('info', 'login', user.id, 'User created', {
        email: user.email,
        role: user.globalRole,
      });
    }
    const tokens = await this.generateTokens(user);
    await this.refreshTokenService.createRefreshToken(user.email, deviceId, tokens.refreshToken);
    //this.logger.debug(`Tokens generated for CAS login`);
    return {
      ...tokens,
    };
  }

  /**
   * validates a user by username and password from the database
   * @param { string } email email of the user
   * @param { string } pass password of the user
   * @returns the user if the validation was successful, otherwise null
   */
  async validateUser(email: string, pass: string): Promise<UserDTO | null> {
    //this.logger.debug(`Attempting to validate user: ${email}`);
    const isValid = await this.usersService.validateUserPassword(email, pass);
    if (isValid) {
      const user = await this.usersService.findOne(email);
      if (user) {
        //this.logger.debug(`User validated successfully: ${JSON.stringify(user)}`);
        this.eventLogService.log('info', 'login', user.id, 'User ' + email + ' validated', {
          email: user.email,
          role: user.globalRole,
        });
        return user;
      }
    }
    this.logger.debug(`User validation failed for: ${email}`);
    this.eventLogService.log('warn', 'login', null, 'User ' + email + ' NOT validated', {
      email: email,
    });
    return null;
  }

  /**
   * Logs in a user by generating authentication tokens and creating a refresh token.
   *
   * @param { UserDTO } user - The user data transfer object containing user information.
   * @param { string } deviceId - The device identifier for the user's device.
   * @returns { Promise<{ accessToken: string, refreshToken: string }> } An object containing the generated access and refresh tokens.
   */
  async login(user: UserDTO, deviceId: string) {
    //this.logger.debug(`Generating tokens for user: ${user.email}`);
    const tokens = await this.generateTokens(user);
    await this.refreshTokenService.createRefreshToken(user.email, deviceId, tokens.refreshToken);
    return {
      ...tokens,
    };
  }

  /**
   * Refreshes the access and refresh tokens for a user.
   *
   * @param email - The email of the user requesting token refresh.
   * @param deviceId - The device ID from which the request is made.
   * @param refreshToken - The current refresh token of the user.
   * @returns A promise that resolves to the new tokens.
   * @throws { ForbiddenException } If the user or refresh token is not found, or if the refresh token does not match.
   */
  async refreshTokens(email: string, deviceId: string, refreshToken: string) {
    // this.logger.debug(`Refresh tokens for user: ${email}`);
    const user = await this.usersService.findOne(email);
    const userRefreshToken = await this.refreshTokenService.getRefreshToken(email, deviceId);

    if (!user || !userRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, userRefreshToken.token);

    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.generateTokens(user);
    await this.refreshTokenService.updateRefreshToken(email, deviceId, tokens.refreshToken);
    // this.logger.debug(`Tokens refreshed for user: ${user.email}`);
    await this.eventLogService.log('info', 'login', user.id, 'User update refresh token', {
      email: user.email,
    });
    return tokens;
  }

  /**
   * Logs out the user by deleting their refresh token and logging the event.
   *
   * @param user - The user who is logging out.
   * @param deviceId - The ID of the device from which the user is logging out.
   * @returns A promise that resolves when the logout process is complete.
   */
  async logout(user: User, deviceId: string) {
    // this.logger.debug(`Logging out user: ${user.email}`);
    await this.refreshTokenService.deleteRefreshToken(user.email, deviceId);
    // this.logger.debug(`User logged out: ${user.email}`);
    await this.eventLogService.log('info', 'login', user.id, 'User logged out', {
      email: user.email,
      role: user.globalRole,
    });
  }

  /**
   * Logs out the user from all devices by deleting all refresh tokens associated with the user's email.
   *
   * @param user - The user object containing user details.
   * @returns A promise that resolves when the operation is complete.
   */
  async logoutAllUserDevices(user: User) {
    // this.logger.debug(`Logging out all devices for user: ${user.email}`);
    await this.refreshTokenService.deleteAllUserRefreshTokens(user.email);
    // this.logger.debug(`User logged out of all devices: ${user.email}`);
    await this.eventLogService.log('info', 'login', user.id, 'User logged out of all devices', {
      email: user.email,
      role: user.globalRole,
    });
  }

  /**
   * Logs out all users by deleting all refresh tokens and logging the event.
   *
   * @param user - The user initiating the logout action.
   * @returns A promise that resolves when the logout process is complete.
   */
  async logoutAllUser(user: User) {
    // this.logger.debug(`Logging out all user`);
    await this.refreshTokenService.deleteAllRefreshTokens();
    // this.logger.debug(`All user logged out`);
    await this.eventLogService.log('info', 'login', user.id, 'All user logged out', {
      email: user.email,
      role: user.globalRole,
    });
  }

  /**
   * Generates access and refresh tokens for a given user.
   *
   * @param { UserDTO } user - The user data transfer object containing user information.
   * @returns { Promise<{ accessToken: string; refreshToken: string; }> } A promise that resolves to an object containing the access token and refresh token.
   * @throws { Error } If token generation fails.
   */
  async generateTokens(user: UserDTO): Promise<{ accessToken: string; refreshToken: string }> {
    // this.logger.debug(`Generating tokens for user: ${user.email}`);
    const payload = {
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      id: user.id,
      globalRole: user.globalRole,
      subjects:
        user.userSubjects.map(us => ({
          subjectId: us.subjectId,
          subjectname: us.name,
          role: us.subjectSpecificRole,
          registeredForSL: us.registeredForSL,
        })) || [],
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...payload,
        },
        {
          secret: process.env.JWT_SECRET_KEY,
          expiresIn: String(process.env.JWT_EXPIRATION_TIME),
        },
      ),
      this.jwtService.signAsync(
        {
          email: user.email,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET_KEY,
          expiresIn: String(process.env.JWT_REFRESH_EXPIRATION_TIME),
        },
      ),
    ]);
    // this.logger.debug(`Tokens generated for user: ${user.email}`);
    await this.eventLogService.log('info', 'login', user.id, 'Tokens generated', {
      email: user.email,
      role: user.globalRole,
      accessToken: accessToken,
    });
    return {
      accessToken,
      refreshToken,
    };
  }
}
