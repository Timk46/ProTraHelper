/* eslint-disable prettier/prettier */
import { NotificationService } from '@/notification/notification.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AnonymousUserDTO,
  discussionCreationDTO,
  discussionMessageCreationDTO} from '@DTOs/index';
import {
  NotificationType,
} from '@DTOs/index';
import { Injectable } from '@nestjs/common';
import * as xss from 'xss';

@Injectable()
export class DiscussionCreationService {
  // cross side script prevention filter options
  xssFilterOptions = {
    whiteList: {
      ...xss.getDefaultWhiteList(),
      pre: ['class'], //important for code highlighting
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Returns the anonymous user data for a given user id and discussion id
   * If no anonymous user is found, a dummy is returned
   * Important: This function only detects the anonymous user if the user has already written a message in the discussion
   *
   * @param userId
   * @param discussionId
   * @returns the anonymous user data or a dummy
   */
  async getAnonymousUser(userId: number, discussionId: number): Promise<AnonymousUserDTO> {
    const anonymousUser = await this.prisma.anonymousUser.findFirst({
      where: {
        userId: Number(userId),
        Message: {
          some: {
            discussionId: Number(discussionId),
          },
        },
      },
      select: {
        id: true,
        userId: true,
        anonymousName: true,
      },
    });

    if (!anonymousUser) {
      console.log('DiscussionServie: No anonymous user found! Returning dummy.');
      return {
        id: -1,
        anonymousName: 'missingNo',
        userId: -1,
      };
    }

    return {
      id: anonymousUser.id,
      anonymousName: anonymousUser.anonymousName,
      userId: anonymousUser.userId,
    };
  }

  /** Returns the anonymous user data for a given user id and message id
   * If no anonymous user is found, a dummy is returned
   *
   * @param userId
   * @param messageId
   * @returns the anonymous user data or a dummy
   */
  async getAnonymousUserByMessageId(userId: number, messageId: number): Promise<AnonymousUserDTO> {
    const anonymousUser = await this.prisma.message.findFirst({
      where: {
        id: Number(messageId),
        author: {
          userId: Number(userId),
        },
      },
      select: {
        author: {
          select: {
            id: true,
            userId: true,
            anonymousName: true,
          },
        },
      },
    });

    if (!anonymousUser) {
      console.log('DiscussionServie: No anonymous user found! Returning dummy.');
      return {
        id: -1,
        anonymousName: 'missingNo',
        userId: -1,
      };
    }
    console.log(
      anonymousUser.author.id +
        ' ' +
        anonymousUser.author.anonymousName +
        ' ' +
        anonymousUser.author.userId,
    );
    return {
      id: anonymousUser.author.id,
      anonymousName: anonymousUser.author.anonymousName,
      userId: anonymousUser.author.userId,
    };
  }

  /**
   * Creates a new anonymous user in the database and returns it
   * @param userId
   * @param name
   * @returns AnonymousUserDTO
   */
  async createAnonymousUser(userId: number, name = ''): Promise<AnonymousUserDTO> {
    const funnyWords: string[] = [
      'Narwal',
      'Quokka',
      'Axolotl',
      'Blobfisch',
      'Pangolin',
      'Wombat',
      'Kakapo',
      'Fuchskusu',
      'Gibbon',
      'Tapir',
      'Schnabeltier',
      'Alpaka',
      'Koala',
      'Lemming',
      'Marmelade',
      'Muffin',
      'Pudding',
      'Schokolade',
      'Zimtstern',
      'Donut',
      'Einhorn',
      'Flamingo',
      'Giraffe',
      'Hummel',
      'Igel',
      'Jaguar',
      'Kolibri',
      'Lama',
      'Maulwurf',
      'Nashorn',
      'Otter',
      'Pinguin',
      'Qualle',
      'Raubkatze',
      'Seestern',
      'Tukan',
      'Uhu',
      'Vogelspinne',
      'Yak',
      'Zebra',
    ];
    let nameString: string = name;
    if (name === '') {
      nameString =
        funnyWords[Math.floor(Math.random() * funnyWords.length)] +
        's ' +
        funnyWords[Math.floor(Math.random() * funnyWords.length)];
    }

    const anonymousUser = await this.prisma.anonymousUser.create({
      data: {
        userId: userId,
        anonymousName: nameString,
      },
    });

    if (!anonymousUser) {
      throw new Error('Anonymous user not created');
    }

    return anonymousUser;
  }

  /** Creates a new discussion message in the database. If the user is not yet an anonymous user, one is created.
   *
   * @param discussionData
   * @param userId used to find or create the anonymous user
   * @param isInitiator (optional) default is false
   * @param isSolution (optional) default is false
   * @returns message id
   */
  async createDiscussionMessage(
    messageData: discussionMessageCreationDTO,
    userId: number,
    isInitiator = false,
    isSolution = false,
  ): Promise<number> {
    let anonymousUser = await this.getAnonymousUser(userId, messageData.discussionId);
    if (anonymousUser.id === -1) {
      anonymousUser = await this.createAnonymousUser(userId);
    }
    // xss protection
    const sanitizedText = xss.filterXSS(messageData.text, this.xssFilterOptions);

    const message = await this.prisma.message.create({
      data: {
        text: sanitizedText,
        authorId: anonymousUser.id,
        discussionId: messageData.discussionId,
        isInitiator: isInitiator,
        isSolution: isSolution,
      },
    });

    if (!message) {
      throw new Error('Message not created');
    }

    await this.sendCommentNotifications(
      messageData.discussionId,
      userId,
      anonymousUser.anonymousName,
    );

    return message.id;
  }

  /**
   * Sends notifications to all users that have written a message in the discussion except the author of the new comment
   * @param {number} discussionId
   * @param {number} commentAuthorId
   * @param {string} anonymousName
   */
  private async sendCommentNotifications(
    discussionId: number,
    commentAuthorId: number,
    anonymousName: string,
  ) {
    const anonymousUsers = await this.getAnonymousUsersByDiscussionId(discussionId);
    const filteredAnonymousUsers = anonymousUsers.filter(user => user.userId !== commentAuthorId);

    const notifications = filteredAnonymousUsers.map(user => ({
      userId: user.userId,
      message: `Ein neuer Kommentar von User: ${anonymousName} wurde unter deinem Beitrag verfasst`,
      type: NotificationType.COMMENT,
      timestamp: new Date(),
      isRead: false,
      discussionId: discussionId,
    }));

    await this.notificationService.notifyUsers(notifications);
  }

  /**
   * Creates a new discussion in the database, including the anonymous user author and the initial message
   * @param discussionData
   * @param userId
   * @param isSolved (optional) default is false
   * @returns the discussion id
   */
  async createDiscussion(
    discussionData: discussionCreationDTO,
    userId: number,
    isSolved = false,
  ): Promise<number> {
    const anonymousUser = await this.createAnonymousUser(userId);

    const discussion = await this.prisma.discussion.create({
      data: {
        title: discussionData.title,
        conceptNodeId: discussionData.conceptNodeId,
        contentNodeId: discussionData.contentNodeId != -1 ? discussionData.contentNodeId : null,
        contentElementId:
          discussionData.contentElementId != -1 ? discussionData.contentElementId : null,
        authorId: anonymousUser.id,
        isSolved: isSolved,
      },
    });

    if (!discussion) {
      throw new Error('Discussion not created');
    }

    // xss protection
    console.log('DISCUSSION TEXT', discussionData.text);
    const sanitizedText = xss.filterXSS(discussionData.text, this.xssFilterOptions);

    const message = await this.prisma.message.create({
      data: {
        text: sanitizedText,
        authorId: anonymousUser.id,
        discussionId: discussion.id,
        isInitiator: true,
        isSolution: false,
      },
    });

    if (!message) {
      throw new Error('Message not created');
    }

    return discussion.id;
  }

  /**
   * Returns all anonymous users for a given discussion ID
   * @param {number} discussionId
   * @returns {Promise<AnonymousUserDTO[]>} the anonymous users
   */
  async getAnonymousUsersByDiscussionId(discussionId: number): Promise<AnonymousUserDTO[]> {
    const anonymousUsers = await this.prisma.anonymousUser.findMany({
      where: {
        Message: {
          some: {
            discussionId: Number(discussionId),
          },
        },
      },
      select: {
        id: true,
        userId: true,
        anonymousName: true,
      },
    });

    return anonymousUsers.map(user => ({
      id: user.id,
      anonymousName: user.anonymousName,
      userId: user.userId,
    }));
  }
}
