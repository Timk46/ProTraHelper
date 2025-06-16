import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HighlightConceptsService {
  constructor(private prisma: PrismaService) {}

  async getHighlightConcepts(moduleId: number) {
    return this.prisma.moduleHighlightConcepts.findMany({
      where: { moduleId },
      include: { conceptNode: true },
      orderBy: { position: 'asc' }
    });
  }

  async getHighlightConcept(id: number) {
    return this.prisma.moduleHighlightConcepts.findUnique({
      where: { id },
      include: { conceptNode: true }
    });
  }

  async createHighlightConcept(data: {
    moduleId: number;
    conceptNodeId: number;
    alias?: string;
    description?: string;
    pictureData?: string;
    position?: number;
    isUnlocked?: boolean;
  }) {
    return this.prisma.moduleHighlightConcepts.create({
      data,
      include: { conceptNode: true }
    });
  }

  async updateHighlightConcept(
    id: number,
    data: {
      alias?: string;
      description?: string;
      pictureData?: string;
      position?: number;
      isUnlocked?: boolean;
    }
  ) {
    return this.prisma.moduleHighlightConcepts.update({
      where: { id },
      data,
      include: { conceptNode: true }
    });
  }

  async deleteHighlightConcept(id: number) {
    return this.prisma.moduleHighlightConcepts.delete({
      where: { id }
    });
  }
}
