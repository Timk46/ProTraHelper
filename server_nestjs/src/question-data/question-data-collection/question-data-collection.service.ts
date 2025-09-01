import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { detailedQuestionCollectionDTO, QuestionCollectionDto } from '@DTOs/index';
import { connect } from 'node:http2';

@Injectable()
export class QuestionDataCollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async createCollection(
    collection: detailedQuestionCollectionDTO,
    questionId: number,
  ): Promise<boolean> {
    try {
      const newCollection = await this.prisma.questionCollection.create({
        data: {
          question: { connect: { id: questionId } },
          textHTML: collection.textHTML,
        },
      });

      await this.prisma.questionCollectionLink.createMany({
        data: collection.links.map(link => ({
          questionCollectionId: newCollection.id,
          linkedContentElementId: link.linkedContentElementId,
        })),
      });

      return true;
    } catch (error) {
      console.error('Error creating collection:', error);
      return false;
    }
  }

  async getCollection(questionId: number): Promise<QuestionCollectionDto> {
    const collection = await this.prisma.questionCollection.findUnique({
      where: {
        questionId,
      },
      include: {
        links: true,
      },
    });

    return {
      questionId,
      linkedContentElementIds: collection?.links.map(c => c.linkedContentElementId) || [],
    };
  }

  async updateCollection(collection: detailedQuestionCollectionDTO): Promise<boolean> {
    try {
      const existingCollection = await this.prisma.questionCollection.findUnique({
        where: {
          id: collection.id,
        },
      });

      await this.prisma.questionCollection.update({
        where: {
          id: collection.id,
        },
        data: {
          textHTML: collection.textHTML,
        },
      });

      await this.prisma.questionCollectionLink.deleteMany({
        where: {
          questionCollectionId: collection.id,
        },
      });

      await this.prisma.questionCollectionLink.createMany({
        data: collection.links.map(link => ({
          questionCollectionId: collection.id,
          linkedContentElementId: link.linkedContentElementId,
        })),
      });
      return true;
    } catch (error) {
      console.error('Error updating collection:', error);
      return false;
    }
  }

  async deleteCollection(questionCollectionId: number): Promise<boolean> {
    try {
      await this.prisma.questionCollection.deleteMany({
        where: {
          id: questionCollectionId,
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting collection:', error);
      return false;
    }
  }
}
