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
      console.log(`[UserConceptService] Creating UserConcept for user ${userId}, concept ${conceptNodeId} with level ${level}`);
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
      // Create event only if created or level actually changed
      await this.prisma.userConceptEvent.create({
        data: {
          userConcept: { connect: { id: userConcept.id } },
          level: level,
          eventType: userConceptEventType.LEVEL_CHANGE,
        },
      });
    } else {
      // Only update and create event if the level is actually higher
      if (userConcept.level < level) {
        console.log(`[UserConceptService] Updating UserConcept for user ${userId}, concept ${conceptNodeId} from ${userConcept.level} to ${level}`);
        userConcept = await this.prisma.userConcept.update({
          where: {
            id: userConcept.id,
          },
          data: {
            level: level,
          },
        });
        // create a userConceptEvent
        await this.prisma.userConceptEvent.create({
          data: {
            userConcept: {
              connect: {
                id: userConcept.id,
              },
            },
            level: level, // Log the new level
            eventType: userConceptEventType.LEVEL_CHANGE,
          },
        });
      } else {
         console.log(`[UserConceptService] No level update needed for user ${userId}, concept ${conceptNodeId}. Current: ${userConcept.level}, Proposed: ${level}`);
      }
    }
    return userConcept;
  }

  /**
   * Checks if a user should be awarded a concept level based on completed content nodes.
   * Awards the highest level achieved across all fully completed linked content nodes.
   * @param userId - The ID of the user
   * @param _contentElementId - (Unused) The ID of the content element that triggered the check
   * @param conceptNodeId - The ID of the concept node
   * @param _level - (Unused) The level associated with the triggering content element
   * @returns A tuple containing [boolean indicating if a level update occurred, the new highest achieved level for the concept]
   */
  async checkUserConceptLevelAward(
    userId: number,
    _contentElementId: number, // Marked as unused
    conceptNodeId: number,
    _level: number, // Marked as unused
  ): Promise<[boolean, number]> {
    console.log(`[checkUserConceptLevelAward] Checking level award for user ${userId}, concept ${conceptNodeId}`);
    let userConcept = await this.prisma.userConcept.findFirst({
      where: {
        conceptNodeId: conceptNodeId,
        userId: userId,
      },
    });

    // Create UserConcept if it doesn't exist
    if (!userConcept) {
       console.log(`[checkUserConceptLevelAward] UserConcept not found, creating with level 0.`);
      userConcept = await this.prisma.userConcept.create({
        data: {
          concept: { connect: { id: conceptNodeId } },
          user: { connect: { id: userId } },
          expanded: false,
          level: 0,
        },
      });
    }
     console.log(`[checkUserConceptLevelAward] Current user level: ${userConcept.level}`);

    // Determine the highest level the user *should* have based on completed content nodes
    let highestLevelAchieved = 0;
    let anyContentNodeCompleted = false;

    // Corrected Prisma Query Structure
    const conceptNodeData = await this.prisma.conceptNode.findFirst({
        where: {
            id: conceptNodeId,
        },
        select: {
            name: true, // For logging
            trainedBy: { // Select the 'trainedBy' relation (Training records)
                select: {
                    awards: true, // Select the 'awards' field from Training
                    contentNode: { // Select the related 'contentNode'
                        select: {
                            id: true, // Select 'id' from ContentNode
                            // title: true, // REMOVED: Invalid selection here
                            ContentView: { // Select the related 'ContentView'
                                select: {
                                    contentElement: { // Select the related 'contentElement'
                                        select: {
                                            id: true, // Select 'id' from ContentElement
                                            type: true, // Select 'type' from ContentElement
                                            title: true // Select 'title' from ContentElement for logging
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });


    if (!conceptNodeData || !conceptNodeData.trainedBy) {
      console.error(`[checkUserConceptLevelAward] ConceptNode with ID ${conceptNodeId} not found or has no training links.`);
      return [false, userConcept.level]; // Return current state if no training links
    }
     console.log(`[checkUserConceptLevelAward] ConceptNode: ${conceptNodeData.name} (ID: ${conceptNodeId})`);

    // Iterate through each Training record (and its linked ContentNode)
    for (const trainingRecord of conceptNodeData.trainedBy) {
       // Access title via contentNode relation if needed for logging (handle potential null)
       // const contentNodeTitle = trainingRecord.contentNode?.title ?? 'N/A'; // Title is not directly available here due to select structure
       console.log(`[checkUserConceptLevelAward] -- Checking Training Record: Awards Level ${trainingRecord.awards}, ContentNode ID: ${trainingRecord.contentNode?.id}`);
      let allQuestionsCompleted = true;
      let questionCount = 0; // Count questions to ensure check happens

      // Check if the linked ContentNode and its views/elements exist
      if (trainingRecord.contentNode?.ContentView) {
        // Check completion status of all QUESTION elements within this ContentNode
        for (const contentView of trainingRecord.contentNode.ContentView) {
          // Ensure contentElement exists before accessing its properties
          if (contentView.contentElement) {
            const contentElement = contentView.contentElement;
            console.log(`[checkUserConceptLevelAward] ---- Checking ContentElement ID: ${contentElement.id} ('${contentElement.title}'), Type: ${contentElement.type}`);

            if (contentElement.type === 'QUESTION') {
              questionCount++;
              const userProgress = await this.prisma.userContentElementProgress.findFirst({
                where: {
                  userId: userId,
                  contentElementId: contentElement.id,
                },
                select: { markedAsDone: true } // Only need markedAsDone status
              });

              console.log(`[checkUserConceptLevelAward] ------ User Progress for Question ${contentElement.id}: ${userProgress ? `markedAsDone=${userProgress.markedAsDone}` : 'Not found'}`);
              if (!userProgress || !userProgress.markedAsDone) {
                allQuestionsCompleted = false;
                console.log(`[checkUserConceptLevelAward] ------ Question ${contentElement.id} is NOT done. Breaking check for this ContentNode.`);
                break; // This ContentNode is not fully completed
              }
            }
          } else {
             console.log(`[checkUserConceptLevelAward] ---- Skipping contentView as contentElement is missing.`);
          }
        }
         // If no questions were found in this ContentNode, it cannot be considered "completed" in terms of questions.
         if (questionCount === 0) {
            console.log(`[checkUserConceptLevelAward] -- No QUESTION elements found in ContentNode ID: ${trainingRecord.contentNode?.id}. Cannot be completed.`);
            allQuestionsCompleted = false;
         }

      } else {
        // If ContentNode or ContentView is missing, it cannot be completed
         console.log(`[checkUserConceptLevelAward] -- ContentNode or ContentView missing for Training Record awarding level ${trainingRecord.awards}. Cannot be completed.`);
        allQuestionsCompleted = false;
      }

       console.log(`[checkUserConceptLevelAward] -- Result for ContentNode ID ${trainingRecord.contentNode?.id}: allQuestionsCompleted = ${allQuestionsCompleted}`);
      // If this ContentNode is fully completed, consider its awarded level
      if (allQuestionsCompleted && trainingRecord.awards !== null) {
         console.log(`[checkUserConceptLevelAward] -- ContentNode ID ${trainingRecord.contentNode?.id} IS complete. Considering its award level: ${trainingRecord.awards}`);
        anyContentNodeCompleted = true;
        highestLevelAchieved = Math.max(highestLevelAchieved, trainingRecord.awards);
         console.log(`[checkUserConceptLevelAward] -- Current highestLevelAchieved: ${highestLevelAchieved}`);
      }
    }

     console.log(`[checkUserConceptLevelAward] Final check: anyContentNodeCompleted=${anyContentNodeCompleted}, highestLevelAchieved=${highestLevelAchieved}, current user level=${userConcept.level}`);
    // Update the user's level only if a higher level was achieved by completing content
    let levelUpdated = false;
    if (anyContentNodeCompleted && highestLevelAchieved > userConcept.level) {
       console.log(`[checkUserConceptLevelAward] Condition met for update. Calling updateUserLevel...`);
      // Use the existing updateUserLevel function which handles event creation
      const updatedUserConcept = await this.updateUserLevel(userId, conceptNodeId, highestLevelAchieved);
      levelUpdated = true;
      userConcept.level = updatedUserConcept.level; // Reflect the updated level
    } else {
       console.log(`[checkUserConceptLevelAward] Condition NOT met for update.`);
    }

    // Return whether an update happened and the final (potentially updated) level
     console.log(`[checkUserConceptLevelAward] Returning: [levelUpdated=${levelUpdated}, finalLevel=${userConcept.level}]`);
    return [levelUpdated, userConcept.level];
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
       if (userConcept.expanded !== expanded) { // Only update if state changed
        userConcept = await this.prisma.userConcept.update({
          where: { id: userConcept.id },
          data: {
            expanded: expanded,
          },
        });
         // create a userConceptEvent only if state changed
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
      }
    }
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
    // Update the user's currentConcept field
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
          expanded: false, // Default state
          level: 0, // Default level
        },
      });
    }

     // Create a userConceptEvent for selection
     // Consider if this should only happen if the selection *changed*
     // Currently creates an event every time this is called for the node
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

    // Return the userConcept (might be useful for the caller)
    return userConcept;
  }
}
