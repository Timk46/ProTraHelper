import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The `AdminService` class provides various administrative and learning analytics functionalities
 * such as retrieving users, calculating progress, and toggling registration
 * for specific subjects.
 *
 * @category Services
 */
@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all users from the database with selected data such as email,
   * feedback count, message count, subjects, and progress.
   *
   * @returns {Promise<any[]>} A list of users with detailed information.
   */
  async getAllUsers() {
    // Fetch all users with their associated data from Prisma
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
        UserContentProgress: true,
      },
    });

    // Transform the data structure and add calculated fields
    return users.map(user => ({
      ...user,
      kiFeedbackCount: user.codeSubmission.reduce((total, submission) => total + submission.kiFeedback.length, 0), // Calculate the total feedback count
      chatBotMessageCount: user.chatBotMessage.length, // Count chatbot messages
      totalProgress: this.calculateTotalProgress(user.UserContentProgress), // Calculate overall progress
      subjects: user.userSubjects.map(us => ({
        id: us.subject.id,
        name: us.subject.name,
        registeredForSL: us.registeredForSL,
      })),
    }));
  }

  /**
   * Retrieves the total progress of a specific user based on their content progress.
   *
   * @param {number} userId - The ID of the user whose progress is being fetched.
   * @returns {Promise<any>} The user's total progress and subjects with their specific progress.
   */
  async getUserTotalProgress(userId: number) {
    // Fetch the user's data including subject and content progress
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSubjects: {
          include: {
            subject: true,
          },
        },
        UserContentProgress: true,
      },
    });

    if (!user) {
      return null; // Return null if the user does not exist
    }

    // Return an object with the user's total progress and subjects
    return {
      totalProgress: this.calculateTotalProgress(user.UserContentProgress),
      subjects: user.userSubjects.map(us => ({
        name: us.subject.name,
        progress: this.calculateSubjectProgress(us.subject.id, user.UserContentProgress),
      })),
    };
  }

  /**
   * Toggles the registration status for a specific subject for a user.
   *
   * @param {number} userId - The ID of the user.
   * @param {number} subjectId - The ID of the subject.
   * @param {boolean} registeredForSL - The new registration status.
   * @returns {Promise<any>} The result of the update operation.
   */
  async toggleRegisteredForSL(userId: number, subjectId: number, registeredForSL: boolean) {
    // Update the user's registration status for the specified subject
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
   * Calculates the total progress for a user based on their content progress.
   *
   * @param {any[]} userContentProgress - The list of content progress entries for the user.
   * @returns {number} The total progress as a fraction of the total content.
   * @private
   */
  private calculateTotalProgress(userContentProgress: any[]): number {
    const totalContentElements = 100; // Replace with actual total content elements count
    return userContentProgress.length / totalContentElements;
  }

  /**
   * Calculates the progress for a specific subject based on the user's content progress.
   *
   * @param {number} subjectId - The ID of the subject.
   * @param {any[]} userContentProgress - The list of content progress entries for the user.
   * @returns {number} The calculated progress for the subject.
   * @private
   */
  private calculateSubjectProgress(subjectId: number, userContentProgress: any[]): number {

    // TODO
    // Placeholder implementation for subject-specific progress calculation !!!
    return Math.random();

  }
}
