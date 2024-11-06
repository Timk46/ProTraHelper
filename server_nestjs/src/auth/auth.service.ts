/* eslint-disable prettier/prettier */
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { EventLogService } from '../EventLog/event-log.service';
import { UserDTO } from '@DTOs/user.dto';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import * as bcrypt from 'bcrypt';

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
    private usersService: UsersService,
    private jwtService: JwtService,
    private eventLogService: EventLogService,
    private refreshTokenService: RefreshTokenService
  ) {}

  /**
   * Checks if a user exists in the database and returns the user, access and refresh tokens if it does
   * @param { string } email the email to log in
   * @returns the user, access and refresh tokens if the user exists
   */
  async loginCAS(email: string, deviceId: string) {
    //this.logger.debug(`Attempting CAS login for email: ${email}`);
    let user = await this.usersService.findOne(email);
    if (user) {
      //this.logger.debug(`User found for CAS login: ${JSON.stringify(user)}`);
      this.eventLogService.log('info', 'login', user.id, 'User logged in', {email: user.email, role: user.globalRole});
    }
    else { // If the user doesn't exist, create a new one
      this.logger.debug(`User not found for CAS login, creating new user`);
      user = await this.usersService.createCASuser(email);
      this.eventLogService.log('info', 'login', user.id, 'User created', {email: user.email, role: user.globalRole});
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
        this.eventLogService.log('info', 'login', user.id, 'User ' + email + ' validated', {email: user.email, role: user.globalRole});
        return user;
      }
    }
    this.logger.debug(`User validation failed for: ${email}`);
    this.eventLogService.log('warn', 'login', null, 'User ' + email + ' NOT validated', {email: email});
    return null;
  }

  /**
   * Checks if a user exists in the database and returns the user, access and refresh tokens if it does
   * @param { UserDTO } user the user to log in
   * @returns the user, access and refresh tokens if the user exists
   */
  async login(user: UserDTO) {
    //this.logger.debug(`Generating tokens for user: ${user.email}`);
    const tokens = await this.generateTokens(user);
    return {
      ...tokens
    };
  }

  async refreshTokens(email: string, deviceId: string, refreshToken: string) {
    this.logger.debug(`Refresh tokens for user: ${email}`); // TODO: hide
    const user = await this.usersService.findOne(email);
    const userRefreshToken = await this.refreshTokenService.getRefreshToken(email, deviceId);

    if (!user || !userRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      userRefreshToken.token
    );

    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.generateTokens(user);
    await this.refreshTokenService.updateRefreshToken(email, deviceId, tokens.refreshToken);
    this.logger.debug(`Tokens refreshed for user: ${user.email}`); // TODO: hide
    await this.eventLogService.log('info', 'login', user.id, 'User update refresh token', { email: user.email });
    return tokens;
  }

  /**
   * Generates the access and refresh tokens for a user
   * @param { UserDTO } user the user to generate the tokens for
   * @returns { Promise<{ accessToken: string }> } the access and refresh tokens
   */
  async generateTokens(user: UserDTO): Promise<{ accessToken: string; refreshToken: string; }> {
    this.logger.debug(`Generating tokens for user: ${user.email}`); // TODO: hide
    const payload = {
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      id: user.id,
      globalRole: user.globalRole,
      subjects: user.userSubjects?.map(us => ({
        subjectId: us.subjectId,
        subjectname: us.name,
        role: us.subjectSpecificRole,
        registeredForSL: us.registeredForSL
      })) || []
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
    this.logger.debug(`Tokens generated for user: ${user.email}`); // TODO: hide
    await this.eventLogService.log('info', 'login', user.id, 'Tokens generated', {
      email: user.email,
      role: user.globalRole,
      accessToken: accessToken
    });
    return {
      accessToken,
      refreshToken,
    };
  }
}
