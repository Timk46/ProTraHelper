// content.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ContentDTO, ContentElementDTO } from '@Interfaces/index';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}
  /**
   * Get Content by Concept Node ID
   *
   * Retrieves all the content associated with a particular concept node.
   *
   * @param {number} conceptNodeId - The ID of the concept node
   *
   * @returns {Promise<ContentDTO[]>} - A promise that resolves to an array of ContentDTO objects.
   *
   * @throws Will throw an error if the concept node is not found.
   *
   */
  async getContentByConceptNode(conceptNodeId: number): Promise<ContentDTO[]> {
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
                contentElements: true,
              },
            },
          },
        },
      },
    });

    if (!conceptNode) {
      throw new Error('ConceptNode not found');
    }

    return conceptNode.requiredBy.map((requirement) => ({
      contentNodeId: requirement.contentNode.id,
      name: requirement.contentNode.name,
      description: requirement.contentNode.description,
      contentElements: requirement.contentNode.contentElements as unknown as ContentElementDTO[], //enum problem
      contentPrerequisiteIds: requirement.contentNode.prerequisites.map((p) => p.prerequisiteId),
      contentSuccessorIds: requirement.contentNode.successors.map((s) => s.successorId),
      requiresConceptIds: requirement.contentNode.requires.map((r) => r.conceptNodeId),
      trainsConceptIds: requirement.contentNode.trains.map((t) => t.conceptNodeId),
    }));
  }
}
