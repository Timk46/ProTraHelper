import { PrismaService } from '@/prisma/prisma.service';
import { discussionDTO, discussionsDTO, discussionMessageVoteDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';
import { get } from 'http';

@Injectable()
export class DiscussionService {

  constructor(private prisma: PrismaService) {}

  /**
   * @param messageId
   * @returns the vote data
   */
  async getVoteData(messageId: number) : Promise<discussionMessageVoteDTO> {
    const votesForMessage = await this.prisma.vote.findMany({
      where: {
        messageId: Number(messageId)
      }
    });

    if (!votesForMessage) {
      throw new Error('Message votes not found');
    }

    const totalVotes = votesForMessage.reduce((sum, vote) => {
      return sum + (vote.isUpvote ? 1 : -1);
    }, 0);

    const voteData: discussionMessageVoteDTO = {
      messageId: messageId,
      votes: totalVotes
    }

    return voteData;
  }

  /**
   * This function returns all discussions for a given concept node and optional content node, author, solved status and search string
   *
   * @param conceptNodeId
   * @param contentNodeId
   * @param onlySolved
   * @param authorId
   * @param searchString
   * @returns  the discussions
   */
  async getDiscussions(
    conceptNodeId: number,
    contentNodeId: number,
    onlySolved: boolean,
    authorId: number,
    searchString: string,
  ) : Promise<discussionsDTO> {
    let discussions = await this.prisma.discussion.findMany({
      where: {
        conceptNodeId: Number(conceptNodeId)
        }
    });

    if (!discussions) {
      throw new Error('Discussions not found');
    }

    console.log('paras:' + conceptNodeId + ',' + contentNodeId + ',' + onlySolved + ',' + authorId + ',' + searchString);

    console.log('discussions found:');
    console.log(discussions);

    if (contentNodeId != -1) {
      console.log('filtering for contentNodeId');
      discussions = discussions.filter(discussion => discussion.contentNodeId == contentNodeId);
    }
    if (onlySolved == true) {
      console.log('filtering for onlySolved');
      discussions = discussions.filter(discussion => discussion.isSolved);
    }
    if (authorId != -1) {
      console.log('filtering for authorId');
      discussions = discussions.filter(discussion => discussion.authorId == authorId);
    }

    if (searchString != "") {
      console.log('filtering for searchString');
      discussions = discussions.filter(discussion => discussion.title.includes(searchString));
    }

    let discussionData: discussionsDTO = {
      discussions: []
    };
    for (let discussion of discussions) {
      discussionData.discussions.push({
        id: discussion.id,
        initMessageId: await this.getInitMessageId(discussion.id),
        title: discussion.title,
        authorName: await this.getAuthorName(discussion.authorId),
        createdAt: discussion.createdAt,
        contentNodeName: contentNodeId == -1 ? 'keiner' : await this.getContentNodeName(discussion.contentNodeId),
        commentCount: await this.getDiscussionCommentCount(discussion.id),
        isSolved: discussion.isSolved
      });
    }
    console.log('returned discussionData:');
    console.log(discussionData);
    return discussionData;
  }

  /**
   * This function returns the id of the init message for a given discussion
   *
   * @param discussionId
   * @returns the id of the init message
   */
  async getInitMessageId(discussionId: number) : Promise<number | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: Number(discussionId), isInitiator: true },
      select: { id: true }
    });

    if (!message) {
      throw new Error('Init message not found');
    }

    return message ? message.id : null;
  }

  /**
   * This function returns the anonymous author name for a given anonymous author id
   *
   * @param authorId
   * @returns the anonymous author name
   */
  async getAuthorName(authorId: number) : Promise<string | null> {
    const authorName = await this.prisma.anonymousUser.findUnique({
      where: { id: Number(authorId) },
      select: {anonymousName : true }
    });

    if (!authorName) {
      throw new Error('Author not found');
    }

    return authorName ? authorName.anonymousName : null;
  }

  /**
   * This function returns the name of the content node for a given content node id
   *
   * @param contentNodeId
   * @returns the name of the content node
   */
  async getContentNodeName(contentNodeId: number) : Promise<string | null> {
    const contentNodeName = await this.prisma.contentNode.findUnique({
      where: { id: Number(contentNodeId) },
      select: { name: true }
    });

    if (!contentNodeName) {
      throw new Error('Content node not found');
    }

    return contentNodeName ? contentNodeName.name : null;
  }

  async getDiscussionCommentCount(discussionId: number) : Promise<number> {
    const commentCount = await this.prisma.message.count({
      where: { discussionId: Number(discussionId) }
    });

    return commentCount - 1; // -1 because the init message is not a comment
  }


}
