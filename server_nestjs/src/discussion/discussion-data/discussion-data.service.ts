/* eslint-disable prettier/prettier */
import { PrismaService } from '@/prisma/prisma.service';
import { discussionNodeNamesDTO, nodeNameDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class DiscussionDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the id of the init message for a given discussion
   *
   * @param discussionId
   * @returns the id of the init message
   */
  async getInitMessageId(discussionId: number): Promise<number | null> {
    const message = await this.prisma.message.findFirst({
      where: {
        discussionId: Number(discussionId),
        isInitiator: true,
      },
      select: { id: true },
    });

    if (!message) {
      throw new Error('Init message not found. Discussion id: ' + discussionId);
    }

    return message ? message.id : null;
  }

  /**
   * Returns the anonymous author name for a given anonymous author id
   *
   * @param authorId
   * @returns the anonymous author name
   */
  async getAuthorName(authorId: number): Promise<string | null> {
    const authorName = await this.prisma.anonymousUser.findUnique({
      where: { id: Number(authorId) },
      select: { anonymousName: true },
    });

    if (!authorName) {
      throw new Error('Author not found');
    }

    return authorName ? authorName.anonymousName : null;
  }

  /**
   * Returns the name of the content node for a given content node id
   *
   * @param contentNodeId
   * @returns the name of the content node
   */
  async getContentNodeName(contentNodeId: number): Promise<nodeNameDTO> {
    const contentNodeData = await this.prisma.contentNode.findUnique({
      where: { id: Number(contentNodeId) },
      select: { name: true },
    });

    if (!contentNodeData) {
      throw new Error('Content node not found. Content node id: ' + contentNodeId);
    }

    const contentNodeName = {
      name: contentNodeData ? contentNodeData.name : '',
    };

    return contentNodeName;
  }

  /**
   * Returns the number of comments for a given discussion
   * (excluding the init message)
   *
   * @param discussionId
   * @returns the number of comments
   */
  async getDiscussionCommentCount(discussionId: number): Promise<number> {
    const commentCount = await this.prisma.message.count({
      where: { discussionId: Number(discussionId) },
    });

    return commentCount - 1; // -1 because the init message is not a comment
  }

  /**
   * Returns the name of the concept Node, the content Node and the content Element for the given ids
   * @param conceptNodeId
   * @param contentNodeId
   * @param contentElementId
   * @returns the names of the nodes and the element name
   */
  async getDiscussionNodeNames(
    conceptNodeId: number,
    contentNodeId: number,
    contentElementId: number,
  ): Promise<discussionNodeNamesDTO> {
    console.log(
      'conceptNodeId: ' +
        conceptNodeId +
        ', contentNodeId: ' +
        contentNodeId +
        ', contentElementId: ' +
        contentElementId,
    );
    const conceptNodeName = await this.prisma.conceptNode.findUnique({
      where: { id: Number(conceptNodeId) },
      select: { name: true },
    });
    const contentNodeName = await this.prisma.contentNode.findUnique({
      where: { id: Number(contentNodeId) },
      select: { name: true },
    });
    const elementNodeName = await this.prisma.contentElement.findUnique({
      where: { id: Number(contentElementId) },
      select: { title: true },
    });

    return {
      conceptNodeName: conceptNodeName.name || 'no concept node found',
      contentNodeName: contentNodeName.name || 'Allgemein',
      contentElementName: elementNodeName.title || 'Allgemein',
    };
  }

  /**
   * This function returns all original user ids for a given discussion.
   *
   * @param discussionId
   * @returns {Promise<number[]>} the user ids
   */
  async getUserIdsByDiscussionId(discussionId: number, excludedUserId: number): Promise<number[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        discussionId: Number(discussionId),
        author: {
          userId: {
            not: Number(excludedUserId),
          },
        },
      },
      select: {
        author: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!messages) {
      throw new Error('Messages not found');
    }

    const userIds = messages.map(message => message.author.userId);
    return userIds;
  }
}
