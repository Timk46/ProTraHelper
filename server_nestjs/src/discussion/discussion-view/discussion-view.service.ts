import { PrismaService } from '@/prisma/prisma.service';
import { discussionDTO, discussionMessageDTO, nodeNameDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';
import { DiscussionDataService } from '../discussion-data/discussion-data.service';

@Injectable()
export class DiscussionViewService {

  constructor(private prisma: PrismaService, private discussionDataService: DiscussionDataService) { }

  /** This function returns the name of the concept node for a given concept node id
   *
   * @param conceptNodeId
   * @returns the stringyfied JSON name of the concept node
   */
  async getConceptNodeName(discussionId: number) : Promise<nodeNameDTO> {
    const conceptNodeData = await this.prisma.discussion.findUnique({
      where: { id: Number(discussionId) },
      include: {
        conceptNode: {
          select: { name: true }
        }
      }
    });

    if (!conceptNodeData) {
      throw new Error('Concept node name not found');
    }


    const conceptNodeName = {
      name: conceptNodeData ? conceptNodeData.conceptNode.name : ""
    };

    return conceptNodeName;
  }

  /**
   * This function returns a discussion for a given discussion id
   *
   * @param discussionId
   * @returns the discussion
   */
  async getDiscussion(discussionId: number) : Promise<discussionDTO> {
    const discussion = await this.prisma.discussion.findFirst({
      where: {
         id: discussionId,
      },
      select: {
        id: true,
        title: true,
        author: {
          select: {
            anonymousName: true
          }
        },
        contentNodeId: true,
        createdAt: true,
        isSolved: true
      },

    });
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    const initMessageId = await this.prisma.message.findFirst({
      where: {
        discussionId: discussionId,
        isInitiator: true
      },
      select: {
        id: true
      }
    });
    if (!initMessageId) {
      throw new Error('Init message not found');
    }

    return {
      id: discussion.id,
      initMessageId: initMessageId.id,
      title: discussion.title,
      authorName: discussion.author.anonymousName,
      createdAt: discussion.createdAt,
      contentNodeName: discussion.contentNodeId == null ? 'allgemein' : (await this.discussionDataService.getContentNodeName(discussion.contentNodeId)).name,
      commentCount: await this.getDiscussionCommentCount(discussionId),
      isSolved: discussion.isSolved,
    };
  }

  /**
   * This function returns the number of comments for a given discussion
   * (excluding the init message)
   *
   * @param discussionId
   * @returns the number of comments
   */
  async getDiscussionCommentCount(discussionId: number) : Promise<number> {
    const commentCount = await this.prisma.message.count({
      where: {
        discussionId: discussionId,
        AND: {
          isInitiator: false,
        }
      }
    });

    return commentCount;
  }

  /**
   * This function returns all messages for a given discussion.
   * (including the init message)
   *
   * @param discussionId
   * @returns the messages
   */
  async getDiscussionMessages(discussionId: number) : Promise<discussionMessageDTO[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        discussionId: Number(discussionId)
      },
      select: {
        id: true,
        author: {
          select: {
            id: true,
            anonymousName: true
          }
        },
        createdAt: true,
        text: true,
        isSolution: true,
        isInitiator: true
      }

    });

    if (!messages) {
      throw new Error('Messages not found');
    }

    


    let messageData: discussionMessageDTO[] = [];
    for (let message of messages) {
      const totalVotes = (await this.prisma.vote.findMany({
        where: {
          messageId: message.id,
        }
      })).reduce((sum, vote) => sum + (vote.isUpvote ? 1 : -1), 0);
      console.log(totalVotes);

      messageData.push({
        messageId: message.id,
        discussionId: discussionId,
        authorId: message.author.id,
        authorName: message.author.anonymousName,
        createdAt: message.createdAt,
        messageText: message.text,
        isSolution: message.isSolution,
        isInitiator: message.isInitiator,
        voteCount: totalVotes || 0
      });
    }
    return messageData;
  }

  /**
   * Toggles the solution status of a message and returns and sets the solution status of the discussion
   * @param messageId
   * @returns the new solution status as boolean
   */
  async toggleSolution(messageId: number, userId: number) : Promise<boolean> {
    //get message solution status
    const message = await this.prisma.message.findUnique({
      where: {
        id: messageId,
      },
      select: {
        isSolution: true,
        discussion: {
          select: {
            id: true,
            author: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    console.log(message.discussion.author.userId, userId);
    //check if user is author of message
    if (message.discussion.author.userId != userId) {
      throw new Error('User is not author of message');
    }

    //set all messages in discussion to not solution except toggle message and init message
    await this.prisma.message.updateMany({
      where: {
        discussionId: message.discussion.id,
        NOT: {
          id: messageId,
          isInitiator: true
        }
      },
      data: {
        isSolution: false
      }
    });

    //toggle message solution status and init message solution status
    await this.prisma.message.updateMany({
      where: {
        discussionId: message.discussion.id,
        OR: [
          { id: messageId },
          { isInitiator: true }
        ]
      },
      data: {
        isSolution: !message.isSolution
      }
    });
    console.log(message.isSolution);

    //set discussion solution status
    await this.prisma.discussion.update({
      where: {
        id: message.discussion.id
      },
      data: {
        isSolved: !message.isSolution
      }
    });

    return !message.isSolution;
  }


}
