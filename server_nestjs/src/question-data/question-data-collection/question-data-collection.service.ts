import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  detailedQuestionCollectionDTO,
  LinkedCollectionContentElementDto,
  QuestionCollectionDto,
  questionType,
} from '@DTOs/index';
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

  async getRelatedCollection(
    questionId: number,
    contentNodeId: number,
    userId: number,
  ): Promise<QuestionCollectionDto> {
    /* const collection = await this.prisma.questionCollection.findUnique({
      where: {
        questionId,
      },
      include: {
        links: true,
      },
    }); */

    const linkedElements = await this.prisma.questionCollectionLink.findMany({
      where: {
        questionCollection: {
          questionId: questionId,
        },
      },
      select: {
        linkedContentElement: {
          select: {
            id: true,
            UserContentProgress: {
              where: {
                userId: userId,
              },
              select: {
                markedAsDone: true,
              },
            },
            ContentView: {
              where: {
                contentNodeId: contentNodeId,
              },
              select: {
                position: true,
                isVisible: true,
              },
              take: 1, // Pretend that a content element has no duplicates inside the content node
            },
            question: {
              select: {
                id: true,
                type: true,
                userAnswer: {
                  where: {
                    userId: userId,
                  },
                  select: {
                    feedbacks: {
                      select: {
                        score: true,
                      },
                      orderBy: {
                        score: 'desc',
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const processedElements: LinkedCollectionContentElementDto[] = linkedElements.map(element => {
      const contentElement = element.linkedContentElement;
      const bestScore =
        contentElement.question?.userAnswer.reduce((maxScore, answer) => {
          const answerScore = answer.feedbacks[0]?.score || 0;
          return Math.max(maxScore, answerScore);
        }, 0) || 0;

      return {
        id: contentElement.id,
        questionId: contentElement.question?.id || undefined,
        questionType: (contentElement.question?.type as questionType) || undefined,
        markedAsDone: contentElement.UserContentProgress[0]?.markedAsDone || false,
        userProgress: bestScore,
        position: contentElement.ContentView[0]?.position || 0,
        isVisible: contentElement.ContentView[0]?.isVisible || false,
      };
    });

    return {
      questionId,
      linkedContentElements: processedElements,
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
