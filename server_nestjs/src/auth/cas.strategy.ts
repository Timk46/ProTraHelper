import { Strategy } from 'passport-cas';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * This class provides a passport strategy for CAS authentication
 */
@Injectable()
export class CasStrategy extends PassportStrategy(Strategy, 'cas') {
  constructor() {
    super({
      // CAS configuration options
      ssoBaseURL: 'https://cas.zimt.uni-siegen.de/cas',
      serverBaseURL: process.env.SERVER_URL,
      //serverBaseURL: 'http://185.216.179.150:33001',
      casVersion: '3.0',
    });
  }

  async validate(profile: any): Promise<User> {
    const user: User = {
      id: profile,
      email: undefined,
      firstname: undefined,
      lastname: undefined,
      password: undefined,
      createdAt: undefined,
      globalRole: undefined,
      currentconceptNodeId: undefined,
      refreshToken: undefined,
    };
    return user;
  }
}
