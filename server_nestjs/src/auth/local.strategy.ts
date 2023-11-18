import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '@prisma/client';

/**
 * This class is used to define the local (password) authentication strategy
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructor
   * @param {AuthService} authService The authentication service
   */
  constructor(private authService: AuthService) {
    super();
  }

  /**
   * This method is called by passport when a user is trying to access a protected route
   * @param {string} email the email of the user
   * @param {string} password the password of the user
   * @returns the user if the validation was successful, otherwise an exception is thrown
   */
  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
