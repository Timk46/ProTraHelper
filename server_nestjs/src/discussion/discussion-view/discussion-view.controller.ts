import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { DiscussionViewService } from './discussion-view.service';
import type { discussionMessageDTO, nodeNameDTO } from '@DTOs/index';
import { RolesGuard, roles } from '@/auth/common/guards/roles.guard';

const debug = true; // set this to false to disable console logs
@UseGuards(RolesGuard)
@Controller('discussion/view')
export class DiscussionViewController {
  constructor(private readonly viewService: DiscussionViewService) {}

  /** Returns the name of the concept node for a given discussion
   *
   * @param discussionId
   * @returns the name of the concept node
   */
  @roles('ANY')
  @Get('conceptNodeName/:discussionId')
  async getConceptNodeName(@Param('discussionId') discussionId: number): Promise<nodeNameDTO> {
    debug && console.log('DiscussionViewController: getConceptNodeName');
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.viewService.getConceptNodeName(Number(discussionId));
  }

  /**
   * This function returns a discussion for a given id
   * @param discussionId
   * @returns the discussion
   */
  @roles('ANY')
  @Get(':discussionId')
  async getDiscussion(@Param('discussionId') discussionId: number) {
    debug && console.log('DiscussionViewController: getDiscussion');
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.viewService.getDiscussion(Number(discussionId));
  }

  /**
   * This function returns all messages for a given discussion
   * @param discussionId
   * @returns the messages
   */
  @roles('ANY')
  @Get('messages/:discussionId')
  async getMessages(@Param('discussionId') discussionId: number): Promise<discussionMessageDTO[]> {
    debug && console.log('DiscussionViewController: getMessages');
    if (isNaN(discussionId)) {
      throw new Error('Invalid discussion id');
    }
    return this.viewService.getDiscussionMessages(Number(discussionId));
  }

  /**
   * Toggles the solution status of a message and returns and sets the solution status of the discussion
   * @param messageId
   * @returns the new solution status as boolean
   */
  @roles('ANY')
  @Get('messages/toggleSolution/:messageId')
  async toggleSolution(@Param('messageId') messageId: number, @Req() req): Promise<boolean> {
    debug && console.log('DiscussionViewController: toggleSolution');
    if (isNaN(messageId)) {
      throw new Error('Invalid discussion id');
    }
    return this.viewService.toggleSolution(Number(messageId), req.user.id);
  }
}
