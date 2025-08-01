import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { detailedGroupReviewGateDTO, GroupReviewStatusDTO } from '@DTOs/detailedQuestion.dto';

@Injectable()
export class QuestionDataGroupReviewGateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(questionId: number, dto: detailedGroupReviewGateDTO) {
    return this.prisma.groupReviewGate.create({
      data: {
        questionId: questionId,
        linkedQuestionId: dto.linkedQuestionId,
        textHTML: dto.textHTML,
      },
    });
  }

  async update(id: number, dto: detailedGroupReviewGateDTO) {
    return this.prisma.groupReviewGate.update({
      where: { id },
      data: {
        linkedQuestionId: dto.linkedQuestionId,
        textHTML: dto.textHTML,
      },
    });
  }

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
