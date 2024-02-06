/* eslint-disable prettier/prettier */
// content.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ContentsForConceptDTO, ContentElementDTO } from '@Interfaces/index';
import { ContentElementStatusDTO } from '@DTOs/index';
import { last } from 'rxjs';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}
  /**
   * Get Contents by Concept Node ID
   *
   * Retrieves all contents associated with a particular concept node by trainedBy and requiredBy relations.
   *
   * @param {number} conceptNodeId The ID of the concept node
   *
   * @returns {Promise<ContentsForConceptDTO>} A promise that resolves to ContentsForConceptDTO - an object with two arrays of ContentDTO objects. One for the requiredBy and one for trainedBy relations.
   *
   * @throws Will throw an error if the concept node is not found.
   *
   */
  async getContentsByConceptNode(
    conceptNodeId: number,
  ): Promise<ContentsForConceptDTO> {
    const conceptNode = await this.prisma.conceptNode.findUnique({
      where: { id: Number(conceptNodeId) },
      include: {
        requiredBy: {
          select: {
            contentNode: {
              include: {
                prerequisites: true,
                successors: true,
                requires: true,
                trains: true,
                contentElements: {
                  include: {
                    file: true,
                  },
                },
              },
            },
          },
        },
        trainedBy: {
          select: {
            contentNode: {
              include: {
                prerequisites: true,
                successors: true,
                requires: true,
                trains: true,
                contentElements: {
                  include: {
                    file: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!conceptNode) {
      throw new Error('ConceptNode not found');
    }

    // Transform the 'requiredBy' relations into ContentDTO[] format.
    const requiredBy = conceptNode.requiredBy.map((requiredBy) => ({
      contentNodeId: requiredBy.contentNode.id,
      name: requiredBy.contentNode.name,
      description: requiredBy.contentNode.description,
      contentElements: requiredBy.contentNode
        .contentElements as unknown as ContentElementDTO[], //enum problem
      contentPrerequisiteIds: requiredBy.contentNode.prerequisites.map(
        (p) => p.prerequisiteId,
      ),
      contentSuccessorIds: requiredBy.contentNode.successors.map(
        (s) => s.successorId,
      ),
      requiresConceptIds: requiredBy.contentNode.requires.map(
        (r) => r.conceptNodeId,
      ),
      trainsConceptIds: requiredBy.contentNode.trains.map(
        (t) => t.conceptNodeId,
      ),
    }));

    // Transform the 'trainedBy' relations into ContentDTO[] format.
    const trainedBy = conceptNode.trainedBy.map((trainedBy) => ({
      contentNodeId: trainedBy.contentNode.id,
      name: trainedBy.contentNode.name,
      description: trainedBy.contentNode.description,
      contentElements: trainedBy.contentNode
        .contentElements as unknown as ContentElementDTO[], //enum problem
      contentPrerequisiteIds: trainedBy.contentNode.prerequisites.map(
        (p) => p.prerequisiteId,
      ),
      contentSuccessorIds: trainedBy.contentNode.successors.map(
        (s) => s.successorId,
      ),
      requiresConceptIds: trainedBy.contentNode.requires.map(
        (r) => r.conceptNodeId,
      ),
      trainsConceptIds: trainedBy.contentNode.trains.map(
        (t) => t.conceptNodeId,
      ),
    }));

    // Return the transformed content.
    return { trainedBy: trainedBy, requiredBy: requiredBy };
  }

  /**
   * Get Content Element Status
   *
   * Retrieves the completion status of a content element for a specific user.
   * @param {number} contentElementId The ID of the content element
   * @returns {Promise<ContentElementStatusDTO>} A promise that resolves to ContentElementStatusDTO - the status of the content element.
   *
   */
  async getContentElementStatus(
    contentElementId: number,
    userId: number,
  ): Promise<ContentElementStatusDTO> {
    const contentElementStatus =
      await this.prisma.userContentElementProgress.findFirst({
        where: {
          contentElementId: contentElementId,
          userId: userId,
        },
        select: {
          contentElementId: true,
          markedAsDone: true,
          markedAsQuestion: true,
        },
      });

    if (!contentElementStatus) {
      return {
        contentElementId: contentElementId,
        userStatusCompleted: false,
        userStatusQuestion: false,
      };
    }

    return {
      contentElementId: contentElementStatus.contentElementId,
      userStatusCompleted: contentElementStatus.markedAsDone,
      userStatusQuestion: contentElementStatus.markedAsQuestion,
    };
  }

  /**
   * Toggle Content Element Status
   *
   * Toggles the completion status of a content element for a specific user.
   * @param {number} contentElementId The ID of the content element
   * @returns {Promise<boolean>} A promise that resolves to a boolean.
   *
   */
  async toggleCheckmark(
    contentElementId: number,
    userId: number,
  ): Promise<boolean> {
    //get checkmark status
    let checkmarkStatus =
      await this.prisma.userContentElementProgress.findFirst({
        where: {
          contentElementId: contentElementId,
          userId: userId,
        },
        select: {
          id: true,
          markedAsDone: true,
        },
      });

    if (!checkmarkStatus) {
      //create new entry in userContentProgress if not exists
      checkmarkStatus = await this.prisma.userContentElementProgress.create({
        data: {
          markedAsDone: false,
          markedAsQuestion: false,
          contentElementId: contentElementId,
          userId: userId,
        },
      });
    }

    //toggle checkmark status
    await this.prisma.userContentElementProgress.update({
      where: {
        id: checkmarkStatus.id,
      },
      data: {
        markedAsDone: !checkmarkStatus.markedAsDone,
      },
    });

    return !checkmarkStatus.markedAsDone;
  }

  /**
   * Toggle Content Element Status
   *
   * Toggles the completion status of a content element for a specific user.
   * @param {number} contentElementId The ID of the content element
   * @returns {Promise<boolean>} A promise that resolves to a boolean.
   *
   */
  async toggleQuestionmark(
    contentElementId: number,
    userId: number,
  ): Promise<boolean> {
    //get checkmark status
    let questionmarkStatus =
      await this.prisma.userContentElementProgress.findFirst({
        where: {
          contentElementId: contentElementId,
          userId: userId,
        },
        select: {
          id: true,
          markedAsQuestion: true,
        },
      });

    if (!questionmarkStatus) {
      //create new entry in userContentProgress if not exists
      questionmarkStatus = await this.prisma.userContentElementProgress.create({
        data: {
          markedAsDone: false,
          markedAsQuestion: false,
          contentElementId: contentElementId,
          userId: userId,
        },
      });
    }

    //toggle checkmark status
    await this.prisma.userContentElementProgress.update({
      where: {
        id: questionmarkStatus.id,
      },
      data: {
        markedAsQuestion: !questionmarkStatus.markedAsQuestion,
      },
    });

    return !questionmarkStatus.markedAsQuestion;
  }

  /**
   * Update Last Opened Data
   *
   * Updates the lastOpened field of a content element for a specific user.
   * @param {number} contentElementId The ID of the content element
   * @returns {Promise<Date>} A promise that resolves to void.
   *
   */
  async updateLastOpenedDate(
    contentNodeId: number,
    userId: number,
  ): Promise<Date> {
    let lastOpenedDate = await this.prisma.userContentView.findFirst({
      where: {
        contentNodeId: contentNodeId,
        userId: userId,
      },
      select: {
        id: true,
        lastOpened: true,
      },
    });

    if (!lastOpenedDate) {
      lastOpenedDate = await this.prisma.userContentView.create({
        data: {
          userId: userId,
          contentNodeId: contentNodeId,
          lastOpened: new Date(),
        },
      });
    }

    await this.prisma.userContentView.update({
      where: {
        id: lastOpenedDate.id,
      },
      data: {
        lastOpened: new Date(),
      },
    });

    return lastOpenedDate.lastOpened;
  }

    async fetchAllConcepts(): Promise<string[]> {
    const concepts = await this.prisma.conceptNode.findMany({
      select: {
        name: true,
      },
    });
    const allConcepts = concepts.map((concept) => concept.name as string);
    Array.from(new Set(allConcepts)).find((concept) => concept === "root") ? allConcepts.splice(allConcepts.indexOf("root"), 1) : null;
    console.log("all concepts here: ", allConcepts)
    return Array.from(new Set(allConcepts));
  }
}
