import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * This class provides a passport strategy for JWT authentication
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructor
   */
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // secret key for signing JWT tokens (modify in .env.auth file)
      secretOrKey: process.env.JWT_SECRET_KEY,
    });
  }

  /**
   * This method is called by passport when a user is trying to access a protected route
   * @param { User } payload payload of the JWT token
   * @returns the payload contents of the user if the validation was successful
   */
  async validate(payload: User) {
    return payload;
  }
}
