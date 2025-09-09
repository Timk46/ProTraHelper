import { ContentService } from '@/content/content.service';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDataService } from '@/question-data/question-data.service';
import {
  ContentDTO,
  LinkableContentElementDTO,
  LinkableContentNodeDTO,
  QuestionDTO,
} from '@DTOs/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentLinkerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionDataService: QuestionDataService,
    private readonly contentService: ContentService,
  ) {}

  /**
   * Creates a linked content node.
   *
   * @param contentNode - The linkable content node to create.
   * @returns A promise that resolves to the created linkable content node.
   * @throws An error if there was an issue creating the linkable content node or the associated training.
   */
  async createLinkedContentNode(
    contentNode: LinkableContentNodeDTO,
  ): Promise<LinkableContentNodeDTO> {
    // first find or create the content node
    const dbContentNode = !contentNode.id
      ? await this.prisma.contentNode.create({
          data: {
            name: contentNode.name,
            description: contentNode.description || null,
          },
        })
      : await this.prisma.contentNode.findUnique({
          where: { id: contentNode.id },
        });
    // if the content node was not found or created, throw an error
    if (!dbContentNode) {
      throw new Error('Error creating linkable content node');
    }

    // then create the training to link the content node to the concept node
    const dbTraining = await this.prisma.training.create({
      data: {
        conceptNode: { connect: { id: contentNode.conceptNodeId } },
        contentNode: { connect: { id: dbContentNode.id } },
        awards: contentNode.awardsLevel,
      },
    });
    // if the training was not created, delete the content node and throw an error
    if (!dbTraining) {
      await this.prisma.contentNode.delete({
        where: {
          id: dbContentNode.id,
        },
      });
      throw new Error('Error creating training while creating linkable content node');
    }

    return {
      id: dbContentNode.id,
      name: dbContentNode.name,
      description: dbContentNode.description,
      conceptNodeId: dbTraining.conceptNodeId,
      awardsLevel: dbTraining.awards,
    };
  }

  /**
   * Creates a linked ContentElement linked with a question based on the provided data.
   * The question can be provided as a new question object or as an existing question ID.
   * Prefers the provided question data over the provided question ID.
   *
   * @param linkData - The data for the linked question.
   * @param authorId - The ID of the author creating the linked question.
   * @returns A promise that resolves to the created question.
   * @throws An error if any of the required data is missing or if there is an error creating the linked question.
   */
  async createLinkedContentElement(
    linkData: LinkableContentElementDTO,
    authorId: number,
  ): Promise<LinkableContentElementDTO> {
    if (!linkData.contentNodeId) {
      throw new Error('No content node id provided');
    }
    if (!linkData.question && !linkData.questionId) {
      throw new Error('Neither question nor question id provided');
    }

    // look into contentView table, get the rows with the same contentNode id and get the max position
    const maxPosition = await this.prisma.contentView.findFirst({
      where: {
        contentNode: { id: linkData.contentNodeId },
      },
      select: {
        position: true,
      },
      orderBy: {
        position: 'desc',
      },
    });

    const question: QuestionDTO = linkData.question
      ? await this.questionDataService.createQuestion(linkData.question, authorId)
      : await this.questionDataService.getQuestion(linkData.questionId);

    //look in contentElement if the question is already linked
    const contentElement = await this.prisma.contentElement.findFirst({
      where: {
        questionId: question.id,
      },
    });
    if (contentElement) {
      throw new Error('Question ' + question.id + ' is already linked to a content node');
    }

    console.log('#### question', question);

    // create a content view and a content element with a question and link them all together based on our schema
    const dbContentView = await this.prisma.contentView.create({
      data: {
        contentNode: { connect: { id: linkData.contentNodeId } },
        contentElement: {
          create: {
            type: 'QUESTION',
            title: linkData.contentElementTitle || question.name,
            text: linkData.contentElementText || null,
            question: { connect: { id: question.id } },
          },
        },
        position: (maxPosition?.position || 0) + 1, // for now, inside the view, we just add the contentElement (-> the question) to the end
      },
      select: {
        contentElement: true,
        position: true,
      },
    });

    //since we may have a higher award level, update them
    await this.contentService.updateAwardsLevel(linkData.contentNodeId);

    if (!dbContentView) {
      throw new Error('Error creating linked content element while creating content view');
    }

    return {
      id: dbContentView.contentElement.id,
      contentNodeId: linkData.contentNodeId,
      questionId: question.id,
      contentElementTitle: dbContentView.contentElement.title,
      contentElementText: dbContentView.contentElement.text,
      position: dbContentView.position,
    };
  }

  // TODO: repositionContentElement

  async unlinkContentElement(contentElementId: number): Promise<boolean> {
    // get the corresponding content views
    const contentViews = await this.prisma.contentView.findMany({
      where: {
        contentElement: { id: contentElementId },
      },
    });

    const contentElement = await this.prisma.contentElement.delete({
      // this will also delete the corresponding contentView
      where: {
        id: contentElementId,
      },
    });

    if (!contentElement) {
      throw new Error('Error deleting content element');
    }

    //since we may have a lower award level, update them for all contentNodes
    for (const contentView of contentViews) {
      await this.contentService.updateAwardsLevel(contentView.contentNodeId);
    }

    return true;
  }

  /**
   * Retrieves all questions that are not linked to any content element of type 'QUESTION'.
   *
   * This method first fetches all content elements of type 'QUESTION' that have a non-null `questionId`.
   * It then collects the IDs of these linked questions and queries the database for questions whose IDs
   * are not present in the list of linked question IDs.
   *
   * @returns {Promise<QuestionDTO[]>} A promise that resolves to an array of unlinked questions.
   */
  async getUnlinkedQuestions(): Promise<QuestionDTO[]> {
    const linkedQuestions = await this.prisma.contentElement.findMany({
      where: {
        type: 'QUESTION',
        questionId: {
          not: null,
        },
      },
      select: {
        questionId: true,
      },
    });

    const linkedQuestionIds = linkedQuestions.map(linkedQuestion => linkedQuestion.questionId);

    const unlinkedQuestions = await this.prisma.question.findMany({
      where: {
        id: {
          notIn: linkedQuestionIds,
        },
      },
    });

    return unlinkedQuestions;
  }

  /**
   * Unlinks a content node from a concept node by deleting the corresponding training records.
   * The unlinked content node will remain in the database, but it will no longer be associated with the specified concept node.
   *
   * @param conceptNodeId - The ID of the concept node to unlink.
   * @param contentNodeId - The ID of the content node to unlink.
   * @returns A promise that resolves to `true` if any training records were deleted, otherwise `false`.
   */
  async unlinkContentNode(conceptNodeId: number, contentNodeId: number): Promise<boolean> {
    const training = await this.prisma.training.deleteMany({
      where: {
        conceptNodeId: conceptNodeId,
        contentNodeId: contentNodeId,
      },
    });
    return training.count > 0;
  }

  /**
   * Retrieves all content nodes that are not linked to any concept node.
   *
   * This method queries the database for content nodes whose IDs do not appear in the
   * list of linked content nodes from the training table. It then maps the results to
   * `ContentDTO` objects with default values for certain properties.
   *
   * @returns {Promise<ContentDTO[]>} A promise that resolves to an array of unlinked content nodes.
   */
  async getUnlinkedContentNodes(): Promise<LinkableContentNodeDTO[]> {
    // get all content nodes that are not linked to any concept node
    const linkedContentNodes = await this.prisma.training.findMany({
      select: {
        contentNodeId: true,
      },
      distinct: ['contentNodeId'],
    });
    const linkedContentNodeIds = linkedContentNodes.map(
      linkedContentNode => linkedContentNode.contentNodeId,
    );
    const unlinkedContentNodes = await this.prisma.contentNode.findMany({
      where: {
        id: {
          notIn: linkedContentNodeIds,
        },
      },
    });
    return unlinkedContentNodes.map(node => ({
      id: node.id,
      name: node.name,
      description: node.description,
      //dummy data, crucial for dto
      conceptNodeId: -1,
      awardsLevel: 0,
    }));
  }
}
