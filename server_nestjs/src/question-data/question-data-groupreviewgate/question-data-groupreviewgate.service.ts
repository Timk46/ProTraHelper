import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { detailedGroupReviewGateDTO, GroupReviewStatusDTO } from '@DTOs/detailedQuestion.dto';
import { EvaluationCategoryDTO, GroupReviewGateCategoriesDTO } from '../../../../shared/dtos';

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
        linkedCategories:
          dto.linkedCategories && dto.linkedCategories.linkedCategoryIds.length > 0
            ? JSON.stringify(dto.linkedCategories)
            : undefined,
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
      select: {
        id: true,
        linkedQuestionId: true,
      },
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
              userId: userId,
            },
          },
        },
        userId: {
          not: userId, // Exclude the current user
        },
      },
      select: {
        userId: true,
      },
    });

    const memberIds = groupMembers.map(member => member.userId);

    if (memberIds.length === 0) {
      return []; // No other members in the group
    }

    // Find evaluation submissions for the linked question by these group members
    const availableSubmissions = await this.prisma.evaluationSubmission.findMany({
      where: {
        session: {
          groupReviewGateId: groupReviewGate.id,
        },
        authorId: {
          in: memberIds,
        },
      },
    });

    // Map to the desired DTO format // TODO: Detect User Status
    return availableSubmissions.map(submission => ({
      submissionId: submission.id,
      reviewPhase: submission.phase,
      userStatus: '🦆',
    }));
  }

  async getAllEvalDiscussionCategories(): Promise<EvaluationCategoryDTO[] | null> {
    const categories = await this.prisma.evaluationCategory.findMany();

    if (!categories) {
      return null;
    }

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      displayName: category.displayName || '',
      description: category.description || '',
      shortDescription: category.shortDescription || '',
      icon: category.icon || '',
      color: category.color || '',
    }));
  }

  /**
   * Creates a new evaluation category in the database.
   *
   * @param categoryData - The data for the new category (without id)
   * @returns A promise that resolves to the created EvaluationCategoryDTO
   */
  async createEvaluationCategory(
    categoryData: Omit<EvaluationCategoryDTO, 'id'>,
  ): Promise<EvaluationCategoryDTO> {
    const newCategory = await this.prisma.evaluationCategory.create({
      data: {
        name: categoryData.name,
        displayName: categoryData.displayName,
        description: categoryData.description,
        shortDescription: categoryData.shortDescription,
        icon: categoryData.icon,
        color: categoryData.color,
      },
    });

    return {
      id: newCategory.id,
      name: newCategory.name,
      displayName: newCategory.displayName || '',
      description: newCategory.description || '',
      shortDescription: newCategory.shortDescription || '',
      icon: newCategory.icon || '',
      color: newCategory.color || '',
    };
  }

  // Currently not used - handled in update method
  /* async linkCategoriesToGroupReviewGate(gateId: number, data: GroupReviewGateCategoriesDTO): Promise<boolean> {
    const update = await this.prisma.groupReviewGate.update({
      where: { id: gateId },
      data: {
        linkedCategories: data.linkedCategoryIds.length > 0 ? JSON.stringify(data) : null,
      },
    });
    return update ? true : false;
  } */
}