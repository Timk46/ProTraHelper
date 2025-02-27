/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { userConceptEventType } from '@prisma/client';
import e from 'express';
import { NotificationService } from '@/notification/notification.service';
import { NotificationDTO } from '@Interfaces/notification.dto';

@Injectable()
export class UserConceptService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService) {}

  /**
   * Gets the maximum level from training content for a given concept node
   * @param conceptNodeId - The ID of the concept node to check
   * @returns The maximum level found in training content, or 0 if no training content exists
   */
  async getMaxTrainingLevel(conceptNodeId: number): Promise<number> {
    const training = await this.prisma.training.findMany({
      where: {
        conceptNodeId: conceptNodeId,
      },
      select: {
        awards: true,
      },
    });

    if (!training || training.length === 0) {
      return 0;
    }

    // Filter out null awards and find maximum
    const levels = training
      .map(t => t.awards)
      .filter(award => award !== null) as number[];

    return levels.length > 0 ? Math.max(...levels) : 0;
  }

  /**
   * updates the user level of a concept node and saves a timestamped event
   * @param userId
   * @param conceptNodeId
   * @param level
   * @returns the updated/created userConcept
   */
  async updateUserLevel(
    userId: number,
    conceptNodeId: number,
    level: number,
  ): Promise<any> {
    // check if userConcept already exists
    let userConcept = await this.prisma.userConcept.findFirst({
      where: {
        conceptNodeId: conceptNodeId,
        userId: userId,
      },
    });

    // if the userConcept does not exist, create it
    if (userConcept === null) {
      userConcept = await this.prisma.userConcept.create({
        data: {
          concept: {
            connect: {
              id: conceptNodeId,
            },
          },
          user: {
            connect: {
              id: userId,
            },
          },
          expanded: false,
          level: level,
        },
      });
    } else {
      if (userConcept.level < level) {
        userConcept = await this.prisma.userConcept.update({
          where: {
            id: userConcept.id,
          },
          data: {
            level: level,
          },
        });
      }
      // create a userConceptEvent
      await this.prisma.userConceptEvent.create({
        data: {
          userConcept: {
            connect: {
              id: userConcept.id,
            },
          },
          level: level,
          eventType: userConceptEventType.LEVEL_CHANGE,
        },
      });
    }
    return userConcept;
  }

  /**
   * Checks if a user should be awarded a concept level (which will be used to display progress in the graph)
   * @param userId - The ID of the user
   * @param contentElementId - The ID of the content element being checked
   * @param conceptNodeId - The ID of the concept node
   * @param level - The level to potentially award
   * @returns A tuple containing [boolean indicating if level was awarded, the level]
   */
  async checkUserConceptLevelAward(
    userId: number,
    contentElementId: number,
    conceptNodeId: number,
    level: number,
  ): Promise<[boolean, number]> {
    let levelAward = false;
    let userConcept = await this.prisma.userConcept.findFirst({
      where: {
        conceptNodeId: conceptNodeId,
        userId: userId,
      },
    });

    if (!userConcept) {
      userConcept = await this.prisma.userConcept.create({
        data: {
          concept: {
            connect: {
              id: conceptNodeId,
            },
          },
          user: {
            connect: {
              id: userId,
            },
          },
          expanded: false,
          level: 0,
        },
      });
    }

    if (userConcept.level < level) {
      const conceptNode = await this.prisma.conceptNode.findFirst({
        where: {
          id: conceptNodeId,
        },
        select: {
          trainedBy: {
            select: {
              contentNode: {
                include: {
                  ContentView: {
                    include: {
                      contentElement: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const maxTrainingLevel = await this.getMaxTrainingLevel(conceptNodeId);
      console.log('max training level: ' + maxTrainingLevel);

      for (const contentNode of conceptNode.trainedBy) {
        // Check if all QUESTION type content elements are marked as done
        let allQuestionsCompleted = true;
        for (const contentView of contentNode.contentNode.ContentView) {
          const contentElement = contentView.contentElement;

          // Only check elements of type QUESTION (PDF and VIDEO will be ignored)
          if (contentElement.type === 'QUESTION') {
            const userContentElement = await this.prisma.userContentElementProgress.findFirst({
              where: {
                userId: userId,
                contentElementId: contentElement.id,
              },
            });

            if (!userContentElement || !userContentElement.markedAsDone) {
              console.log('question content element not done: ' + contentElement.id);
              allQuestionsCompleted = false;
              break;
            }
          }
        }

        if (allQuestionsCompleted) {
          levelAward = true;
          console.log('update user level to ' + maxTrainingLevel);
          await this.updateUserLevel(userId, conceptNodeId, maxTrainingLevel);
          break;
        }
      }
    }

    return [levelAward, level];
  }

  /**
   * updates the user's concept expansion state and saves a timestamped event
   * @param userId
   * @param conceptNodeId
   * @param expanded
   * @returns the updated/created userConcept
   */
  async updateUserConceptExpansionState(
    userId: number,
    conceptNodeId: number,
    expanded: boolean,
  ): Promise<any> {
    let userConcept = await this.prisma.userConcept.findFirst({
      where: {
        conceptNodeId: conceptNodeId,
        userId: userId,
      },
    });

    // if the userConcept does not exist, create it
    if (userConcept === null) {
      userConcept = await this.prisma.userConcept.create({
        data: {
          concept: {
            connect: {
              id: conceptNodeId,
            },
          },
          user: {
            connect: {
              id: userId,
            },
          },
          expanded: expanded,
          level: 0,
        },
      });
    }

    // if the userConcept exists, update it
    else {
      userConcept = await this.prisma.userConcept.update({
        where: { id: userConcept.id },
        data: {
          expanded: expanded,
        },
      });
    }

    // create a userConceptEvent
    await this.prisma.userConceptEvent.create({
      data: {
        userConcept: {
          connect: {
            id: userConcept.id,
          },
        },
        level: userConcept.level,
        eventType: expanded
          ? userConceptEventType.EXPANDED
          : userConceptEventType.COLLAPSED,
      },
    });
    return userConcept;
  }

  /**
   * stores the currently selected concept node of a user and saves a timestamped event
   * @param userId
   * @param conceptNodeId
   */
  async updateSelectedConcept(
    userId: number,
    conceptNodeId: number,
  ): Promise<any> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentConcept: {
          connect: {
            id: conceptNodeId,
          },
        },
      },
    });

    // to save the select event the userConcept is needed
    let userConcept = await this.prisma.userConcept.findFirst({
      where: {
        conceptNodeId: conceptNodeId,
        userId: userId,
      },
    });

    // if the userConcept does not exist, create it
    if (userConcept === null) {
      userConcept = await this.prisma.userConcept.create({
        data: {
          concept: {
            connect: {
              id: conceptNodeId,
            },
          },
          user: {
            connect: {
              id: userId,
            },
          },
          expanded: false,
          level: 0,
        },
      });
    }

    // create a userConceptEvent
    await this.prisma.userConceptEvent.create({
      data: {
        userConcept: {
          connect: {
            id: userConcept.id,
          },
        },
        level: userConcept.level,
        eventType: userConceptEventType.SELECTED,
      },
    });
  }
}
