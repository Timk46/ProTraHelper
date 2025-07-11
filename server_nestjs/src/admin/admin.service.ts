import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { User } from '@prisma/client';
import { contentElementType } from '@prisma/client';
import type { UserDTO } from '@DTOs/user.dto';

/**
 * Service responsible for administrative operations such as managing users and subjects.
 */
@Injectable()
export class AdminService {
  /**
   * @param prisma The Prisma service to interact with the database.
   * @param usersService The Users service to handle user-related operations.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Fetches all users along with their subjects, chatbot messages, code submission feedback, and total progress.
   *
   * @returns A list of users with their progress and other associated data.
   */
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        codeSubmission: {
          select: {
            kiFeedback: { select: { id: true } },
          },
        },
        chatBotMessage: { select: { id: true } },
        userSubjects: {
          select: {
            subject: { select: { id: true, name: true } },
            registeredForSL: true,
          },
        },
      },
    });

    const usersWithProgress = await Promise.all(
      users.map(async user => {
        const totalProgress = (await this.usersService.getUserTotalProgress(user.id)) / 100;
        return {
          ...user,
          kiFeedbackCount: user.codeSubmission.reduce(
            (total, submission) => total + submission.kiFeedback.length,
            0,
          ),
          chatBotMessageCount: user.chatBotMessage.length,
          totalProgress,
          subjects: user.userSubjects.map(us => ({
            id: us.subject.id,
            name: us.subject.name,
            registeredForSL: us.registeredForSL,
          })),
        };
      }),
    );

    return usersWithProgress;
  }

  /**
   * Updates the `registeredForSL` status for a specific user and subject.
   *
   * @param userId The ID of the user.
   * @param subjectId The ID of the subject.
   * @param registeredForSL A boolean indicating if the user is registered for SL (some learning mode).
   * @returns The updated user-subject record.
   */
  async toggleRegisteredForSL(userId: number, subjectId: number, registeredForSL: boolean) {
    return this.prisma.userSubject.update({
      where: {
        userId_subjectId: {
          userId,
          subjectId,
        },
      },
      data: {
        registeredForSL,
      },
    });
  }

  /**
   * Retrieves all subjects from the database.
   *
   * @returns A list of subjects with their IDs and names.
   */
  async getSubjects() {
    return this.prisma.subject.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }

  /**
   * Registers multiple users for a subject based on their email addresses.
   * If a user doesn't exist, it creates a new CAS user before registering.
   *
   * @param emails An array of user emails.
   * @param subjectId The ID of the subject to register users for.
   * @returns A message indicating how many users were processed and created.
   */
  async processEmailsForSubject(emails: string[], subjectId: number) {
    let createdUsers = 0;
    let processedUsers = 0;

    for (const email of emails) {
      const fullEmail = email.includes('@') ? email : `${email}@uni-siegen.de`;
      let user = await this.prisma.user.findUnique({
        where: { email: fullEmail.toLowerCase() },
      });

      if (!user) {
        const newUserDTO: UserDTO = await this.usersService.createCASuser(fullEmail);
        user = {
          id: newUserDTO.id,
          email: newUserDTO.email,
          firstname: newUserDTO.firstname,
          lastname: newUserDTO.lastname,
          globalRole: newUserDTO.globalRole,
        } as User;
        createdUsers++;
      }

      // Check if the user is already registered for the subject
      const existingUserSubject = await this.prisma.userSubject.findUnique({
        where: {
          userId_subjectId: {
            userId: user.id,
            subjectId: subjectId,
          },
        },
      });

      if (!existingUserSubject) {
        // If not registered, create a new UserSubject entry
        await this.prisma.userSubject.create({
          data: {
            userId: user.id,
            subjectId: subjectId,
            registeredForSL: true,
            subjectSpecificRole: 'STUDENT',
          },
        });
      } else {
        // If already registered, update the registeredForSL status
        await this.prisma.userSubject.update({
          where: {
            userId_subjectId: {
              userId: user.id,
              subjectId: subjectId,
            },
          },
          data: {
            registeredForSL: true,
          },
        });
      }

      processedUsers++;
    }

    return {
      message: `Processed ${processedUsers} users for subject ${subjectId}. Created ${createdUsers} new users.`,
    };
  }

  /**
   * Fetches user progress by question type, including total questions per type.
   * Only considers questions that are associated with a content element.
   *
   * @param userId The ID of the user.
   * @returns An object containing the count of solved questions and total questions for each question type.
   */
  async getUserProgressByQuestionType(userId: number) {
    const userProgress = await this.prisma.userContentElementProgress.findMany({
      where: {
        userId: userId,
        contentElement: {
          type: contentElementType.QUESTION,
        },
        markedAsDone: true,
      },
      include: {
        contentElement: {
          include: {
            question: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    const totalQuestions = await this.prisma.question.groupBy({
      by: ['type'],
      _count: {
        _all: true,
      },
      where: {
        contentElement: {
          isNot: null,
        },
      },
    });

    const progressByType = totalQuestions.reduce((acc, questionType) => {
      acc[questionType.type] = {
        total: questionType._count._all,
        completed: 0,
      };
      return acc;
    }, {});

    userProgress.forEach(progress => {
      const questionType = progress.contentElement.question.type;
      if (questionType && progressByType[questionType]) {
        progressByType[questionType].completed += 1;
      }
    });

    return progressByType;
  }

  /**
   * Fetches user daily progress, showing the number of tasks completed each day.
   *
   * @param userId The ID of the user.
   * @returns An array of objects, each containing a date and the count of tasks completed on that date.
   */
  async getUserDailyProgress(userId: number) {
    const userProgress = await this.prisma.userContentElementProgress.findMany({
      where: {
        userId: userId,
        contentElement: {
          type: contentElementType.QUESTION,
        },
        markedAsDone: true,
      },
      select: {
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    const dailyProgress = userProgress.reduce((acc, progress) => {
      const date = progress.updatedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(dailyProgress).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Fetches daily progress for all users, grouped by question type.
   *
   * @returns An array of objects, each containing a date, question type, and count of completed tasks.
   */
  async getAllUsersDailyProgress() {
    const userProgress = await this.prisma.userContentElementProgress.findMany({
      where: {
        contentElement: {
          type: contentElementType.QUESTION,
        },
        markedAsDone: true,
      },
      select: {
        updatedAt: true,
        contentElement: {
          select: {
            question: {
              select: {
                type: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
    });

    const dailyProgress = userProgress.reduce((acc, progress) => {
      const date = progress.updatedAt.toISOString().split('T')[0];
      const questionType = progress.contentElement.question.type || 'Unknown';

      if (!acc[date]) {
        acc[date] = {};
      }

      acc[date][questionType] = (acc[date][questionType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(dailyProgress).flatMap(([date, types]) =>
      Object.entries(types).map(([type, count]) => ({
        date,
        type,
        count,
      })),
    );
  }

  /**
   * Fetches detailed information for a specific user.
   *
   * @param userId The ID of the user.
   * @returns An object containing user details and total progress.
   */
  async getUserDetails(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        globalRole: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const totalProgress = await this.usersService.getUserTotalProgress(userId);

    return {
      ...user,
      totalProgress,
    };
  }
}
