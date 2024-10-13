import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDTO } from '../../../shared/dtos/user.dto';

/**
 * This class is used to define the local (password) authentication strategy
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  /**
   * Constructor
   * @param {AuthService} authService The authentication service
   */
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  /**
   * This method is called by passport when a user is trying to access a protected route
   * @param {string} email the email of the user
   * @param {string} password the password of the user
   * @returns the user if the validation was successful, otherwise an exception is thrown
   */
  async validate(email: string, password: string): Promise<UserDTO> {
    //this.logger.debug(`Attempting to validate user: ${email}`);
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      this.logger.debug(`User validation failed for: ${email}`);
      throw new UnauthorizedException();
    }
    //this.logger.debug(`User validated successfully: ${email}`);
    return user;
  }
}
