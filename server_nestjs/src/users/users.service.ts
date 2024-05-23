/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import  { globalRole } from '@DTOs/roles.enum';
import { NotificationService } from '@/notification/notification.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService) {}

  // The Cas User will be created or updated after each login
  createCASuser(username: string) {
    return this.prisma.user.create({
      data: {
        firstname: 'casUSER', // we only get university id number but no name or mail
        lastname: 'UniSiegen',
        email: username,
        password: bcrypt.hashSync(
          username + process.env.CAS_PW_SECRET_KEY, // all cas users get a hash based on username and a secret server salt
          bcrypt.genSaltSync(10),
        ),
        modules: { connect: [{ id: 1 }] }, // ToDo: Make dynamic
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

  async getUserTotalProgress(userId: number): Promise<number> {
    console.log('userId: ' + userId);

    //gehe alle contnet elements durch und schaue, ob sie abgeschlossen sind
    let maxProgress = 0;
    let userTotalProgress = 0;
    const contentElements = await this.prisma.contentElement.findMany({
      select: {
        id: true,
        type: true,
        question: true,
      },
    });

    const userContentElementsProgress = await this.prisma.userContentElementProgress.findMany({
      where: {
        userId: userId,
      },
      select: {
        contentElementId: true,
        markedAsDone: true,
      },
    });

    console.log('User Content Elements Progress: ' + userContentElementsProgress);

    for (const contentElement of contentElements) {
      if(contentElement.type === 'QUESTION') {
        maxProgress = maxProgress + contentElement.question.level;
      }
      else {
        maxProgress = maxProgress + 1;
      }
      if(userContentElementsProgress.find((element) => element.contentElementId === contentElement.id && element.markedAsDone === true)) {
        if(contentElement.type === 'QUESTION') {
          userTotalProgress = userTotalProgress + contentElement.question.level;
        }
        else {
          userTotalProgress = userTotalProgress + 1;
        }
      }
    }

    console.log('Max Progress: ' + maxProgress);
    console.log('User Total Progress: ' + userTotalProgress);

    const userPercentage = userTotalProgress / maxProgress * 100;
    console.log('User Total Progress: ' + userPercentage);
    // send notification upon completion
    if(userPercentage === 100) {
      const notification = {
        userId: userId,
        message: 'You have completed all content elements. Congratulations!',
      }
      this.notificationService.notifyUser(notification);
    }
    return userPercentage;
  }
}
