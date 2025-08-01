import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { detailedGroupReviewGateDTO, GroupReviewStatusDTO } from '@DTOs/detailedQuestion.dto';

@Injectable()
export class QuestionDataGroupReviewGateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new GroupReviewGate entry in the database.
   *
   * @param questionId - The ID of the question to associate with the group review gate.
   * @param dto - The data transfer object containing details for the group review gate, including linked question ID and HTML text.
   * @returns A promise that resolves to the created GroupReviewGate record.
   */
  async create(questionId: number, dto: detailedGroupReviewGateDTO) {
    return this.prisma.groupReviewGate.create({
      data: {
        questionId: questionId,
        linkedQuestionId: dto.linkedQuestionId,
        textHTML: dto.textHTML,
      },
    });
  }

  /**
   * Updates a GroupReviewGate entity with the specified ID using the provided detailedGroupReviewGateDTO.
   *
   * @param id - The unique identifier of the GroupReviewGate to update.
   * @param dto - The data transfer object containing updated fields for the GroupReviewGate.
   * @returns A promise that resolves to the updated GroupReviewGate entity.
   */
  async update(id: number, dto: detailedGroupReviewGateDTO) {
    return this.prisma.groupReviewGate.update({
      where: { id },
      data: {
        linkedQuestionId: dto.linkedQuestionId,
        textHTML: dto.textHTML,
      },
    });
  }

  /**
   * Retrieves the latest group review statuses for all other members in the same group as the specified user,
   * for the linked question associated with the given question ID.
   *
   * @param questionId - The ID of the question for which to fetch group review statuses.
   * @param userId - The ID of the current user (whose group members' statuses are to be fetched).
   * @returns A promise that resolves to an array of `GroupReviewStatusDTO` objects, each representing the latest status of a group member.
   * @throws Error if the group review gate for the given question ID is not found.
   */
  async getStatuses(questionId: number, userId: number): Promise<GroupReviewStatusDTO[]> {
    // Check if the group review gate exists for the given questionId
    const groupReviewGate = await this.prisma.groupReviewGate.findUnique({
      where: { questionId },
      select: { linkedQuestionId: true }
    });

    if (!groupReviewGate) {
      throw new Error('GroupReviewGate not found');
    }

    // Find all other users in the same group (except the current user)
    const groupMembers = await this.prisma.userGroupMembership.findMany({
      where: {
        group: {
          UserGroupMembership: {
            some: {
              userId: userId
            }
          },
        },
        userId: {
          not: userId // Exclude the current user
        }
      },
      select: {
        userId: true
      },
    });

    const memberIds = groupMembers.map(member => member.userId);

    if (memberIds.length === 0) {
      return []; // No other members in the group
    }

    // Fetch the latest answers from all other group members for the linked question
    const allAnswers = await this.prisma.userUploadAnswer.findMany({
      where: {
        userAnswer: {
          userId: { in: memberIds },
          questionId: groupReviewGate.linkedQuestionId,
        },
      },
      include: {
        userAnswer: {
          select: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
              },
            },
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Reduce to get the latest answer for each user
    const latestAnswersByUser = allAnswers.reduce((acc, answer) => {
      const userId = answer.userAnswer.user.id;
      if (!acc[userId] || acc[userId].createdAt < answer.createdAt)
        acc[userId] = answer;
      return acc;
    }, {} as Record<number, typeof allAnswers[0]>);

    // Map to the desired DTO format // TODO: Make anonymous and get real data
    return Object.values(latestAnswersByUser).map(answer => ({
      submissionIdentifier: answer.userAnswer.user.firstname + ' ' + answer.userAnswer.user.lastname,
      reviewPhase: 'lorem phase',
      userStatus: 'lorem status',
    }));

  }
}
