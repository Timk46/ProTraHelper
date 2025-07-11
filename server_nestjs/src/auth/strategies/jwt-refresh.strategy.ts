import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { Injectable } from '@nestjs/common';

/**
 * JwtRefreshStrategy is a custom Passport strategy for handling JWT refresh tokens.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  /**
   * Constructor
   */
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET_KEY,
      passReqToCallback: true,
    });
  }

  /**
   * Validates the JWT refresh token from the request.
   *
   * @param req - The incoming request object.
   * @param payload - The JWT payload.
   * @returns An object containing the payload and the extracted refresh token.
   */
  validate(req: Request, payload: any) {
    const refreshToken = req.get('Authorization').replace('Bearer', '').trim();
    return { ...payload, refreshToken };
  }
}
