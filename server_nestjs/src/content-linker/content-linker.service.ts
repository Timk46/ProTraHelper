import { PrismaService } from '@/prisma/prisma.service';
import { QuestionDataService } from '@/question-data/question-data.service';
import { LinkableContentElementDTO, LinkableContentNodeDTO, QuestionDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentLinkerService {


  constructor(
    private prisma: PrismaService,
    private questionDataService: QuestionDataService,
  ) {}

  /**
   * Creates a linked content node.
   *
   * @param contentNode - The linkable content node to create.
   * @returns A promise that resolves to the created linkable content node.
   * @throws An error if there was an issue creating the linkable content node or the associated training.
   */
  async createLinkedContentNode(contentNode: LinkableContentNodeDTO): Promise<LinkableContentNodeDTO> {
    // first create the content node
    const dbContentNode = await this.prisma.contentNode.create({
      data: {
        name: contentNode.name,
        description: contentNode.description || null,
      },
    });

    if (!dbContentNode) {
      throw new Error('Error creating linkable content node');
    }
    // then create the training to link the content node to the concept node
    const dbTraining = await this.prisma.training.create({
      data: {
        conceptNode: {connect: {id: contentNode.conceptNodeId}},
        contentNode: {connect: {id: dbContentNode.id}},
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
   * Creates a linked question based on the provided data. Prefers the provided question data over the provided question ID.
   *
   * @param linkData - The data for the linked question.
   * @param authorId - The ID of the author creating the linked question.
   * @returns A promise that resolves to the created question.
   * @throws An error if any of the required data is missing or if there is an error creating the linked question.
   */
  async createLinkedContentElement(linkData: LinkableContentElementDTO, authorId: number): Promise<LinkableContentElementDTO> {
    if (!linkData.contentNodeId) {
      throw new Error('No content node id provided');
    }
    if (!linkData.question && !linkData.questionId) {
      throw new Error('Neither question nor question id provided');
    }

    // look into contentView table, get the rows with the same contentNode id and get the max position
    const maxPosition = await this.prisma.contentView.findFirst({
      where: {
        contentNode: {id: linkData.contentNodeId},
      },
      select: {
        position: true,
      },
      orderBy: {
        position: 'desc',
      },
    });


    const question: QuestionDTO = linkData.question? (
      await this.questionDataService.createQuestion(linkData.question, authorId)
    ) : (
      await this.questionDataService.getQuestion(linkData.questionId)
    );

    //look in contentElement if the question is already linked
    const contentElement = await this.prisma.contentElement.findFirst({
      where: {
        questionId: question.id,
      },
    });
    if (contentElement) {
      throw new Error('Question ' + question.id +  ' is already linked to a content node');
    }

    console.log('#### question', question);

    // create a content view and a content element with a question and link them all together based on our schema
    const dbContentView = await this.prisma.contentView.create({
      data: {
        contentNode: {connect: {id: linkData.contentNodeId}},
        contentElement: {
          create: {
            type: 'QUESTION',
            title: linkData.contentElementTitle || question.name,
            text: linkData.contentElementText || null,
            question: {connect: {id: question.id }},
          },
        },
        position: (maxPosition?.position || 0) + 1, // for now, inside the view, we just add the contentElement (-> the question) to the end
      },
      select: {
        contentElement: true,
        position: true,
      }
    });

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




}
