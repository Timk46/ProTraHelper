import { PrismaService } from '@/prisma/prisma.service';
import { discussionMessageVoteCreationDTO, discussionMessageVoteDTO } from '@DTOs/index';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscussionVoteService {

  constructor(private prisma: PrismaService) { }

  /** Returns the vote data for a given message
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

  /** Creates or modifies a vote for a given message
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


}
