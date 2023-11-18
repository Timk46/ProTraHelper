import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

/**
 * Provides authentication services
 */
@Injectable()
export class AuthService {
  /**
   * Constructor
   * @param usersService user service
   * @param userGlobalRoleService user global role service
   * @param jwtService jwt service
   */
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Checks if a user exists in the database and returns the user, access and refresh tokens if it does
   * @param { User } user the user to log in
   * @returns the user, access and refresh tokens if the user exists
   */
  async loginCAS(username: string) {
    const user = await this.usersService.createCASuser(username);
    const tokens = await this.generateTokens(user);
    console.log('User logged in: ' + username + " Role: " + user.globalRole + " Refreshtoken " + tokens.accessToken);
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
  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.usersService.findOne(email);
    if (user && bcrypt.compareSync(pass, user.password)) {
      return {
        ...user,
        password: undefined,
      };
    }
    return null;
  }

  /**
   * Checks if a user exists in the database and returns the user, access and refresh tokens if it does
   * @param { User } user the user to log in
   * @returns the user, access and refresh tokens if the user exists
   */
  async login(user: User) {
    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
    };
  }

   /**
     * Generates the access and refresh tokens for a user
     * @param { User } user the user to generate the tokens for
     * @returns { Promise<{ accessToken: string }> } the access and refresh tokens
     */
   async generateTokens(user: User): Promise<{ accessToken: string; }> {
    const payload = {
        email: user.email, firstName: user.firstname,
        lastName: user.lastname, id: user.id, role: await this.usersService.getGlobalRole(user.id)
    };
    const [accessToken] = await Promise.all([
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
    return {
        accessToken
    };
}
}
