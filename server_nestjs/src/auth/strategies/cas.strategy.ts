import { Strategy } from 'passport-cas';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UserDTO } from '@DTOs/user.dto';
import { Request } from 'express';

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
      casVersion: '3.0',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, profile: any): Promise<Partial<UserDTO>> {
    try {
      const deviceId = Array.isArray(req.query['device-id'])
        ? req.query['device-id'][0]
        : req.query['device-id'];

      // profile contains the university id number
      const email = `${profile}@uni-siegen.de`;

      let user: Partial<UserDTO>;

      if (deviceId) {
        user = {
          email: email,
          firstname: undefined,
          lastname: undefined,
          globalRole: undefined,
          currentDeviceId: deviceId as string,
        };
      } else {
        user = {
          email: email,
          firstname: undefined,
          lastname: undefined,
          globalRole: undefined,
        };
      }

      return user;
    } catch (error) {
      console.error('Error during CAS validation:', error);
      throw error;
    }
  }
}
