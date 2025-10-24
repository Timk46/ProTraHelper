/* eslint-disable prettier/prettier */
// content.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContentsForConceptDTO,
  ContentElementDTO,
  ContentDTO,
  ConceptNodeEditDTO,
  ContentViewInformationDTO,
  contentElementType,
  questionType,
  ContentUpdateDTO,
} from '@Interfaces/index';
import { ContentElementStatusDTO } from '@DTOs/index';
import { UserConceptService } from '@/graph/user-concept/user-concept.service';
import { ConceptNode } from '@prisma/client';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userConceptService: UserConceptService,
  ) {}

  /**
   * Retrieves contents associated with a specific concept node for a given user (eg. "Funktionale Programmierung mit Python" or "Objektorientierte Programmierung mit Java").
   *
   * @param conceptNodeId - The ID of the concept node to fetch contents for
   * @param userId - The ID of the user requesting the contents
   * @returns A promise that resolves to a ContentsForConceptDTO object
   *
   * @description
   * This method is the heart of our service. It performs several steps to gather
   * all the necessary information about a concept and its related content.
   * Here's what it does:
   *
   * 1. Fetches the concept node and its related data from the database
   * 2. Retrieves the user's progress for all related content elements
   * 3. Fetches the user's question progress for all related questions
   * 4. Transforms all this data into a format that's easy for the rest of the application to use
   *
   * @example
   * // Fetching contents for concept node with ID 1 for user with ID 123
   * const contents = await conceptService.getContentsByConceptNode(1, 123);
   * console.log(contents.trainedBy); // Array of content that trains this concept
   * console.log(contents.requiredBy); // Array of content that requires this concept
   */
  async getContentsByConceptNode(
    conceptNodeId: number,
    userId: number,
    hasPrivileges: boolean = false,
  ): Promise<ContentsForConceptDTO> {
    // Step 1: Fetch concept node with all related data in a single query
    // We use Prisma's findUnique method to get a specific concept node
    // The 'include' option tells Prisma to also fetch related data
    const conceptNode = await this.prisma.conceptNode.findUnique({
      where: { id: Number(conceptNodeId) },
      include: {
        requiredBy: {
          select: {
            contentNode: {
              include: this.getContentNodeInclude(),
            },
          },
        },
        trainedBy: {
          select: {
            contentNode: {
              include: this.getContentNodeInclude(),
            },
          },
        },
        rhinoFile: true,
      },
    });

    if (!conceptNode) {
      throw new Error('ConceptNode not found');
    }

    // Step 2: Fetch user progress for all content elements in a single query.
    // !! This is more efficient than fetching them one by one (which we have done in the past) !!
    // This gives us information about which content elements the user has completed or marked
    const userStatus = await this.prisma.userContentElementProgress.findMany({
      where: {
        userId: userId,
        contentElement: {
          ContentView: {
            some: {
              contentNode: {
                OR: [
                  // This part is creating a condition to fetch content nodes that are either
                  // required by or trained by our main concept node.
                  {
                    id: {
                      in: conceptNode.requiredBy.map(r => r.contentNode.id),
                    },
                  },
                  {
                    id: {
                      in: conceptNode.trainedBy.map(t => t.contentNode.id),
                    },
                  },
                ],
              },
            },
          },
        },
      },
      select: {
        contentElementId: true,
        markedAsDone: true,
        markedAsQuestion: true,
      },
    });

    // Step 3: Fetch question progress for all questions in a single query
    // !! This is more efficient than fetching them one by one (which we have done in the past) !!
    // This gives us information about how well the user has performed on related questions
    const questionProgress = await this.prisma.userAnswer.findMany({
      where: {
        userId: userId,
        question: {
          contentElement: {
            ContentView: {
              some: {
                contentNode: {
                  OR: [
                    {
                      id: {
                        in: conceptNode.requiredBy.map(r => r.contentNode.id),
                      },
                    },
                    {
                      id: {
                        in: conceptNode.trainedBy.map(t => t.contentNode.id),
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      select: {
        questionId: true,
        feedbacks: {
          select: {
            score: true,
          },
        },
      },
    });

    // Create a map of question IDs to their maximum scores
    const questionProgressMap = new Map<number, number>();
    questionProgress.forEach(qp => {
      const currentMaxScore = questionProgressMap.get(qp.questionId) || 0;
      const newMaxScore = Math.max(...qp.feedbacks.map(f => f.score), currentMaxScore);
      questionProgressMap.set(qp.questionId, newMaxScore);
    });

    // Step 4: Transform data
    // We create a function that turns our raw database data into a format our application can use
    const transformContentNode = (contentNode: any): ContentDTO => ({
      contentNodeId: contentNode.id,
      name: contentNode.name,
      description: contentNode.description,
      descriptionHTML: contentNode.descriptionHTML || undefined,
      taskSectorTitle: contentNode.taskSectorTitle || undefined,
      position: contentNode.position,
      level: contentNode.trains[0]?.awards,
      contentElements: contentNode.ContentView.filter(
        contentView => contentView.isVisible !== false || hasPrivileges, // include only visible content views or all if with privileges
      ).map(this.transformContentElement(userStatus, questionProgressMap)),
      contentPrerequisiteIds: contentNode.prerequisites.map((p: any) => p.prerequisiteId),
      contentSuccessorIds: contentNode.successors.map((s: any) => s.successorId),
      requiresConceptIds: contentNode.requires.map((r: any) => r.conceptNodeId),
      trainsConceptIds: contentNode.trains.map((t: any) => t.conceptNodeId),
      progress: this.calculateProgress(contentNode, userStatus),
      levelProgress: this.calculateHighestLevelProgress(contentNode, userStatus),
      questionMarked: contentNode.ContentView.some((cv: any) =>
        userStatus.some(
          status => status.contentElementId === cv.contentElement.id && status.markedAsQuestion,
        ),
      ),
      isVisible:
        contentNode.trains[0]?.visible == undefined ? true : contentNode.trains[0]?.visible,
    });

    // We apply our transformation function to all the content nodes
    const requiredBy = conceptNode.requiredBy
      .map(r => transformContentNode(r.contentNode))
      .filter(c => c.isVisible || hasPrivileges); // include only visible content nodes or all if with privileges
    const trainedBy = conceptNode.trainedBy
      .map(t => transformContentNode(t.contentNode))
      .filter(c => c.isVisible || hasPrivileges); // include only visible content nodes or all if with privileges

    // Finally, we return our transformed data
    return { trainedBy, requiredBy };
  }

  /**
   * Returns an object specifying which related entities to include when fetching a content node.
   */
  private getContentNodeInclude() {
    return {
      prerequisites: true,
      successors: true,
      requires: true,
      trains: true,
      ContentView: {
        orderBy: { position: 'asc' as const },
        include: {
          contentElement: {
            include: {
              file: true,
              question: true,
            },
          },
        },
      },
    };
  }

  /**
   * Transforms a content view into a ContentElementDTO.
   *
   * @param userStatus - An array of user progress statuses for content elements
   * @param questionProgressMap - A map of question IDs to their progress
   * @returns A function that transforms a content view into a ContentElementDTO
   *
   * @description
   * This method creates a function that transforms a content view object into a ContentElementDTO.
   * It includes logic to calculate question progress if the content element is a question.
   */
  private transformContentElement(userStatus: any[], questionProgressMap: Map<number, number>) {
    return (contentView: any): ContentElementDTO => ({
      id: contentView.contentElement.id,
      type: contentView.contentElement.type,
      contentViewId: contentView.id,
      positionInSpecificContentView: contentView.position,
      title: contentView.contentElement.title,
      text: contentView.contentElement.text,
      file: contentView.contentElement.file,
      question: contentView.contentElement.question
        ? {
            id: contentView.contentElement.question.id,
            name: contentView.contentElement.question.name,
            description: contentView.contentElement.question.description,
            type: contentView.contentElement.question.type,
            level: contentView.contentElement.question.level,
            progress: this.calculateQuestionProgress(
              contentView.contentElement.question,
              questionProgressMap.get(contentView.contentElement.question.id) || 0,
            ),
          }
        : null,
      isVisible: contentView.isVisible !== undefined ? contentView.isVisible : true,
    });
  }

  /** REMOVED because we dont want to give progress on PDF and Video

  private calculateProgress(contentNode: any, userStatus: any[]): number {
    const total = contentNode.ContentView.length;
    if (total === 0) return 0;

    const completedCount = contentNode.ContentView.filter((cv: any) =>
      userStatus.some(
        (status) =>
          status.contentElementId === cv.contentElement.id &&
          status.markedAsDone,
      ),
    ).length;

    return (completedCount / total) * 100;
  }
  */

  /**
   * Calculates the progress for a content node.
   *
   * @param contentNode - The content node to calculate progress for
   * @param userStatus - An array of user progress statuses for content elements
   * @returns The calculated progress as a percentage
   *
   * @description
   * This method calculates the progress for a content node by counting the number of completed question elements
   * and dividing it by the total number of question elements.
   */
  private calculateProgress(contentNode: any, userStatus: any[]): number {
    const questionElements = contentNode.ContentView.filter(
      (cv: any) => cv.contentElement.type === 'QUESTION',
    );
    const total = questionElements.length;
    if (total === 0) return 0;

    const completedCount = questionElements.filter((cv: any) =>
      userStatus.some(
        status =>
          cv.contentElement.type === 'QUESTION' &&
          status.contentElementId === cv.contentElement.id &&
          status.markedAsDone,
      ),
    ).length;
  }

  /**
   * Calculates the highest level of progress for a given content node based on the user's status.
   *
   * @param contentNode - The content node containing the content elements.
   * @param userStatus - An array of user status objects indicating which content elements have been marked as done.
   * @returns The highest level of progress achieved by the user for the given content node.
   */
  private calculateHighestLevelProgress(contentNode: any, userStatus: any[]): number {
    const sortedQuestionElements = contentNode.ContentView.filter(
      (cv: any) => cv.contentElement.type === 'QUESTION',
    ).sort((a: any, b: any) => a.contentElement.question.level - b.contentElement.question.level);

    let highestLevel = 0;
    for (let i = 0; i < sortedQuestionElements.length; i++) {
      const cv = sortedQuestionElements[i];
      if (
        !userStatus.some(
          status => status.contentElementId === cv.contentElement.id && status.markedAsDone,
        )
      ) {
        break;
      } else {
        // only change highestLevel if last element or next element has different (higher) level
        if (
          i == sortedQuestionElements.length - 1 ||
          sortedQuestionElements[i + 1].contentElement.question.level !=
            cv.contentElement.question.level
        ) {
          highestLevel = cv.contentElement.question.level;
        }
      }
    }
    return highestLevel;
  }

  /**
   * Calculates the progress for a question.
   *
   * @param question - The question to calculate progress for
   * @param bestScore - The best score achieved for this question
   * @returns The calculated progress as a percentage
   *
   * @description
   * This method calculates the progress for a question by dividing the best score achieved
   * by the maximum possible score for the question.
   *
   * If the maximum score is 100 and you scored 75, your progress would be 75%.
   */
  private calculateQuestionProgress(question: any, bestScore: number): number {
    return (bestScore / (question.score || 1)) * 100;
  }

  async getContentViews(contentNodeId: number): Promise<ContentViewInformationDTO[]> {
    const contentViews = await this.prisma.contentView.findMany({
      where: { contentNodeId: contentNodeId },
      include: {
        contentElement: {
          include: {
            question: true,
            file: true,
          },
        },
        contentNode: true,
      },
    });

    return contentViews.map(cv => ({
      contentNodeId: cv.contentNode.id,
      contentElement: {
        id: cv.contentElement.id,
        type: cv.contentElement.type as contentElementType,
        title: cv.contentElement.title,
        question: cv.contentElement.question
          ? { type: cv.contentElement.question.type as questionType }
          : null,
      },
      position: cv.position,
      isVisible: cv.isVisible,
    }));
  }

  /**
   * Updates the visibility status of a content view by its ID.
   *
   * @param contentViewId - The unique identifier of the content view to update.
   * @param isVisible - A boolean indicating whether the content view should be visible.
   * @returns A promise that resolves to `true` if the update was successful, or `false` if an error occurred.
   */
  async setContentViewVisibility(contentViewId: number, isVisible: boolean): Promise<boolean> {
    try {
      await this.prisma.contentView.update({
        where: { id: contentViewId },
        data: { isVisible: isVisible },
      });
      return true;
    } catch (error) {
      console.error(`Failed to update content view visibility: ${error}`);
      return false;
    }
  }

  /**
   * Updates the visibility status of a content node associated with a concept node.
   *
   * This method updates all training entries that match the given `conceptNodeId` and `contentNodeId`,
   * setting their `visible` property to the specified `isVisible` value.
   *
   * @param conceptNodeId - The ID of the concept node.
   * @param contentNodeId - The ID of the content node.
   * @param isVisible - The desired visibility status to set.
   * @returns A promise that resolves to `true` if the update was successful, or `false` if an error occurred.
   */
  async setContentNodeVisibility(
    conceptNodeId: number,
    contentNodeId: number,
    isVisible: boolean,
  ): Promise<boolean> {
    try {
      await this.prisma.training.updateMany({
        // updateMany because technically there could be multiple entries for the same contentNodeId and conceptNodeId
        where: {
          conceptNodeId: conceptNodeId,
          contentNodeId: contentNodeId,
        },
        data: { visible: isVisible },
      });
      return true;
    } catch (error) {
      console.error(`Failed to update content node visibility: ${error}`);
      return false;
    }
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
    const contentElementStatus = await this.prisma.userContentElementProgress.findFirst({
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

  async questionContentElementDone(
    contentElementId: number,
    conceptNodeId: number,
    level: number,
    userId: number,
  ): Promise<boolean> {
    //get element done status
    let questionDone = await this.prisma.userContentElementProgress.findFirst({
      where: {
        contentElementId: contentElementId,
        userId: userId,
      },
      select: {
        id: true,
        markedAsDone: true,
      },
    });
    console.log('## questionContentElementDone', questionDone);

    if (!questionDone) {
      //create new entry in userContentProgress if not exists and set markedAsDone to true
      questionDone = await this.prisma.userContentElementProgress.create({
        data: {
          markedAsDone: true,
          markedAsQuestion: false,
          contentElementId: contentElementId,
          userId: userId,
        },
      });
    } else if (!questionDone.markedAsDone) {
      //set markedAsDone to true
      await this.prisma.userContentElementProgress.update({
        where: {
          id: questionDone.id,
        },
        data: {
          markedAsDone: true,
        },
      });
    }
    await this.userConceptService.checkUserConceptLevelAward(
      userId,
      contentElementId,
      conceptNodeId,
      level,
    );
    console.log(
      '## questionContentElementDone',
      questionDone.markedAsDone,
      'for user ',
      userId,
      'for element id ',
      contentElementId,
    );
    return questionDone.markedAsDone;
  }

  /**
   * Get Leaf Concepts For Element
   *
   * Retrieves the leaf concepts associated with a content element.
   * @param {number} contentElementId The ID of the content element
   * @returns {Promise<number[]>} A promise that resolves to an array of numbers.
   *
   */
  async getLeafConceptsForElement(contentElementId: number): Promise<number[]> {
    const conceptNodes = await this.prisma.conceptNode.findMany({
      where: {
        trainedBy: {
          some: {
            contentNode: {
              ContentView: {
                some: {
                  contentElementId: contentElementId,
                },
              },
            },
          },
        },
        myChildren: {
          none: {},
        },
      },
      select: {
        id: true,
      },
    });
    return conceptNodes.map(concept => concept.id);
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
    conceptNodeId: number,
    userId: number,
    level: number,
  ): Promise<boolean> {
    //get checkmark status
    let checkmarkStatus = await this.prisma.userContentElementProgress.findFirst({
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
    checkmarkStatus = await this.prisma.userContentElementProgress.update({
      where: {
        id: checkmarkStatus.id,
      },
      data: {
        markedAsDone: !checkmarkStatus.markedAsDone,
      },
    });

    const concepts = await this.getLeafConceptsForElement(contentElementId);

    if (checkmarkStatus.markedAsDone) {
      for (const concept of concepts) {
        await this.userConceptService.checkUserConceptLevelAward(
          userId,
          contentElementId,
          concept,
          level,
        );
      }
    }

    return checkmarkStatus.markedAsDone;
  }

  /**
   * Toggle Content Element Status
   *
   * Toggles the completion status of a content element for a specific user.
   * @param {number} contentElementId The ID of the content element
   * @returns {Promise<boolean>} A promise that resolves to a boolean.
   *
   */
  async toggleQuestionmark(contentElementId: number, userId: number): Promise<boolean> {
    //get checkmark status
    let questionmarkStatus = await this.prisma.userContentElementProgress.findFirst({
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
  async updateLastOpenedDate(contentNodeId: number, userId: number): Promise<Date> {
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
    const allConcepts = concepts.map(concept => concept.name);
    Array.from(new Set(allConcepts)).find(concept => concept === 'root')
      ? allConcepts.splice(allConcepts.indexOf('root'), 1)
      : null;
    return Array.from(new Set(allConcepts));
  }

  async getConcepts(): Promise<ConceptNode[]> {
    return this.prisma.conceptNode.findMany({
      where: {
        NOT: {
          name: 'root',
        },
      },
      include: {
        rhinoFile: true,
      },
    });
  }

  /**
   * Fetches a single ConceptNode with rhinoFile relation
   * @param conceptId - The ID of the concept node to fetch
   * @returns ConceptNode with rhinoFile relation
   * @throws NotFoundException if ConceptNode not found
   */
  async getConcept(conceptId: number): Promise<ConceptNode> {
    const conceptNode = await this.prisma.conceptNode.findUnique({
      where: { id: conceptId },
      include: {
        rhinoFile: true,
      },
    });

    if (!conceptNode) {
      throw new NotFoundException(`ConceptNode with ID ${conceptId} not found`);
    }

    return conceptNode;
  }

  async updateConcept(conceptId: number, concept: ConceptNodeEditDTO): Promise<boolean> {
    const { id: cId, ...data } = concept;
    const updated = await this.prisma.conceptNode.update({
      where: { id: conceptId },
      data,
    });
    return !!updated;
  }

  /**
   * Updates the awards level for a given content node and its associated concept nodes.
   *
   * This method performs the following steps:
   * 1. Retrieves the highest question level for the specified content node.
   * 2. Updates the `awards` field in the `training` table for the given content node.
   * 3. Retrieves all concept nodes associated with the specified content node.
   * 4. For each concept node (excluding the root concept node), finds the highest awards level.
   * 5. Updates the `level` field in the `ModuleConceptGoal` table for each concept node.
   *
   * @param contentNodeId - The ID of the content node to update.
   * @returns A promise that resolves to `true` if the update is successful.
   * @throws An error if the highest awards level cannot be found for any content or concept node.
   */
  async updateAwardsLevel(contentNodeId: number): Promise<boolean> {
    const highestLevel: number = await this.getHighestQuestionLevel(contentNodeId);
    if (highestLevel === -1) {
      throw new Error('Error finding the highest awards level for contentNode ' + contentNodeId);
    }

    const updatedTraining = await this.prisma.training.updateMany({
      where: {
        contentNodeId: contentNodeId,
      },
      data: {
        awards: highestLevel,
      },
    });

    // now we need to update the ModuleConceptGoal table by finding the highest awards level for each concept node
    const conceptNodes = await this.prisma.training.findMany({
      where: {
        contentNodeId: contentNodeId,
      },
      select: {
        conceptNodeId: true,
      },
    });

    //for each concept node, find the highest awards in the training table
    for (const conceptNode of conceptNodes) {
      if (conceptNode.conceptNodeId !== 1) {
        //skip the root concept node
        const highestAwards = await this.getHighestContentLevel(conceptNode.conceptNodeId);
        if (highestAwards === -1) {
          throw new Error(
            'Error finding highest awards level for conceptNode ' + conceptNode.conceptNodeId,
          );
        }

        //update ModuleConceptGoal
        await this.prisma.moduleConceptGoal.updateMany({
          where: {
            conceptNodeId: conceptNode.conceptNodeId,
          },
          data: {
            level: highestAwards,
          },
        });
      }
    }
    return true;
  }

  /**
   * Retrieves the highest question level associated with a given content node.
   *
   * @param contentNodeId - The ID of the content node to search for.
   * @returns A promise that resolves to the highest question level found, or throws an error if no content elements are found.
   * @throws Will throw an error if no content elements are found for the given content node ID.
   */
  async getHighestQuestionLevel(contentNodeId: number): Promise<number> {
    const highestLevelResult = await this.prisma.contentView.findFirst({
      where: {
        contentNode: { id: contentNodeId },
        contentElement: {
          type: 'QUESTION',
          NOT: {
            question: null,
          },
        },
      },
      select: {
        contentElement: {
          select: {
            question: {
              select: {
                level: true,
              },
            },
          },
        },
      },
      orderBy: {
        contentElement: {
          question: {
            level: 'desc',
          },
        },
      },
    });

    if (!highestLevelResult) {
      console.log('No content elements found for content node ' + contentNodeId + '. Returning 1.');
      return 1;
    }

    const highestLevel: number = highestLevelResult.contentElement.question.level || -1;
    return highestLevel;
  }

  /**
   * Retrieves the highest content level associated with a given concept node.
   *
   * @param conceptNodeId - The ID of the concept node to search for.
   * @returns A promise that resolves to the highest content level found, or throws an error if no content nodes are found.
   * @throws Will throw an error if no content nodes are found for the given concept node ID.
   */
  async getHighestContentLevel(conceptNodeId: number): Promise<number> {
    const highestAwardsResult = await this.prisma.training.findFirst({
      where: {
        conceptNodeId: conceptNodeId,
      },
      select: {
        awards: true,
      },
      orderBy: {
        awards: 'desc',
      },
    });

    if (!highestAwardsResult) {
      console.log('No content nodes found for concept node ' + conceptNodeId + '. Returning 1.');
      return 1;
    }

    const highestLevel: number = highestAwardsResult.awards || -1;
    return highestLevel;
  }

  /**
   * Updates the positions of content elements within a content node.
   *
   * The method reorders the elements so that the specified `positionedElementIds`
   * appear first in the given order, followed by any remaining elements in their original order.
   * It validates that all provided IDs exist in the content node before updating.
   *
   * @param contentNodeId - The ID of the content node whose elements are to be reordered.
   * @param positionedElementIds - An array of content element IDs specifying the desired order for those elements.
   * @returns A promise that resolves to `true` if the update was successful, or `false` if any provided IDs are invalid.
   */
  async updateContentElementPositions(
    contentNodeId: number,
    positionedElementIds: number[],
  ): Promise<boolean> {
    const contentViews = await this.prisma.contentView.findMany({
      where: { contentNodeId },
      orderBy: { position: 'asc' },
    });

    // Check if all provided element IDs are valid
    const allValid = positionedElementIds.every(id =>
      contentViews.some(view => view.contentElementId === id),
    );
    if (!allValid) return false;

    // Create final order: specified elements first, then remaining elements in original order
    const specifiedIds = new Set(positionedElementIds);
    const remainingElements = contentViews
      .filter(view => !specifiedIds.has(view.contentElementId))
      .map(view => view.contentElementId);

    const finalOrder = [...positionedElementIds, ...remainingElements];

    // Update positions for all elements
    const updates = finalOrder.map((id, index) =>
      this.prisma.contentView.updateMany({
        where: {
          contentNodeId,
          contentElementId: id,
        },
        data: { position: index + 1 },
      }),
    );
    await Promise.all(updates);
    return true;
  }

  /**
   * Updates the position of a ContentNode.
   * @param contentNodeId - Die ID des ContentNodes
   * @param newPosition - Die neue Position
   * @returns Promise<boolean> - true, wenn erfolgreich
   */
  async updateContentNodePosition(contentNodeId: number, newPosition: number): Promise<boolean> {
    const updated = await this.prisma.contentNode.update({
      where: { id: contentNodeId },
      data: { position: newPosition },
    });
    return !!updated;
  }

  /**
   * Updates the positions of multiple content nodes within a concept node.
   * @param conceptNodeId - The ID of the concept node whose content nodes are to be reordered.
   * @param orderedNodeIds - An array of content node IDs specifying the desired order.
   * @returns A promise that resolves to `true` if the update was successful, or `false` if any provided IDs are invalid.
   */
  async updateContentNodePositions(
    conceptNodeId: number,
    orderedNodeIds: number[],
  ): Promise<boolean> {
    // Get content nodes that are trained by this concept node via Training relation
    const trainings = await this.prisma.training.findMany({
      where: { conceptNodeId },
      include: { contentNode: true },
      orderBy: { contentNode: { position: 'asc' } },
    });

    const contentNodes = trainings.map(training => training.contentNode);

    // Check if all provided node IDs are valid
    const allValid = orderedNodeIds.every(id => contentNodes.some(node => node.id === id));
    if (!allValid) return false;

    // Create final order: specified nodes first, then remaining nodes in original order
    const specifiedIds = new Set(orderedNodeIds);
    const remainingNodes = contentNodes
      .filter(node => !specifiedIds.has(node.id))
      .map(node => node.id);

    const finalOrder = [...orderedNodeIds, ...remainingNodes];

    // Update positions for all nodes
    const updates = finalOrder.map((id, index) =>
      this.prisma.contentNode.update({
        where: { id },
        data: { position: index + 1 },
      }),
    );
    await Promise.all(updates);
    return true;
  }

  /**
   * Aktualisiert einen ContentNode (Name, Beschreibung, Level)
   */
  async updateContentNodeData(contentNodeId: number, data: ContentUpdateDTO): Promise<boolean> {
    await this.prisma.contentNode.update({
      where: { id: contentNodeId },
      data: {
        name: data.name,
        description: data.description,
        descriptionHTML: data.descriptionHTML,
        taskSectorTitle: data.taskSectorTitle,
        // Level ist vermutlich in Training/ModuleConceptGoal, aber für Demo als Beispiel:
        // level: data.difficulty
      },
    });
    // Falls Level/Schwierigkeit in anderer Tabelle gepflegt wird, hier ergänzen
    return true;
  }
}
