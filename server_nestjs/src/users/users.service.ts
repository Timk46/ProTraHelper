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
      where: { email: username + '@CAS-uni-siegen.de' },
      update: {},
      create: {
        firstname: 'casUSER', // we only get university id number but no name or mail
        lastname: 'UniSiegen',
        email: username + '@CAS-uni-siegen.de',
        password: bcrypt.hashSync(
          process.env.CAS_PW_SECRET_KEY, // all cas users have the same password, but its only stored as hash and in clear text in .env -> ToDo: Prohibit login with passwort for cas-accounts
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
