// content.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ContentsForConceptDTO, ContentElementDTO } from '@Interfaces/index';

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
  async getContentsByConceptNode(conceptNodeId: number): Promise<ContentsForConceptDTO> {
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
      contentElements: requiredBy.contentNode.contentElements as unknown as ContentElementDTO[], //enum problem
      contentPrerequisiteIds: requiredBy.contentNode.prerequisites.map((p) => p.prerequisiteId),
      contentSuccessorIds: requiredBy.contentNode.successors.map((s) => s.successorId),
      requiresConceptIds: requiredBy.contentNode.requires.map((r) => r.conceptNodeId),
      trainsConceptIds: requiredBy.contentNode.trains.map((t) => t.conceptNodeId),
    }))

    // Transform the 'trainedBy' relations into ContentDTO[] format.
    const trainedBy = conceptNode.trainedBy.map((trainedBy) => ({
      contentNodeId: trainedBy.contentNode.id,
      name: trainedBy.contentNode.name,
      description: trainedBy.contentNode.description,
      contentElements: trainedBy.contentNode.contentElements as unknown as ContentElementDTO[], //enum problem
      contentPrerequisiteIds: trainedBy.contentNode.prerequisites.map((p) => p.prerequisiteId),
      contentSuccessorIds: trainedBy.contentNode.successors.map((s) => s.successorId),
      requiresConceptIds: trainedBy.contentNode.requires.map((r) => r.conceptNodeId),
      trainsConceptIds: trainedBy.contentNode.trains.map((t) => t.conceptNodeId),
    }))

    // Return the transformed content.
    return {trainedBy: trainedBy, requiredBy: requiredBy};
  }
}
