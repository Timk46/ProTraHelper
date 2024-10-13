import { Strategy } from 'passport-cas';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UserDTO } from '../../../shared/dtos/user.dto';

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
    });
  }

  async validate(profile: any): Promise<Partial<UserDTO>> {
    // profile contains the university id number
    const email = `${profile}@uni-siegen.de`;
    const user: Partial<UserDTO> = {
      email: email,
      firstname: undefined,
      lastname: undefined,
      globalRole: undefined,
    };
    return user;
  }
}
