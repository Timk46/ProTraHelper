/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { globalRole } from '@DTOs/roles.enum';
import { UserDTO, UserSubjectDTO } from '@DTOs/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // The Cas User will be created or updated after each login
  async createCASuser(email: string): Promise<UserDTO> {
    //this.logger.debug(`Creating CAS user with email: ${email}`);
    const user = await this.prisma.user.create({
      data: {
        firstname: 'casUSER', // we only get university id number but no name or mail
        lastname: 'UniSiegen',
        email: email.toLowerCase(), // to lowercase to prevent multiple Accounts by caslogin (students cant use big or small g in g-number in unisono)
        password: bcrypt.hashSync(
          email + process.env.CAS_PW_SECRET_KEY, // all cas users get a hash based on email and a secret server salt
          bcrypt.genSaltSync(10),
        ),
        globalRole: 'STUDENT', // Set default role to STUDENT
      },
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Add the user to the default subject (assuming subject with id 1 is the default)
    await this.addUserToSubject(user.id, 1, 'STUDENT', false); // 1 is AuD

    this.logger.debug(`CAS user created: ${JSON.stringify(user)}`);
    return this.mapToUserDTO(user);
  }

  async findAll(): Promise<UserDTO[]> {
    const users = await this.prisma.user.findMany({
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });
    return users.map(this.mapToUserDTO);
  }

  async findOneById(userId: number): Promise<UserDTO | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });
    return user ? this.mapToUserDTO(user) : null;
  }

  async findOne(email: string): Promise<UserDTO | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }, // to lowercase to prevent multiple Accounts by caslogin (students cant use big or small g in g-number in unisono)
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });
    if (user) {
      return this.mapToUserDTO(user);
    } else {
      this.logger.debug(`User not found for email: ${email}`);
      return null;
    }
  }

  //deletes one user, based on email -- needs testing
  async deleteUser(email: string): Promise<UserDTO> {
    this.logger.debug(`Deleting user with email: ${email}`);
    const user = await this.prisma.user.delete({
      where: { email: email },
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });
    return this.mapToUserDTO(user);
  }

  // If users can register later with their own e-mail, this may only be written in lowercase. This is because when searching for a user by email, the email is set to lowercase.
  // Currently this is not a problem, as all logins by mail are only possible through the accounts created in the seed (these are already lowercase)
  async createUser(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
  ): Promise<UserDTO> {
    const user = await this.prisma.user.create({
      data: {
        email: email,
        firstname: firstName,
        lastname: lastName,
        password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
      },
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Add the user to the default subject (assuming subject with id 1 is the default)
    await this.addUserToSubject(user.id, 1, 'STUDENT', false);
    return this.mapToUserDTO(user);
  }

  async addUserToSubject(
    userId: number,
    subjectId: number,
    role: string,
    registeredForSL: boolean,
  ): Promise<UserSubjectDTO> {
    const userSubject = await this.prisma.userSubject.create({
      data: {
        userId: userId,
        subjectId: subjectId,
        subjectSpecificRole: role,
        registeredForSL: registeredForSL,
      },
      include: {
        subject: true,
      },
    });
    return this.mapToUserSubjectDTO(userSubject);
  }

  async updateUserSubjectRole(userId: number, subjectId: number, newRole: string): Promise<number> {
    const result = await this.prisma.userSubject.updateMany({
      where: {
        userId: userId,
        subjectId: subjectId,
      },
      data: {
        subjectSpecificRole: newRole,
      },
    });
    return result.count;
  }

  async updateUserSubjectRegistration(
    userId: number,
    subjectId: number,
    registeredForSL: boolean,
  ): Promise<number> {
    const result = await this.prisma.userSubject.updateMany({
      where: {
        userId: userId,
        subjectId: subjectId,
      },
      data: {
        registeredForSL: registeredForSL,
      },
    });
    return result.count;
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

    for (const contentElement of contentElements) {
      if (contentElement.type === 'QUESTION') {
        maxProgress = maxProgress + contentElement.question.level;
      } else {
        //maxProgress = maxProgress + 0.2; // Points for PDF/VIDEO
      }
      if (
        userContentElementsProgress.find(
          element =>
            element.contentElementId === contentElement.id && element.markedAsDone === true,
        )
      ) {
        if (contentElement.type === 'QUESTION') {
          userTotalProgress = userTotalProgress + contentElement.question.level;
        } else {
          //userTotalProgress = userTotalProgress + 0.2; // Points for PDF/VIDEO
        }
      }
    }

    const userPercentage = (userTotalProgress / maxProgress) * 100;
    return userPercentage;
  }

  async validateUserPassword(email: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
      select: { password: true },
    });
    if (!user) {
      this.logger.debug(`User not found for email: ${email}`);
      return false;
    }
    const isValid = await bcrypt.compare(password, user.password);
    return isValid;
  }

  private mapToUserDTO(user: any): UserDTO {
    return {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      globalRole: user.globalRole,
      userSubjects: user.userSubjects ? user.userSubjects.map(this.mapToUserSubjectDTO) : [],
    };
  }

  private mapToUserSubjectDTO(userSubject: any): UserSubjectDTO {
    return {
      id: userSubject.id,
      name: userSubject.subject.name,
      userId: userSubject.userId,
      subjectId: userSubject.subjectId,
      subjectSpecificRole: userSubject.subjectSpecificRole,
      registeredForSL: userSubject.registeredForSL,
    };
  }
}
