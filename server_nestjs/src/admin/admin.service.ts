import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

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
    private prisma: PrismaService,
    private usersService: UsersService
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
            kiFeedback: { select: { id: true } }
          }
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

    const usersWithProgress = await Promise.all(users.map(async (user) => {
      const totalProgress = await this.usersService.getUserTotalProgress(user.id) / 100;
      return {
        ...user,
        kiFeedbackCount: user.codeSubmission.reduce((total, submission) => total + submission.kiFeedback.length, 0),
        chatBotMessageCount: user.chatBotMessage.length,
        totalProgress,
        subjects: user.userSubjects.map(us => ({
          id: us.subject.id,
          name: us.subject.name,
          registeredForSL: us.registeredForSL,
        })),
      };
    }));

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
   *
   * @param emails An array of user emails.
   * @param subjectId The ID of the subject to register users for.
   * @returns A message indicating how many users were processed.
   */
  async processEmailsForSubject(emails: string[], subjectId: number) {
    const users = await this.prisma.user.findMany({
      where: {
        email: {
          in: emails,
        },
      },
    });

    const userIds = users.map(user => user.id);

    await this.prisma.userSubject.updateMany({
      where: {
        userId: {
          in: userIds,
        },
        subjectId: subjectId,
      },
      data: {
        registeredForSL: true,
      },
    });

    return { message: `Processed ${userIds.length} users for subject ${subjectId}` };
  }
}
