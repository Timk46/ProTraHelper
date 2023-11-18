import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * This class provides a passport strategy for JWT refresh authentication
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  /**
   * Constructor
   */
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // secret key for signing JWT refresh tokens (modify in .env.auth file)
      secretOrKey: process.env.JWT_REFRESH_SECRET_KEY,
      passReqToCallback: true,
    });
  }

  /**
   * This method is called by passport when a user is trying to access a protected route
   * @param { User } payload payload of the JWT token
   * @returns the payload contents of the user if the validation was successful
   */
  async validate(req: Request, payload: User) {
    const refreshToken = req.get('Authorization').replace('Bearer', '').trim();
    return { ...payload, refreshToken };
  }
}
