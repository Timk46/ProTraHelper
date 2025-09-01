import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionCollectionDto } from '@DTOs/index';

@Injectable()
export class QuestionDataCollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async createCollection(collection: QuestionCollectionDto): Promise<boolean> {
    try {
      await this.prisma.questionCollection.createMany({
        data: collection.containedQuestionIds.map(id => ({
          questionId: collection.questionId,
          containedQuestionId: id,
        })),
      });
      return true;
    } catch (error) {
      console.error('Error creating collection:', error);
      return false;
    }
  }

  async getCollection(questionId: number): Promise<QuestionCollectionDto> {
    const collections = await this.prisma.questionCollection.findMany({
      where: {
        questionId,
      },
    });

    return {
      questionId,
      containedQuestionIds: collections.map(c => c.containedQuestionId),
    };
  }

  async updateCollection(collection: QuestionCollectionDto): Promise<boolean> {
    try {
      await this.prisma.questionCollection.deleteMany({
        where: {
          questionId: collection.questionId,
        },
      });
      await this.prisma.questionCollection.createMany({
        data: collection.containedQuestionIds.map(id => ({
          questionId: collection.questionId,
          containedQuestionId: id,
        })),
      });
      return true;
    } catch (error) {
      console.error('Error updating collection:', error);
      return false;
    }
  }

  async deleteCollection(questionId: number): Promise<boolean> {
    try {
      await this.prisma.questionCollection.deleteMany({
        where: {
          questionId,
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting collection:', error);
      return false;
    }
  }
}
