/* eslint-disable prettier/prettier */
// content.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import {
  ContentsForConceptDTO,
  ContentElementDTO,
  ContentViewDTO,
  ContentDTO,
} from '@Interfaces/index';
import { ContentElementStatusDTO } from '@DTOs/index';
import { last } from 'rxjs';
import { tr } from '@faker-js/faker';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all contents associated with a particular concept node by trainedBy and requiredBy relations.
   *
   * @param {number} conceptNodeId The ID of the concept node
   *
   * @returns {Promise<ContentsForConceptDTO>} A promise that resolves to ContentsForConceptDTO - an object with two arrays of ContentDTO objects. One for the requiredBy and one for trainedBy relations.
   *
   */
  async getContentsByConceptNode(
    conceptNodeId: number,
    userId: number,
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
                ContentView: {
                  include: {
                    contentElement: {
                      include: {
                        file: true,
                        question: true,
                      },
                    },
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
                ContentView: {
                  include: {
                    contentElement: {
                      include: {
                        file: true,
                        question: true,
                      },
                    },
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

    const userStatus = await this.prisma.userContentElementProgress.findMany({
      where: {
        userId: userId,
      },
      select: {
        contentElementId: true,
        markedAsDone: true,
        markedAsQuestion: true,
      },
    });

    const getProgress = (contentNode) => {
      //Count the number of content elements marked as done
      let number = 0;

      const total = contentNode.ContentView.length;
      if (total === 0) {
        return 0;
      } else {
        for (const contentView of contentNode.ContentView) {
          //TODO: if contentElement is of type task add progress of tasks
          for (const status of userStatus) {
            if (status.contentElementId === contentView.contentElement.id) {
              if (status.markedAsDone) {
                number++;
              }
            }
          }
        }
        return (number / total) * 100;
      }
    };

    const getAttemptsForQuestion = async (question_id) => {
      return await this.prisma.userAnswer.count({
        where: {
            questionId: question_id,
            userId: userId,
        },
      });
    }

    const transformContentNode = (contentNode) => ({
      contentNodeId: contentNode.id,
      name: contentNode.name,
      description: contentNode.description,
      contentElements: contentNode.ContentView.map(
        (contentView: ContentViewDTO) => ({
          id: contentView.contentElement.id,
          type: contentView.contentElement.type,
          positionInSpecificContentView: contentView.position, // position in the specific content view
          title: contentView.contentElement.title,
          text: contentView.contentElement.text,
          file: contentView.contentElement.file,
          question: contentView.contentElement.question ? {
            id: contentView.contentElement.question.id,
            name: contentView.contentElement.question.name,
            description: contentView.contentElement.question.description,
            type: contentView.contentElement.question.type,
            level: contentView.contentElement.question.level,
            progress: 50,
          } : null,
        }),
      ),
      contentPrerequisiteIds: contentNode.prerequisites.map(
        (p) => p.prerequisiteId,
      ),
      contentSuccessorIds: contentNode.successors.map((s) => s.successorId),
      requiresConceptIds: contentNode.requires.map((r) => r.conceptNodeId),
      trainsConceptIds: contentNode.trains.map((t) => t.conceptNodeId),
      progress: getProgress(contentNode),
      questionMarked: contentNode.ContentView.some(
        (contentView: ContentViewDTO) =>
          userStatus.some(
            (status) =>
              status.contentElementId === contentView.contentElement.id &&
              status.markedAsQuestion,
          ),
      ),
    });

    const requiredBy: ContentDTO[] = conceptNode.requiredBy.map((requiredBy) =>
      transformContentNode(requiredBy.contentNode),
    );
    const trainedBy: ContentDTO[] = conceptNode.trainedBy.map((trainedBy) =>
      transformContentNode(trainedBy.contentNode),
    );
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

  async fetchAllConceptNames(): Promise<string[]> {
    const concepts = await this.prisma.conceptNode.findMany({
      select: {
        name: true,
      },
    });
    const allConcepts = concepts.map((concept) => concept.name as string);
    Array.from(new Set(allConcepts)).find((concept) => concept === 'root')
      ? allConcepts.splice(allConcepts.indexOf('root'), 1)
      : null;
    return Array.from(new Set(allConcepts));
  }

}

/*
  //get the attemt count and the progress for each question id by looking at the user_answer table
        //get the attempt count for the question
        let attemptCount = await this.prisma.userAnswer.count({
          where: {
              questionId: question.id,
              userId: user_id,
          },
      });

      //get the best user score for each question
      let userAnswers = await this.prisma.userAnswer.findMany({
          where: {
              questionId: question.id,
              userId: user_id,
          },
          select: {
              id: true,
          }
      });

      let bestScore = 0;
      if(userAnswers) {
          for(let userAnswer of userAnswers) {
              let feedback = await this.prisma.feedback.findUnique({
                  where: {
                      id: userAnswer.id,
                  },
                  select: {
                      score: true,
                  }
              });
              if(feedback.score > bestScore) {
                  bestScore = feedback.score;
              }
          }
      }

      let progress = (bestScore / question.score)*100;
*/