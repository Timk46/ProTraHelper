import { PrismaService } from '@/prisma/prisma.service';
import { AnonymousUserDTO, discussionCreationDTO, discussionMessageCreationDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscussionCreationService {

  constructor(private prisma: PrismaService) {}

  /** Returns the anonymous user data for a given user id and discussion id
   * If no anonymous user is found, a dummy is returned
   *
   * @param userId
   * @param discussionId
   * @returns the anonymous user data or a dummy
   */
  async getAnonymousUser(userId: number, discussionId: number) : Promise<AnonymousUserDTO> {
      const anonymousUser = await this.prisma.anonymousUser.findFirst({
        where: {
          userId: Number(userId),
          Message: {
            some: {
              discussionId: Number(discussionId),
            }
          }
        },
        select: {
          id: true,
          userId: true,
          anonymousName: true
        }
      });

      if (!anonymousUser) {
        console.log('DiscussionServie: No anonymous user found! Returning dummy.');
        return {
          id: -1,
          anonymousName: 'missingNo',
          userId: -1
        }
      }

      return {
        id: anonymousUser.id,
        anonymousName: anonymousUser.anonymousName,
        userId: anonymousUser.userId
      };
  }

  /** Returns the anonymous user data for a given user id and message id
   * If no anonymous user is found, a dummy is returned
   *
   * @param userId
   * @param messageId
   * @returns the anonymous user data or a dummy
   */
  async getAnonymousUserByMessageId(userId: number, messageId: number) : Promise<AnonymousUserDTO> {
    const anonymousUser = await this.prisma.message.findFirst({
      where: {
        id: Number(messageId),
        author: {
          userId: Number(userId)
        }
      },
      select: {
        author: {
          select: {
            id: true,
            userId: true,
            anonymousName: true
          }
        }
      }
    });

    if (!anonymousUser) {
      console.log('DiscussionServie: No anonymous user found! Returning dummy.');
      return {
        id: -1,
        anonymousName: 'missingNo',
        userId: -1
      }
    }
    console.log(anonymousUser.author.id + ' ' + anonymousUser.author.anonymousName + ' ' + anonymousUser.author.userId);
    return {
      id: anonymousUser.author.id,
      anonymousName: anonymousUser.author.anonymousName,
      userId: anonymousUser.author.userId
    };
  }

  /**
   * Creates a new anonymous user in the database and returns it
   * @param userId
   * @param name
   * @returns the anonymous user
   */
  async createAnonymousUser(userId: number, name: string) : Promise<AnonymousUserDTO> {
    return await this.prisma.anonymousUser.create({
      data: {
        userId: userId,
        anonymousName: name
      }
    });
  }

  /** Creates a new discussion message in the database and returns
   *
   * @param discussionData
   * @returns a creation status if successful
   */
  async createDiscussionMessage(messageData: discussionMessageCreationDTO) : Promise<discussionMessageCreationDTO> {
    const message = await this.prisma.message.create({
      data: {
        text: messageData.text,
        authorId: messageData.authorId,
        discussionId: messageData.discussionId,
        isInitiator: messageData.isInitiator,
        isSolution: messageData.isSolution
      }
    });

    if (!message) {
      throw new Error('Message not created');
    }

    return message;
  }

  /**
   * Creates a new discussion in the database and returns it
   * @param discussionData
   * @returns the discussion
   */
  async createDiscussion(discussionData: discussionCreationDTO) : Promise<discussionCreationDTO> {
    const discussion = await this.prisma.discussion.create({
      data: {
        title: discussionData.title,
        conceptNodeId: discussionData.conceptNodeId,
        contentNodeId: discussionData.contentNodeId != -1 ? discussionData.contentNodeId : null,
        contentElementId: discussionData.contentElementId != -1 ? discussionData.contentElementId : null,
        authorId: discussionData.authorId,
        isSolved: discussionData.isSolved
      }
    });

    if (!discussion) {
      throw new Error('Discussion not created');
    }

    return {
      id: discussion.id,
      title: discussion.title,
      conceptNodeId: discussion.conceptNodeId,
      contentNodeId: discussion.contentNodeId,
      contentElementId: discussion.contentElementId,
      authorId: discussion.authorId,
      isSolved: discussion.isSolved
    };
  }

}
