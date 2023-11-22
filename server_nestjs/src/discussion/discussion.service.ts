import { PrismaService } from '@/prisma/prisma.service';
import { discussionDTO, discussionsDTO, discussionMessageVoteDTO, discussionMessageDTO, discussionMessagesDTO, nodeNameDTO, AnonymousUserDTO, creationResponseDTO, discussionFilterDTO, discussionNodeNamesDTO, discussionCreationDTO, discussionMessageCreationDTO, discussionMessageVoteCreationDTO, discussionFilterContentNodeDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';
import { get } from 'http';
import { filter } from 'rxjs';

@Injectable()
export class DiscussionService {

  constructor(private prisma: PrismaService) {}

  /** This function returns the vote data for a given message
   * @param messageId
   * @returns the vote data
   */
  async getVoteData(messageId: number, userId: number) : Promise<discussionMessageVoteDTO> {
    const votesForMessage = await this.prisma.vote.findMany({
      where: {
        messageId: messageId,
        userId: {
          not: userId
        }
      }
    });

    const userVote = await this.prisma.vote.findFirst({
      where: {
        messageId: messageId,
        userId: userId
      }
    });

    if (!votesForMessage && !userVote) {
      throw new Error('Message votes not found');
    }

    const totalVotes = votesForMessage.reduce((sum, vote) => {
      return sum + (vote.isUpvote ? 1 : -1);
    }, 0);

    const voteData: discussionMessageVoteDTO = {
      messageId: messageId,
      votes: totalVotes,
      userVoteStatus: userVote ? (userVote.isUpvote ? 1 : -1) : 0
    }
    return voteData;
  }

  /**
   * Returns the content nodes that are trained by the given concept node - used for the discussion filter
   * @param conceptNodeId
   * @returns discussionFilterContentNodeDTO[]
   */
  async getFilterContentNodes(conceptNodeId: number) : Promise<discussionFilterContentNodeDTO[]> {
    const contentNodes = await this.prisma.training.findMany({
      where: {
        conceptNodeId: conceptNodeId
      },
      select: {
        contentNode: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    if (!contentNodes) {
      throw new Error('Content nodes not found');
    }

    return contentNodes.map(contentNode => {
      return {
        id: contentNode.contentNode.id,
        name: contentNode.contentNode.name,
        description: contentNode.contentNode.description
      }
    });
  }

  /** This function creates or modifies a vote for a given message
   * if the vote status is 0, the vote is deleted, otherwise it is created or modified
   * @param voteCreationData
   * @returns a creation status if successful
   */
  async createOrModifyVote(voteCreationData: discussionMessageVoteCreationDTO) : Promise<discussionMessageVoteCreationDTO> {
    //console.log('DiscussionService: createOrModifyVote, voteCreationData:');
    const vote = await this.prisma.vote.findFirst({
      where: {
        messageId: voteCreationData.messageId,
        userId: voteCreationData.userId
      }
    });

    if (!vote) {
      if (voteCreationData.voteStatus != 0) {
        //console.log('DiscussionService: createOrModifyVote, no vote found, creating new vote');
        const newVote = await this.prisma.vote.create({
          data: {
            messageId: voteCreationData.messageId,
            userId: voteCreationData.userId,
            isUpvote: voteCreationData.voteStatus == 1 ? true : false
          }
        });

        if (!newVote) {
          throw new Error('Vote not created');
        }
      } else {
        //console.log('DiscussionService: createOrModifyVote, no vote found, vote status 0, doing nothing');
      }
    } else {
      //console.log('DiscussionService: createOrModifyVote, vote found, modifying vote');
      if (voteCreationData.voteStatus == 0) {
        //console.log('DiscussionService: createOrModifyVote, vote status 0, deleting vote');
        await this.prisma.vote.delete({
          where: {
            id: vote.id
          }
        });
      } else {
        //console.log('DiscussionService: createOrModifyVote, vote status != 0, modifying vote');
        await this.prisma.vote.update({
          where: {
            id: vote.id
          },
          data: {
            isUpvote: voteCreationData.voteStatus == 1 ? true : false
          }
        });
      }
    }
    return voteCreationData;
  }

  /**
   * This function returns all discussions for a given concept node and optional content node, author, solved status and search string
   * provided in the discussionFilterDTO
   *
   * @param filterData : discussionFilterDTO
   * @returns  the discussions
   *
   * How it works:
   * 1. Get all discussions for the given concept node:
   *   - find all discussions and look inside their connected concept nodes
   *   - find all trains that are connected to the content nodes of the concept node
   *   - from this trains, filter the ones that are only connected to the given filterData concept node
   *   - keep only the discussions that do not have a content node or that have a content node that is trained by the filter concept node
   * 2. Filter the discussions according to the given filter data
   * 3. Build the discussionsDTO and return it
   *
   */
  async getDiscussions(filterData: discussionFilterDTO) : Promise<discussionsDTO> {
    let discussions = await this.prisma.discussion.findMany({
      where: {
        conceptNode: {
          trainedBy: {
            some: {
              contentNode: {
                trains: {
                  some: {
                    conceptNode: {
                      id: Number(filterData.conceptNodeId)
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    //we have to get a list of all content nodes that are trained by the filter concept node
    const trainedByContentNodes = await this.prisma.training.findMany({
      where: {
        conceptNodeId: Number(filterData.conceptNodeId)
      },
      select: {
        contentNodeId: true
      }
    });

    if (!discussions) {
      throw new Error('Discussions not found');
    }

    //filter only discussions that do not have a content node or that have a content node that is trained by the filter concept node
    discussions = discussions.filter(discussion => discussion.contentNodeId == null || trainedByContentNodes.some(trainedByContentNode => trainedByContentNode.contentNodeId == discussion.contentNodeId));

    if (filterData.contentNodeId != -1) {
      //console.log('filtering for contentNodeId');
      discussions = discussions.filter(discussion => discussion.contentNodeId === filterData.contentNodeId || discussion.contentNodeId === null);
    }
    if (filterData.onlySolved == true) {
      //console.log('filtering for onlySolved');
      discussions = discussions.filter(discussion => discussion.isSolved);
    }
    if (filterData.authorId != -1) {
      //console.log('filtering for authorId');
      discussions = discussions.filter(discussion => discussion.authorId == filterData.authorId);
    }

    if (filterData.searchString != "") {
      //console.log('filtering for searchString');
      discussions = discussions.filter(discussion => discussion.title.includes(filterData.searchString));
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
        contentNodeName: discussion.contentNodeId == null ? 'allgemein' : (await this.getContentNodeName(discussion.contentNodeId)).name,
        commentCount: await this.getDiscussionCommentCount(discussion.id),
        isSolved: discussion.isSolved
      });
    }
    return discussionData;
  }

  /**
   * This function returns the id of the init message for a given discussion
   *
   * @param discussionId
   * @returns the id of the init message
   */
  async getInitMessageId(discussionId: number) : Promise<number | null> {
    const message = await this.prisma.message.findFirst({
      where: {
          discussionId: Number(discussionId),
          isInitiator: true
      },
      select: { id: true }
    });

    if (!message) {
      throw new Error('Init message not found. Discussion id: ' + discussionId);
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
  async getContentNodeName(contentNodeId: number) : Promise<nodeNameDTO> {
    const contentNodeData = await this.prisma.contentNode.findUnique({
      where: { id: Number(contentNodeId) },
      select: { name: true }
    });

    if (!contentNodeData) {
      throw new Error('Content node not found. Content node id: ' + contentNodeId);
    }

    const contentNodeName = {
      name: contentNodeData ? contentNodeData.name : ""
    };

    return contentNodeName;
  }

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
   * This function returns the number of comments for a given discussion
   * (excluding the init message)
   *
   * @param discussionId
   * @returns the number of comments
   */
  async getDiscussionCommentCount(discussionId: number) : Promise<number> {
    const commentCount = await this.prisma.message.count({
      where: { discussionId: Number(discussionId) }
    });

    return commentCount - 1; // -1 because the init message is not a comment
  }

  /**
   * This function returns all messages for a given discussion.
   * (including the init message)
   *
   * @param discussionId
   * @returns the messages
   */
  async getDiscussionMessages(discussionId: number) : Promise<discussionMessagesDTO> {
    const messages = await this.prisma.message.findMany({
      where: { discussionId: Number(discussionId) }
    });

    if (!messages) {
      throw new Error('Messages not found');
    }

    let messageData: discussionMessagesDTO = {
      messages: []
    };
    for (let message of messages) {
      messageData.messages.push({
        messageId: message.id,
        discussionId: discussionId,
        authorId: message.authorId,
        authorName: await this.getAuthorName(message.authorId),
        createdAt: message.createdAt,
        messageText: message.text,
        isSolution: message.isSolution,
        isInitiator: message.isInitiator
      });
    }
    return messageData;
  }

  /**
   * This function returns a discussion for a given discussion id
   *
   * @param discussionId
   * @returns the discussion
   */
  async getDiscussion(discussionId: number) : Promise<discussionDTO> {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: Number(discussionId) }
    });

    if (!discussion) {
      throw new Error('Discussion not found');
    }
    return {
      id: discussion.id,
      initMessageId: await this.getInitMessageId(discussionId),
      title: discussion.title,
      authorName: await this.getAuthorName(discussion.authorId),
      createdAt: discussion.createdAt,
      contentNodeName: discussion.contentNodeId == null ? 'allgemein' : (await this.getContentNodeName(discussion.contentNodeId)).name,
      commentCount: await this.getDiscussionCommentCount(discussionId),
      isSolved: discussion.isSolved,
    };
  }

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
  createAnonymousUser(userId: number, name: string) : Promise<AnonymousUserDTO> {
    return this.prisma.anonymousUser.create({
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
    console.log('DiscussionService: createDiscussionMessage, messageData:');
    console.log(messageData);
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
   * Returns the name of the concept Node, the content Node and the content Element for the given ids
   * @param conceptNodeId
   * @param contentNodeId
   * @param contentElementId
   * @returns the names of the nodes and the element name
   */
  async getDiscussionNodeNames(conceptNodeId: number, contentNodeId: number, contentElementId: number) : Promise<discussionNodeNamesDTO> {
    console.log('conceptNodeId: ' + conceptNodeId + ', contentNodeId: ' + contentNodeId + ', contentElementId: ' + contentElementId);
    const conceptNodeName = await this.prisma.conceptNode.findUnique({
      where: { id: Number(conceptNodeId) },
      select: { name: true }
    });
    const contentNodeName = await this.prisma.contentNode.findUnique({
      where: { id: Number(contentNodeId) },
      select: { name: true }
    });
    const elementNodeName = await this.prisma.contentElement.findUnique({
      where: { id: Number(contentElementId) },
      select: { title: true }
    });

    return {
      conceptNodeName: conceptNodeName?.name || "no concept node found",
      contentNodeName: contentNodeName?.name || "Allgemein",
      contentElementName: elementNodeName?.title || "Allgemein"
    };
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
