import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import  { globalRole } from '@DTOs/roles.enum';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // The Cas User will be created or updated after each login
  createCASuser(username: string) {
    return this.prisma.user.upsert({
      where: { email: username + '@CAS.de' },
      update: {},
      create: {
        firstname: 'casUSER', // geändert von firstName zu firstname
        lastname: 'UniSiegen', // geändert von lastName zu lastname
        email: username + '@CAS-uni-siegen.de', // we append @CAS so we know they registered via CAS
        password: bcrypt.hashSync(
          process.env.CAS_PW_SECRET_KEY, // password is a hash of the secret key since there is no way to login via password
          bcrypt.genSaltSync(10),
        ),
        // GlobalRole entfernt, da es nicht im User-Modell definiert ist und der Standardwert STUDENT automatisch zugewiesen wird
      },
    });
  }

  findAll() {
    //returns all users
    return this.prisma.user.findMany();
  }

  findOneById(userId: number) {
    //returns one user
    console.log('UsersService.findOne() with id ' + userId);
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  findOne(email: string) {
    //returns one user
    console.log('UsersService.findOne()');
    return this.prisma.user.findUnique({ where: { email: email } });
  }

  //deletes one user, based on email -- needs testing
  deleteUser(email: string) {
    return this.prisma.user.delete({
      where: {
        email: email,
      },
    });
  }

  createUser(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
  ) {
    console.log(
      'createUser() in users.service.ts with arguments email: ' +
        email +
        ', firstName: ' +
        firstName +
        ', lastName: ' +
        lastName,
    );
    return this.prisma.user.create({
      data: {
        email: email,
        firstname: firstName,
        lastname: lastName,
        password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
      },
    });
  }

  updateUserRefreshToken(email: string, refreshToken: string) {
    return this.prisma.user.update({
      where: {
        email: email,
      },
      data: {
        refreshToken: refreshToken,
      },
    });
  }

  /**
   * This method returns the global role of a user
   * @param userId --> User we want the data for
   * @returns globalRole of the user
   */
  async getGlobalRole(userId: number): Promise<globalRole> {
    const result = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        globalRole: true,
      },
    });
    return result.globalRole as globalRole;
  }
}
