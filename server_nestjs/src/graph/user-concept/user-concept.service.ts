import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { userConceptEventType } from '@prisma/client';
import e from 'express';

@Injectable()
export class UserConceptService {
  constructor(private prisma: PrismaService) {}

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

        for (const contentNode of conceptNode.trainedBy) {
          for (const contentView of contentNode.contentNode.ContentView) {
            if (contentView.contentElement.id === contentElementId) {
              console.log(
                'content element found: ' + contentView.contentElement.id,
              );
              break;
            }
          }
          //schaue in user content element progress nach, ob alle content elemente erledigt sind
          let allContentElementsDone = true;
          for (const contentView of contentNode.contentNode.ContentView) {
            const contentElement = contentView.contentElement;
            const userContentElement =
              await this.prisma.userContentElementProgress.findFirst({
                where: {
                  userId: userId,
                  contentElementId: contentElement.id,
                },
              });
            if (userContentElement === null) {
              console.log('content element not found: ' + contentElement.id);
              allContentElementsDone = false;
              break;
            }
            if (!userContentElement.markedAsDone) {
              console.log('content element not done: ' + contentElement.id);
              allContentElementsDone = false;
              break;
            }
          }
          if (allContentElementsDone) {
            levelAward = true;
            console.log('update user level on ' + level);
            await this.updateUserLevel(userId, conceptNodeId, level);
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
