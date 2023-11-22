import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DiscussionVoteService } from './discussion-vote.service';
import { discussionMessageVoteCreationDTO, discussionMessageVoteDTO } from '@DTOs/index';

const debug: boolean = true;

@Controller('discussion/vote')
export class DiscussionVoteController {

  constructor(private voteService: DiscussionVoteService) { }

  /**
   * This function returns the vote data for a given message
   * @param messageId
   * @returns the vote data
   */
  @Get(':messageId/:userId')
  async getVoteData(@Param('messageId') messageId : number, @Param('userId') userId : number): Promise<discussionMessageVoteDTO> {
    debug && console.log('DiscussionVoteController: getVoteData');
    if (isNaN(messageId) || isNaN(userId)) {
      throw new Error('Invalid message id or user id');
    }
    return this.voteService.getVoteData(Number(messageId),Number(userId));
  }

  /**
   * This function creates or modifies a vote
   * @param voteCreationData
   * @returns discussionMessageVoteCreationDTO
   */
  @Post('create')
  async createOrModifyVote(@Body() voteCreationData: discussionMessageVoteCreationDTO): Promise<discussionMessageVoteCreationDTO> {
    debug && console.log('DiscussionVoteController: createOrModifyVote')
    return this.voteService.createOrModifyVote(voteCreationData);
  }

}
