import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DiscussionVoteService } from './discussion-vote.service';
import {
  discussionMessageVoteCreationDTO,
  discussionMessageVoteDTO,
} from '@DTOs/index';
import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';

@UseGuards(RolesGuard)
@Controller('discussion/vote')
export class DiscussionVoteController {
  constructor(private voteService: DiscussionVoteService) {}

  /**
   * This function returns the vote data for a given message
   * @param messageId
   * @returns the vote data
   */
  @roles('ANY')
  @Get(':messageId/')
  async getVoteData(
    @Param('messageId') messageId: number,
    @Req() req,
  ): Promise<discussionMessageVoteDTO> {
    if (isNaN(messageId) || isNaN(req.user.id)) {
      throw new Error('Invalid message id or user id');
    }
    return this.voteService.getVoteData(Number(messageId), Number(req.user.id));
  }

  /**
   * This function creates or modifies a vote
   * @param voteCreationData
   * @returns discussionMessageVoteCreationDTO
   */
  @roles('ANY')
  @Post('create')
  async createOrModifyVote(
    @Body() voteCreationData: discussionMessageVoteCreationDTO,
    @Req() req,
  ): Promise<discussionMessageVoteCreationDTO> {
    if (isNaN(req.user.id)) {
      throw new Error('Invalid user id');
    }
    return this.voteService.createOrModifyVote(
      voteCreationData,
      Number(req.user.id),
    );
  }
}
